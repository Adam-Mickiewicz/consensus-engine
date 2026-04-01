import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request) {
  const cookieStore = await cookies()

  // Pobierz zalogowanego usera przez SSR client
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return Response.json({ permissions: {}, role: null })

  // Użyj service role do pobrania danych
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const [{ data: perms }, { data: roleData }] = await Promise.all([
    supabase.from('bms_tool_permissions')
      .select('tool, can_access')
      .eq('user_id', user.id),
    supabase.from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
  ])

  const permissions = {}
  if (perms) perms.forEach(p => { permissions[p.tool] = p.can_access })

  return Response.json({
    permissions,
    role: roleData?.role || 'viewer'
  }, {
    headers: { 'Cache-Control': 'private, max-age=30' }
  })
}
