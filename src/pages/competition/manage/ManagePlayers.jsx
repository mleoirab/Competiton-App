import { api } from '../../../api'
import { useAuth } from '../../../auth'
import { useCompetitionContext } from '../../../useData'
import { useAction } from '../../../useAction'
import { PageHeader, Banner, Empty } from '../../../components/ui'

export default function ManagePlayers() {
  const { token } = useAuth()
  const { state, refresh } = useCompetitionContext()
  const compId = state.competition.id
  const { run, busy, error } = useAction(refresh)

  return (
    <>
      <PageHeader title="Players" subtitle="Players join with the code and are auto-assigned — override here if needed." />
      <Banner kind="error">{error}</Banner>

      {state.players.length === 0 ? (
        <Empty>No players have joined yet. Share the code <code>{state.competition.playerCode}</code>.</Empty>
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr><th>Player</th><th>Team</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {state.players.map((pl) => (
                <tr key={pl.id}>
                  <td className="strong">{pl.name}</td>
                  <td>
                    <select
                      value={pl.teamId || ''}
                      disabled={busy}
                      onChange={(e) => run(() => api.assignPlayer(token, compId, pl.id, e.target.value))}
                    >
                      <option value="">— Unassigned —</option>
                      {state.teams.map((t) => <option key={t.id} value={t.id}>{t.mascot} {t.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className={`pill pill-${pl.teamId ? 'ok' : 'warn'}`}>
                      {pl.teamId ? 'Assigned' : 'Awaiting team'}
                    </span>
                  </td>
                  <td className="right">
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={busy}
                      onClick={() => { if (confirm(`Remove ${pl.name} from this competition?`)) run(() => api.removePlayer(token, compId, pl.id)) }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
