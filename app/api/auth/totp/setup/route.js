/**
 * POST /api/auth/totp/setup
 */

import { NextResponse } from 'next/server';
import { generateSecret, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { encrypt } from '../../../../../lib/crypto/pii';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('Authorization') ?? '';
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!jwt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    const { data: { user }, error: authErr } = await sb.auth.getUser(jwt);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId    = user.id;
    const userEmail = user.email ?? userId;

    const secret = generateSecret();
    const otpauthUrl = generateURI({ strategy: 'totp', issuer: 'Consensus CRM', label: userEmail, secret });
    const qrcode = await QRCode.toDataURL(otpauthUrl);

    const encrypted = encrypt(secret);
    await sb.from('totp_secrets').upsert({
      user_id:  userId,
      secret:   encrypted,
      verified: false,
    }, { onConflict: 'user_id' });

    return NextResponse.json({ qrcode, secret });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
