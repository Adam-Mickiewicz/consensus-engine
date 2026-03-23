/**
 * POST /api/auth/totp/verify
 * Body: { code: "123456" }
 *
 * Two modes:
 *  - If !verified → first-time setup confirmation (sets verified=true, no session)
 *  - If verified  → step-up auth → creates pii_session (15 min)
 *
 * Response: { success: true, mode: 'setup'|'session', session_id?, expires_at? }
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { authenticator } from 'otplib';
import { decrypt } from '../../../../../lib/crypto/pii';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const PII_SESSION_MINUTES = 15;

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await request.json();
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Nieprawidłowy format kodu (6 cyfr)' }, { status: 400 });
    }

    const userId = session.user.id;
    const sb     = getServiceClient();

    // Fetch encrypted secret
    const { data: totpRow, error } = await sb
      .from('totp_secrets')
      .select('secret, verified')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !totpRow) {
      return NextResponse.json({ error: 'Brak skonfigurowanego 2FA. Przejdź do /admin/2fa-setup' }, { status: 400 });
    }

    const secret = decrypt(totpRow.secret);
    if (!secret) return NextResponse.json({ error: 'Błąd deszyfrowania sekretu' }, { status: 500 });

    const valid = authenticator.verify({ token: code, secret });
    if (!valid) return NextResponse.json({ error: 'Nieprawidłowy kod' }, { status: 400 });

    // First-time setup verification
    if (!totpRow.verified) {
      await sb.from('totp_secrets').update({ verified: true }).eq('user_id', userId);
      return NextResponse.json({ success: true, mode: 'setup' });
    }

    // Create PII session (15 minutes)
    const expiresAt = new Date(Date.now() + PII_SESSION_MINUTES * 60_000).toISOString();
    const ip  = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    const ua  = request.headers.get('user-agent') ?? null;

    const { data: piiSession } = await sb.from('pii_sessions').insert({
      user_id:    userId,
      expires_at: expiresAt,
      ip_address: ip,
      user_agent: ua,
    }).select('id, expires_at').single();

    return NextResponse.json({
      success:    true,
      mode:       'session',
      session_id: piiSession.id,
      expires_at: piiSession.expires_at,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
