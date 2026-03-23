/**
 * POST /api/auth/totp/email-otp
 *
 * Two actions (body.action):
 *   'send'   → generate 6-digit code, store hash, send email
 *   'verify' → verify code → create pii_session
 *
 * Body (send):   { action: 'send' }
 * Body (verify): { action: 'verify', code: '123456' }
 *
 * Response (send):   { success: true }
 * Response (verify): { success: true, session_id, expires_at }
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createHash, randomInt } from 'crypto';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const OTP_VALID_MINUTES  = 10;
const PII_SESSION_MINUTES = 15;

function hashCode(code) {
  return createHash('sha256').update(String(code)).digest('hex');
}

async function sendEmail(to, code) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev fallback — log to console
    console.log(`[email-otp] Code for ${to}: ${code}`);
    return;
  }
  await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'CRM Nadwyraz <noreply@nadwyraz.com>',
      to:      [to],
      subject: `Twój kod weryfikacyjny: ${code}`,
      html:    `<p>Kod dostępu do danych osobowych: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>Ważny przez ${OTP_VALID_MINUTES} minut.</p>`,
    }),
  });
}

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body   = await request.json();
    const userId = session.user.id;
    const email  = session.user.email;
    const sb     = getServiceClient();

    // ── SEND ────────────────────────────────────────────────────────────────────
    if (body.action === 'send') {
      const code = String(randomInt(100000, 999999));
      const expiresAt = new Date(Date.now() + OTP_VALID_MINUTES * 60_000).toISOString();

      // Invalidate any existing unused codes for this user
      await sb.from('email_otp_codes').update({ used: true })
        .eq('user_id', userId).eq('used', false);

      await sb.from('email_otp_codes').insert({
        user_id:   userId,
        code_hash: hashCode(code),
        expires_at: expiresAt,
      });

      await sendEmail(email, code);
      return NextResponse.json({ success: true, sent_to: email });
    }

    // ── VERIFY ──────────────────────────────────────────────────────────────────
    if (body.action === 'verify') {
      const { code } = body;
      if (!code || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: 'Nieprawidłowy format kodu' }, { status: 400 });
      }

      const { data: otpRow } = await sb.from('email_otp_codes')
        .select('id, code_hash, expires_at, used')
        .eq('user_id', userId)
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRow) return NextResponse.json({ error: 'Brak aktywnego kodu — wyślij nowy' }, { status: 400 });
      if (new Date(otpRow.expires_at) < new Date()) return NextResponse.json({ error: 'Kod wygasł' }, { status: 400 });
      if (otpRow.code_hash !== hashCode(code)) return NextResponse.json({ error: 'Nieprawidłowy kod' }, { status: 400 });

      // Mark used
      await sb.from('email_otp_codes').update({ used: true }).eq('id', otpRow.id);

      // Create PII session
      const expiresAt = new Date(Date.now() + PII_SESSION_MINUTES * 60_000).toISOString();
      const ip = request.headers.get('x-forwarded-for') ?? null;
      const ua = request.headers.get('user-agent') ?? null;

      const { data: piiSession } = await sb.from('pii_sessions').insert({
        user_id: userId, expires_at: expiresAt, ip_address: ip, user_agent: ua,
      }).select('id, expires_at').single();

      return NextResponse.json({ success: true, session_id: piiSession.id, expires_at: piiSession.expires_at });
    }

    return NextResponse.json({ error: 'Nieprawidłowa akcja' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
