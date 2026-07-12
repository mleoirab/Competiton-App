import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, Link, useParams, useLocation } from 'react-router-dom'
import { useCompetition, getTeam } from '../../useData'
import { useAuth } from '../../auth'
import { useToast } from '../../toast'
import { api } from '../../api'
import { getPlayer } from '../../player'
import { StateGate, Banner } from '../../components/ui'
import { TeamBadge } from '../../components/TeamTag'

// Signature of the parts we notify about, so we can tell what changed poll-to-poll.
function standingsSig(s) {
  return s.standings.map((r) => r.teamId + ':' + r.points).join('|')
}

// Loads one competition by player code. The viewer may be an admin (account
// token), a specific player (device token), or a public guest. Shares the
// loaded state + refresh with child pages via <Outlet context>.
export default function CompetitionLayout() {
  const { code } = useParams()
  const player = getPlayer(code) // { token, name } or null
  const { state, loading, error, refresh } = useCompetition(code, player?.token)
  const location = useLocation()
  const inManage = location.pathname.includes('/manage')

  // Notify the viewer when live data changes between polls.
  const { notify } = useToast()
  const prev = useRef(null)
  useEffect(() => {
    if (!state) return
    const before = prev.current
    prev.current = state
    if (!before) return // skip the very first load

    // New fixture(s)
    const beforeIds = new Set(before.fixtures.map((f) => f.id))
    const added = state.fixtures.filter((f) => !beforeIds.has(f.id))
    if (added.length === 1) notify(`New fixture added${added[0].gameName ? `: ${added[0].gameName}` : ''}`, 'info')
    else if (added.length > 1) notify(`${added.length} new fixtures added`, 'info')

    // Standings changed (a score was entered/updated)
    if (standingsSig(before) !== standingsSig(state)) notify('Standings updated', 'success')

    // This player's team changed (placed, moved, or removed)
    if (state.me && before.me && (state.me.teamId || '') !== (before.me.teamId || '')) {
      if (state.me.teamId) notify(`You’ve been moved to ${state.me.teamName}`, 'success')
      else notify('You’ve been removed from your team', 'info')
    }

    // Any other existing player switched teams (not a brand-new joiner)
    const beforeTeam = {}
    before.players.forEach((p) => { beforeTeam[p.id] = p.teamId || '' })
    const myId = state.me?.playerId
    const othersSwitched = state.players.some((p) =>
      p.id !== myId && beforeTeam[p.id] !== undefined && (p.teamId || '') !== beforeTeam[p.id]
    )
    if (othersSwitched) notify('Teams updated', 'info')
  }, [state, notify])

  return (
    <StateGate loading={loading} error={error}>
      {state && (
        <>
          <div className="comp-header">
            <div>
              <h1>{state.competition.name}</h1>
              <p className="muted">
                Code: <code className="code-chip">{state.competition.playerCode}</code>
                {state.me?.teamId
                  ? <> · You’re <b>{state.me.name}</b> on <span className="team-tag inline-team"><TeamBadge team={getTeam(state, state.me.teamId)} size="sm" /> <b>{state.me.teamName}</b></span></>
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

          {/* Subtle line at the very bottom — open to anyone who isn't already an admin. */}
          {!state.isAdmin && (
            <BecomeAdmin competitionId={state.competition.id} code={state.competition.playerCode} refresh={refresh} />
          )}
        </>
      )}
    </StateGate>
  )
}

// A subtle line at the bottom to request becoming a secondary admin. Players /
// guests are routed through host login first (secondary admins need an account);
// logged-in hosts get an inline field to enter this competition's admin code.
function BecomeAdmin({ competitionId, code, refresh }) {
  const { isLoggedIn, token } = useAuth()
  const [open, setOpen] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Not logged in as a host → send them to host login, returning here after.
  if (!isLoggedIn) {
    return (
      <div className="admin-request-line">
        <Link to="/login" state={{ from: `/c/${code}` }}>Request to become a secondary admin</Link>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="admin-request-line">
        <button className="link-inline" onClick={() => setOpen(true)}>Request to become a secondary admin</button>
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
