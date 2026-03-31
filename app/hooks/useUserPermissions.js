'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function useUserPermissions() {
  const [permissions, setPermissions] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setPermissions({}); setLoading(false); return }

      const [{ data: perms }, { data: roleRow }] = await Promise.all([
        supabase.from('bms_tool_permissions').select('tool, can_access').eq('user_id', user.id),
        supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      ])

      if (roleRow?.role === 'admin') {
        setIsAdmin(true)
        setPermissions({})
        setLoading(false)
        return
      }

      // Brak rekordu = ma dostęp (true)
      // Rekord can_access=false = brak dostępu
      const map = {}
      if (perms) {
        perms.forEach(p => { map[p.tool] = p.can_access })
      }
      setPermissions(map)
      setLoading(false)
    }
    load()
  }, [])

  // Sprawdź czy user ma dostęp do narzędzia
  // Admin zawsze ma dostęp
  // Brak rekordu = true (domyślnie ma dostęp)
  const canAccess = (toolId) => {
    if (isAdmin) return true
    if (permissions === null) return true   // loading — pokazuj wszystko
    if (!(toolId in permissions)) return true
    return permissions[toolId]
  }

  return { permissions, loading, isAdmin, canAccess }
}
