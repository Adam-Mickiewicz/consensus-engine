'use client'
import { useState, useEffect } from 'react'

export default function useUserPermissions() {
  const [permissions, setPermissions] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/permissions')
      .then(r => r.json())
      .then(data => {
        setPermissions(data.permissions || {})
        setRole(data.role)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const canAccess = (toolId) => {
    if (!toolId) return true
    if (role === 'admin') return true
    if (permissions === null) return true
    if (!(toolId in permissions)) return true
    return permissions[toolId]
  }

  return { permissions, role, loading, canAccess }
}
