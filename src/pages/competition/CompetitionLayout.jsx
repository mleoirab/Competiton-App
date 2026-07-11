import { useState } from 'react'
import { NavLink, Outlet, Link, useParams, useLocation } from 'react-router-dom'
import { useCompetition } from '../../useData'
import { useAuth } from '../../auth'
import { api } from '../../api'
import { getPlayer } from '../../player'
import { StateGate, Banner } from '../../components/ui'

// Loads one competition by player code. The viewer may be an admin (account
// token), a specific player (device token), or a public guest. Shares the
// loaded state + refresh with child pages via <Outlet context>.
export default function CompetitionLayout() {
  const { code } = useParams()
  const player = getPlayer(code) // { token, name } or null
  const { state, loading, error, refresh } = useCompetition(code, player?.token)
  const location = useLocation()
  const inManage = location.pathname.includes('/manage')

  return (
    <StateGate loading={loading} error={error}>
      {state && (
        <>
          <div className="comp-header">
            <div>
              <h1>{state.competition.name}</h1>
              <p className="muted">
                Code: <code className="code-chip">{state.competition.playerCode}</code>
                {state.me?.teamName
                  ? <> · You’re <b>{state.me.name}</b> on <b>{state.me.teamName}</b></>
                  : state.me
                    ? <> · You’re <b>{state.me.name}</b> (awaiting a team)</>
                    : null}
                <span className="live-badge" title="Standings & fixtures update automatically">
                  <span className="live-dot" /> Live
                </span>
              </p>
            </div>
          </div>

          {!state.isAdmin && !state.me && (
            <div className="banner banner-info join-nudge">
              You’re viewing as a guest.{' '}
              <Link to={`/join?code=${state.competition.playerCode}`}>Join with your name</Link> to get a team.
            </div>
          )}

          {!state.isAdmin && <BecomeAdmin competitionId={state.competition.id} refresh={refresh} />}

          <nav className="admin-nav">
            <NavLink end to={`/c/${code}`}>Standings</NavLink>
            <NavLink to={`/c/${code}/fixtures`}>Fixtures</NavLink>
            <NavLink to={`/c/${code}/teams`}>Teams</NavLink>
            {state.isAdmin && <NavLink to={`/c/${code}/manage`}>Manage</NavLink>}
          </nav>

          {inManage && !state.isAdmin ? (
            <div className="card">
              <h2>Not allowed</h2>
              <p className="muted">Only an admin of this competition can manage it.</p>
            </div>
          ) : (
            <Outlet context={{ state, refresh, code }} />
          )}
        </>
      )}
    </StateGate>
  )
}

// In-competition request to become a secondary admin: reveal a field, enter
// this competition's admin code. Only offered to logged-in host accounts.
function BecomeAdmin({ competitionId, refresh }) {
  const { isLoggedIn, token } = useAuth()
  const [open, setOpen] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!isLoggedIn) {
    return (
      <div className="banner banner-info">
        Are you a co-admin? <Link to="/login">Log in</Link>, then request admin access here.
      </div>
    )
  }

  if (!open) {
    return (
      <div className="admin-request">
        <button className="btn btn-sm" onClick={() => setOpen(true)}>Become a secondary admin</button>
      </div>
    )
  }

  async function submit(e) {
    e.preventDefault()
    const c = adminCode.trim().toUpperCase()
    if (!c) return setError('Enter the admin code for this competition.')
    setError('')
    setBusy(true)
    try {
      await api.claimAdmin(token, c, competitionId)
      await refresh() // now an admin → Manage tab appears
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card form-inline admin-request-form" onSubmit={submit}>
      <input
        value={adminCode}
        onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
        placeholder="Admin code for this competition"
        className="code-input"
        maxLength={8}
        autoFocus
      />
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Requesting…' : 'Request admin access'}</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setError('') }}>Cancel</button>
      {error && <Banner kind="error">{error}</Banner>}
    </form>
  )
}
