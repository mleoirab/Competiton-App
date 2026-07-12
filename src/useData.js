import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api } from './api'
import { useAuth } from './auth'

// Data hooks. Unlike the old single-competition global store, data is now
// fetched per view: your account's competitions (useMe) and one competition
// by code (useCompetition). Competition sub-pages read it via <Outlet context>.

// An error whose message means "your saved login is no longer valid".
function isAuthError(message) {
  return /log in|session expired|account no longer exists/i.test(message || '')
}

// Your account + the competitions you own/joined.
export function useMe() {
  const { token, logout } = useAuth()
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setMe(await api.getMe(token))
    } catch (e) {
      // Stale/expired login → clear it so the user is sent back to log in.
      if (isAuthError(e.message)) logout()
      else setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, logout])

  useEffect(() => { refresh() }, [refresh])
  return { me, loading, error, refresh }
}

// How often open pages re-fetch a competition so every viewer sees new
// scores/standings without a manual refresh. Apps Script can't push, so we
// poll; pausing on hidden tabs keeps Google's quota usage down.
const LIVE_POLL_MS = 10000

// One competition's full public state. Viewer identity is optional: an account
// token (admin) and/or a player token (a specific player) — either may be null.
// Auto-refreshes on an interval so standings & fixtures stay live for everyone.
export function useCompetition(code, playerToken) {
  const { token } = useAuth()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // silent = background poll/refresh: update data in place without a spinner,
  // and keep showing the last good data if a poll momentarily fails.
  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true)
    try {
      setState(await api.getCompetition(code, token, playerToken))
      setError(null)
    } catch (e) {
      if (!silent) setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [code, token, playerToken])

  // Initial load (with spinner).
  useEffect(() => { load(false) }, [load])

  // Live polling — only while the tab is visible.
  useEffect(() => {
    const tick = () => { if (!document.hidden) load(true) }
    const id = setInterval(tick, LIVE_POLL_MS)
    document.addEventListener('visibilitychange', tick) // catch up on refocus
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [load])

  // Actions call this after a write — refresh in place, no spinner.
  const refresh = useCallback(() => load(true), [load])

  return { state, loading, error, refresh }
}

// Competition sub-pages pull the shared state provided by CompetitionLayout.
export function useCompetitionContext() {
  return useOutletContext()
}

// Look up a team name by id within a competition's state.
export function teamName(state, id) {
  const t = state?.teams?.find((t) => t.id === id)
  return t ? t.name : '—'
}

// Look up the full team object (name, color, mascot) by id.
export function getTeam(state, id) {
  return state?.teams?.find((t) => t.id === id) || null
}
