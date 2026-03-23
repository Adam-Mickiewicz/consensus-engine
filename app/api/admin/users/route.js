/**
 * GET  /api/admin/users        → list users with roles
 * POST /api/admin/users        → set role for user
 * POST /api/admin/users/invite → invite new user by email
 */

import { NextResponse } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getAuthUser(request) {
  const authHeader = request.headers.get('Authorization') ?? '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!jwt) return null;
  const sb = getServiceClient();
  const { data: { user }, error } = await sb.auth.getUser(jwt);
  return (error || !user) ? null : user;
}

async function requireAdmin(sb, userId) {
  const [r, p] = await Promise.all([
    sb.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
    sb.from('user_permissions').select('access_level').eq('user_id', userId).eq('category', 'admin').eq('access_level', 'write').maybeSingle(),
  ]);
  return r.data?.role === 'admin' || !!p.data;
}

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    if (!await requireAdmin(sb, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: { users }, error } = await sb.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);

    const { data: roles } = await sb.from('user_roles').select('user_id, role');
    const { data: perms } = await sb.from('user_permissions').select('user_id, access_level').eq('category', 'admin').eq('access_level', 'write');
    const { data: totps } = await sb.from('totp_secrets').select('user_id, verified');

    const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));
    const permSet = new Set((perms ?? []).map(r => r.user_id));
    const totpMap = new Map((totps ?? []).map(r => [r.user_id, r.verified]));

    const list = users.map(u => ({
      id:            u.id,
      email:         u.email,
      last_sign_in:  u.last_sign_in_at,
      created_at:    u.created_at,
      role:          roleMap.get(u.id) ?? (permSet.has(u.id) ? 'admin' : 'viewer'),
      totp_verified: totpMap.get(u.id) ?? false,
    }));

    return NextResponse.json({ users: list });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    if (!await requireAdmin(sb, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();

    if (body.action === 'invite') {
      const { data, error } = await sb.auth.admin.inviteUserByEmail(body.email);
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, user: data.user });
    }

    if (body.action === 'set_role') {
      await sb.from('user_roles').upsert({
        user_id:    body.user_id,
        role:       body.role,
        created_by: user.id,
      }, { onConflict: 'user_id' });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Nieznana akcja' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
