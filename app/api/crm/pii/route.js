/**
 * GET /api/crm/pii?client_ids=ID1,ID2&session_id=UUID
 */

import { NextResponse } from 'next/server';
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

    const authHeader = request.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    const { data: { user }, error: authErr } = await sb.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.id;

    const { data: piiSession } = await sb.from('pii_sessions')
      .select('id, expires_at')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!piiSession || new Date(piiSession.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Sesja PII wygasła lub nieważna. Weryfikuj ponownie.' }, { status: 403 });
    }

    const [roleRes, permRes] = await Promise.all([
      sb.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
      sb.from('user_permissions').select('access_level').eq('user_id', userId).eq('category', 'admin').eq('access_level', 'write').maybeSingle(),
    ]);
    const isAdmin = roleRes.data?.role === 'admin' || !!permRes.data;
    if (!isAdmin) return NextResponse.json({ error: 'Brak uprawnień admin' }, { status: 403 });

    const { data: rows, error } = await sb.from('master_key')
      .select('client_id, email, email_encrypted, first_name_encrypted, last_name_encrypted')
      .in('client_id', clientIds);

    if (error) throw new Error(error.message);

    const result = (rows ?? []).map(r => ({
      client_id:  r.client_id,
      email:      r.email_encrypted ? decrypt(r.email_encrypted) : (r.email ?? null),
      first_name: r.first_name_encrypted ? decrypt(r.first_name_encrypted) : null,
      last_name:  r.last_name_encrypted  ? decrypt(r.last_name_encrypted)  : null,
    }));

    const ip = request.headers.get('x-forwarded-for') ?? null;
    for (const r of result) {
      sb.from('vault_access_log').insert({
        client_id:   r.client_id,
        user_id:     userId,
        accessed_at: new Date().toISOString(),
        ip_address:  ip,
        reason:      `pii_view session=${sessionId}`,
        action:      'view',
      }).then(() => {});
    }

    return NextResponse.json({ pii: result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
