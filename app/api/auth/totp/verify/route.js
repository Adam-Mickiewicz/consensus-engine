/**
 * POST /api/auth/totp/verify
 * Body: { code: "123456" }
 */

import { NextResponse } from 'next/server';
import { authenticator } from 'otplib/preset-default';
import { decrypt } from '../../../../../lib/crypto/pii';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const PII_SESSION_MINUTES = 15;

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    const { data: { user }, error: authErr } = await sb.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await request.json();
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'Nieprawidłowy format kodu (6 cyfr)' }, { status: 400 });
    }

    const userId = user.id;

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

    if (!totpRow.verified) {
      await sb.from('totp_secrets').update({ verified: true }).eq('user_id', userId);
      return NextResponse.json({ success: true, mode: 'setup' });
    }

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
