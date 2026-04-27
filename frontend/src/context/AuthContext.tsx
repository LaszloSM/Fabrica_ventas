import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name: string
  image?: string
  role: 'ADMIN' | 'SALES' | 'VIEWER'
}

interface AuthCtx {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
  setUser: (u: User) => void
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, logout: async () => {}, setUser: () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/auth/session', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user ?? null))
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, logout, setUser }}>{children}</Ctx.Provider>
}

export function useAuth() { return useContext(Ctx) }

export async function loginWithGoogle(credential: string): Promise<User | null> {
  const res = await fetch('/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential })
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.user ?? null
}
