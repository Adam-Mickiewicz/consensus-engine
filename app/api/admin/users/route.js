/**
 * GET    /api/admin/users         → lista userów z rolami i permissions
 * POST   /api/admin/users         → invite lub set_role (istniejące)
 * PATCH  /api/admin/users         → aktualizuj rolę LUB permissions narzędzia
 * DELETE /api/admin/users         → usuń usera
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

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    if (!await requireAdmin(sb, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const [
      { data: { users }, error: usersError },
      { data: roles },
      { data: adminPerms },
      { data: toolPerms },
      { data: totps },
      { data: tools },
    ] = await Promise.all([
      sb.auth.admin.listUsers({ perPage: 200 }),
      sb.from('user_roles').select('user_id, role'),
      sb.from('user_permissions').select('user_id, access_level').eq('category', 'admin').eq('access_level', 'write'),
      sb.from('user_permissions').select('user_id, tool, can_access').not('tool', 'is', null),
      sb.from('totp_secrets').select('user_id, verified'),
      sb.from('tools_registry').select('tool_id, tool_name, category').eq('is_active', true).order('category').order('tool_name'),
    ]);

    if (usersError) throw new Error(usersError.message);

    const roleMap   = new Map((roles ?? []).map(r => [r.user_id, r.role]));
    const permSet   = new Set((adminPerms ?? []).map(r => r.user_id));
    const totpMap   = new Map((totps ?? []).map(r => [r.user_id, r.verified]));

    // tool_permissions: { userId → { toolId → can_access } }
    const toolPermMap = new Map();
    for (const p of (toolPerms ?? [])) {
      if (!toolPermMap.has(p.user_id)) toolPermMap.set(p.user_id, {});
      toolPermMap.get(p.user_id)[p.tool] = p.can_access;
    }

    const list = (users ?? []).map(u => ({
      id:            u.id,
      email:         u.email,
      last_sign_in:  u.last_sign_in_at,
      created_at:    u.created_at,
      role:          roleMap.get(u.id) ?? (permSet.has(u.id) ? 'admin' : 'viewer'),
      totp_verified: totpMap.get(u.id) ?? false,
      tool_permissions: toolPermMap.get(u.id) ?? {},
    })).sort((a, b) => (a.email ?? '').localeCompare(b.email ?? ''));

    return NextResponse.json({ users: list, tools: tools ?? [] });
  } catch (err) {
    console.error('[admin/users] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

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
    console.error('[admin/users] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    if (!await requireAdmin(sb, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();

    // Aktualizacja roli
    if (body.user_id && body.role !== undefined && body.tool === undefined) {
      const { error } = await sb.from('user_roles').upsert(
        { user_id: body.user_id, role: body.role },
        { onConflict: 'user_id' }
      );
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true });
    }

    // Aktualizacja dostępu do narzędzia
    if (body.user_id && body.tool !== undefined && body.can_access !== undefined) {
      const { error } = await sb.from('user_permissions').upsert(
        { user_id: body.user_id, tool: body.tool, can_access: body.can_access },
        { onConflict: 'user_id,tool' }
      );
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Nieprawidłowe parametry' }, { status: 400 });
  } catch (err) {
    console.error('[admin/users] PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getServiceClient();
    if (!await requireAdmin(sb, user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { user_id } = body;
    if (!user_id) return NextResponse.json({ error: 'user_id wymagany' }, { status: 400 });

    // Nie pozwól usunąć samego siebie
    if (user_id === user.id) {
      return NextResponse.json({ error: 'Nie możesz usunąć własnego konta' }, { status: 400 });
    }

    await Promise.all([
      sb.from('user_roles').delete().eq('user_id', user_id),
      sb.from('user_permissions').delete().eq('user_id', user_id),
    ]);

    const { error } = await sb.auth.admin.deleteUser(user_id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/users] DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
