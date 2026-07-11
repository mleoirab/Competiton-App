import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from './api'

// Unified account auth. One account type: anyone can sign up, then create
// competitions (as owner) and/or join others (as player).

const AuthContext = createContext(null)
const STORAGE_KEY = 'competition_auth'

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
    else localStorage.removeItem(STORAGE_KEY)
  }, [auth])

  const signup = useCallback(async (username, password) => {
    const data = await api.signup(username, password)
    setAuth(data) // { token, user }
    return data
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password)
    setAuth(data) // { token, user }
    return data
  }, [])

  const logout = useCallback(() => {
    setAuth(null)
  }, [])

  const value = useMemo(() => ({
    token: auth?.token || null,
    user: auth?.user || null,
    isLoggedIn: !!auth?.token,
    signup,
    login,
    logout,
  }), [auth, signup, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
