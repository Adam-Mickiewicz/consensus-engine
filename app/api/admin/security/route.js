/**
 * GET    /api/admin/security?type=audit  → audit log + pii sessions
 * DELETE /api/admin/security             → revoke pii_session
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

async function requireAdmin(sb, userId) {
  const [r, p] = await Promise.all([
    sb.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
    sb.from('user_permissions').select('access_level').eq('user_id', userId).eq('category', 'admin').eq('access_level', 'write').maybeSingle(),
  ]);
  return r.data?.role === 'admin' || !!p.data;
}

export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    if (!await requireAdmin(sb, session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [auditRes, sessionsRes] = await Promise.all([
      sb.from('vault_access_log')
        .select('id,client_id,user_id,action,reason,ip_address,accessed_at')
        .order('accessed_at', { ascending: false })
        .limit(200),
      sb.from('pii_sessions')
        .select('id,user_id,created_at,expires_at,ip_address')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    return NextResponse.json({
      audit:    auditRes.data    ?? [],
      sessions: sessionsRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    if (!await requireAdmin(sb, session.user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { session_id } = await request.json();
    await sb.from('pii_sessions').delete().eq('id', session_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
