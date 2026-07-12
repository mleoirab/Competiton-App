import { useCompetitionContext } from '../../useData'
import { PageHeader, Empty } from '../../components/ui'
import { TeamBadge } from '../../components/TeamTag'

export default function Teams() {
  const { state } = useCompetitionContext()

  return (
    <>
      <PageHeader title="Teams" subtitle="Squads and their rosters." />
      {state.teams.length === 0 ? (
        <Empty>No teams have been created yet.</Empty>
      ) : (
        <div className="team-grid">
          {state.teams.map((team) => (
            <div key={team.id} className="card team-card-view" style={{ borderTopColor: team.color || 'var(--border)' }}>
              <div className="team-card-head">
                <h3 className="team-heading"><TeamBadge team={team} size="lg" /> {team.name}</h3>
                <span className="pill pill-muted">{team.players.length} players</span>
              </div>
              {team.players.length === 0 ? (
                <p className="muted">No players yet.</p>
              ) : (
                <ul className="roster">
                  {team.players.map((p) => (
                    <li key={p.id}>{p.name}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
