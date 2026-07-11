import { Link } from 'react-router-dom'
import { useCompetitionContext } from '../../../useData'
import { PageHeader } from '../../../components/ui'

export default function ManageDashboard() {
  const { state, code } = useCompetitionContext()
  const isPrimary = state.adminRole === 'primary'
  const pending = state.players.filter((p) => !p.teamId).length

  return (
    <>
      <PageHeader title="Manage" subtitle={`Run “${state.competition.name}”.`} />

      <div className="code-cards">
        <div className="card share-card">
          <div>
            <p className="muted">Player code — share so people can join:</p>
            <div className="code-big">{state.competition.playerCode}</div>
          </div>
        </div>
        {isPrimary && state.competition.adminCode && (
          <div className="card share-card">
            <div>
              <p className="muted">Admin code — only for co-admins:</p>
              <div className="code-big admin">{state.competition.adminCode}</div>
            </div>
          </div>
        )}
      </div>

      <div className="stat-row">
        <div className="stat"><div className="stat-num">{state.teams.length}</div><div className="stat-label">Teams</div></div>
        <div className="stat"><div className="stat-num">{state.players.length}</div><div className="stat-label">Players</div></div>
        <div className="stat"><div className="stat-num">{state.games.length}</div><div className="stat-label">Games</div></div>
        <div className="stat"><div className="stat-num">{pending}</div><div className="stat-label">Awaiting team</div></div>
      </div>

      <div className="manage-links">
        <Link to={`/c/${code}/manage/teams`} className="card link-card"><h3>Teams</h3><p className="muted">Create teams for auto-balancing.</p></Link>
        <Link to={`/c/${code}/manage/players`} className="card link-card"><h3>Players</h3><p className="muted">Move players between teams, remove people.</p></Link>
        <Link to={`/c/${code}/manage/games`} className="card link-card"><h3>Games</h3><p className="muted">Define the events teams compete in.</p></Link>
        <Link to={`/c/${code}/manage/fixtures`} className="card link-card"><h3>Fixtures</h3><p className="muted">Set up matches, then score them — drives standings.</p></Link>
        {isPrimary && (
          <Link to={`/c/${code}/manage/admins`} className="card link-card"><h3>Admins</h3><p className="muted">Manage co-admins and the admin code.</p></Link>
        )}
      </div>
    </>
  )
}
