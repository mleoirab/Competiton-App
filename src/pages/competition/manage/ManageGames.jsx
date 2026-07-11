import { useState } from 'react'
import { api } from '../../../api'
import { useAuth } from '../../../auth'
import { useCompetitionContext } from '../../../useData'
import { useAction } from '../../../useAction'
import { PageHeader, Banner, Empty } from '../../../components/ui'

export default function ManageGames() {
  const { token } = useAuth()
  const { state, refresh } = useCompetitionContext()
  const compId = state.competition.id
  const { run, busy, error } = useAction(refresh)
  const [form, setForm] = useState({ name: '', description: '' })

  async function addGame(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    await run(() => api.createGame(token, compId, { ...form, name: form.name.trim() }), {
      onSuccess: () => setForm({ name: '', description: '' }),
    })
  }

  return (
    <>
      <PageHeader
        title="Games"
        subtitle="Define the events in your competition. You’ll score them by creating fixtures."
      />
      <form className="card form" onSubmit={addGame}>
        <div className="form-row">
          <label>Game / event name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Tug of War" />
          </label>
          <label>Description (optional)
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add game'}</button>
      </form>
      <Banner kind="error">{error}</Banner>

      {state.games.length === 0 ? (
        <Empty>No games yet. Add one above, then create a fixture to play and score it.</Empty>
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr><th>Game</th><th>Description</th><th></th></tr>
            </thead>
            <tbody>
              {[...state.games].reverse().map((g) => (
                <tr key={g.id}>
                  <td className="strong">{g.name}</td>
                  <td className="muted">{g.description || '—'}</td>
                  <td className="right">
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={busy}
                      onClick={() => { if (confirm(`Delete game “${g.name}”? Fixtures using it will keep their scores but lose the game label.`)) run(() => api.deleteGame(token, compId, g.id)) }}
                    >
                      Delete
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
