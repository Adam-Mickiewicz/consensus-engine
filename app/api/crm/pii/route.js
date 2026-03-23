/**
 * GET /api/crm/pii?client_ids=ID1,ID2&session_id=UUID
 *
 * Returns decrypted PII for requested client_ids.
 * Requires:
 *   - valid pii_session (not expired)
 *   - user has role 'admin' in user_roles OR 'write' in user_permissions
 *
 * Max 100 client_ids per request.
 * Logs each access to vault_access_log.
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { decrypt } from '../../../../lib/crypto/pii';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId  = searchParams.get('session_id') ?? '';
    const rawIds     = searchParams.get('client_ids') ?? '';
    const clientIds  = rawIds.split(',').map(s => s.trim()).filter(Boolean).slice(0, 100);

    if (!sessionId) return NextResponse.json({ error: 'Brak session_id' }, { status: 401 });
    if (!clientIds.length) return NextResponse.json({ error: 'Brak client_ids' }, { status: 400 });

    // Auth: verify caller
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user.id;
    const sb     = getServiceClient();

    // Verify pii_session
    const { data: piiSession } = await sb.from('pii_sessions')
      .select('id, expires_at')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!piiSession || new Date(piiSession.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Sesja PII wygasła lub nieważna. Weryfikuj ponownie.' }, { status: 403 });
    }

    // Verify admin role
    const [roleRes, permRes] = await Promise.all([
      sb.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      sb.from('user_permissions').select('access_level').eq('user_id', userId).eq('category', 'admin').eq('access_level', 'write').maybeSingle(),
    ]);
    const isAdmin = roleRes.data?.role === 'admin' || !!permRes.data;
    if (!isAdmin) return NextResponse.json({ error: 'Brak uprawnień admin' }, { status: 403 });

    // Fetch encrypted data
    const { data: rows, error } = await sb.from('master_key')
      .select('client_id, email, email_encrypted, first_name_encrypted, last_name_encrypted')
      .in('client_id', clientIds);

    if (error) throw new Error(error.message);

    // Decrypt
    const result = (rows ?? []).map(r => ({
      client_id:  r.client_id,
      email:      r.email_encrypted ? decrypt(r.email_encrypted) : (r.email ?? null),
      first_name: r.first_name_encrypted ? decrypt(r.first_name_encrypted) : null,
      last_name:  r.last_name_encrypted  ? decrypt(r.last_name_encrypted)  : null,
    }));

    // Log access
    const ip = request.headers.get('x-forwarded-for') ?? null;
    for (const r of result) {
      sb.from('vault_access_log').insert({
        client_id:  r.client_id,
        accessed_by: null,
        user_id:    userId,
        accessed_at: new Date().toISOString(),
        ip_address: ip,
        reason:     `pii_view session=${sessionId}`,
        action:     'view',
      }).then(() => {}); // fire-and-forget
    }

    return NextResponse.json({ pii: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
