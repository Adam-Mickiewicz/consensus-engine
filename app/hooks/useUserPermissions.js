'use client'
import { useState, useEffect } from 'react'

export default function useUserPermissions() {
  const [permissions, setPermissions] = useState({})
  const [role, setRole] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetch('/api/user/permissions')
      .then(r => r.json())
      .then(data => {
        setPermissions(data.permissions || {})
        setRole(data.role)
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  const canAccess = (toolId) => {
    if (!ready) return false  // ukryj wszystko dopóki nie załadowane
    if (!toolId) return true
    if (role === 'admin') return true
    if (!(toolId in permissions)) return true
    return permissions[toolId]
  }

  return { permissions, role, loading: !ready, canAccess, ready }
}
