/**
 * POST /api/auth/totp/setup
 *
 * Generates a TOTP secret for the authenticated user, stores it encrypted,
 * and returns a QR code + plaintext secret (one-time).
 *
 * Response: { qrcode: "data:image/png;base64,...", secret: "JBSWY3..." }
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { encrypt } from '../../../../../lib/crypto/pii';
import { getServiceClient } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    // Verify the caller is authenticated
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId    = session.user.id;
    const userEmail = session.user.email ?? userId;
    const sb        = getServiceClient();

    // Generate secret
    const secret = authenticator.generateSecret(); // base32
    const otpauthUrl = authenticator.keyuri(userEmail, 'Consensus CRM', secret);

    // QR code as base64 PNG
    const qrcode = await QRCode.toDataURL(otpauthUrl);

    // Store encrypted secret (verified=false until first successful verify)
    const encrypted = encrypt(secret);
    await sb.from('totp_secrets').upsert({
      user_id:  userId,
      secret:   encrypted,
      verified: false,
    }, { onConflict: 'user_id' });

    return NextResponse.json({ qrcode, secret }); // secret shown once
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
