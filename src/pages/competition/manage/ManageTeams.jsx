import { useState } from 'react'
import { api } from '../../../api'
import { useAuth } from '../../../auth'
import { useCompetitionContext } from '../../../useData'
import { useAction } from '../../../useAction'
import { PageHeader, Banner, Empty } from '../../../components/ui'

export default function ManageTeams() {
  const { token } = useAuth()
  const { state, refresh } = useCompetitionContext()
  const compId = state.competition.id
  const { run, busy, error } = useAction(refresh)
  const [name, setName] = useState('')

  async function addTeam(e) {
    e.preventDefault()
    if (!name.trim()) return
    await run(() => api.createTeam(token, compId, name.trim()), { onSuccess: () => setName('') })
  }

  return (
    <>
      <PageHeader title="Teams" subtitle="New players are auto-assigned to the smallest team." />
      <form className="card form-inline" onSubmit={addTeam}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New team name" />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add team'}</button>
      </form>
      <Banner kind="error">{error}</Banner>

      {state.teams.length === 0 ? (
        <Empty>No teams yet. Add a couple so players can be balanced across them.</Empty>
      ) : (
        <div className="team-grid">
          {state.teams.map((team) => (
            <div key={team.id} className="card team-card-view">
              <div className="team-card-head">
                <h3>{team.name}</h3>
                <span className="pill pill-muted">{team.players.length} players</span>
              </div>
              {team.players.length > 0 && (
                <ul className="roster">
                  {team.players.map((p) => <li key={p.id}>{p.name}</li>)}
                </ul>
              )}
              <button
                className="btn btn-danger btn-sm"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Delete team “${team.name}”? Its players go back to the pool and get re-balanced.`)) {
                    run(() => api.deleteTeam(token, compId, team.id))
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
