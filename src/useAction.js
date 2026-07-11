import { useState } from 'react'

// Runs an async action, optionally refreshes data, and surfaces busy/error
// state. Pass the relevant refresh function (from useMe/useCompetition):
//   const { run, busy, error } = useAction(refresh)
//   run(() => api.createTeam(token, compId, name), { onSuccess })
export function useAction(refresh) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(fn, { onSuccess, skipRefresh } = {}) {
    setBusy(true)
    setError('')
    try {
      const result = await fn()
      if (refresh && !skipRefresh) await refresh()
      if (onSuccess) onSuccess(result)
      return result
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  return { run, busy, error, setError }
}
