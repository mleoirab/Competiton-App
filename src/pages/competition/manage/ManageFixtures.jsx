import { useState } from 'react'
import { api } from '../../../api'
import { useAuth } from '../../../auth'
import { useCompetitionContext, teamName } from '../../../useData'
import { useAction } from '../../../useAction'
import { PageHeader, Banner, Empty } from '../../../components/ui'

export default function ManageFixtures() {
  const { token } = useAuth()
  const { state, refresh } = useCompetitionContext()
  const compId = state.competition.id
  const { run, busy, error } = useAction(refresh)

  const [selected, setSelected] = useState({}) // teamId -> bool
  const [meta, setMeta] = useState({ gameId: '', date: '', venue: '' })

  const chosen = state.teams.filter((t) => selected[t.id]).map((t) => t.id)

  function toggle(id) {
    setSelected((s) => ({ ...s, [id]: !s[id] }))
  }
  function selectAll() {
    const all = {}
    state.teams.forEach((t) => { all[t.id] = true })
    setSelected(all)
  }

  async function addFixture(e) {
    e.preventDefault()
    if (chosen.length < 2) return
    await run(() => api.createFixture(token, compId, { teamIds: chosen, ...meta }), {
      onSuccess: () => { setSelected({}); setMeta({ gameId: '', date: '', venue: '' }) },
    })
  }

  return (
    <>
      <PageHeader title="Fixtures" subtitle="A fixture can have any number of teams — two, several, or all." />

      {state.teams.length < 2 ? (
        <Empty>Add at least two teams before scheduling fixtures.</Empty>
      ) : (
        <form className="card form" onSubmit={addFixture}>
          <div className="teams-picker-head">
            <span className="muted">Teams competing ({chosen.length} selected)</span>
            <button type="button" className="btn btn-sm" onClick={selectAll}>Select all</button>
          </div>
          <div className="team-checks">
            {state.teams.map((t) => (
              <label key={t.id} className={`check-item ${selected[t.id] ? 'on' : ''}`}>
                <input type="checkbox" checked={!!selected[t.id]} onChange={() => toggle(t.id)} />
                <span className="team-badge team-badge-sm" style={{ background: t.color || 'var(--card-2)' }}>{t.mascot}</span>
                {t.name}
              </label>
            ))}
          </div>
          <div className="form-row">
            <label>Game
              <select value={meta.gameId} onChange={(e) => setMeta({ ...meta, gameId: e.target.value })}>
                <option value="">— Select a game —</option>
                {state.games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label>Date
              <input type="date" value={meta.date} onChange={(e) => setMeta({ ...meta, date: e.target.value })} />
            </label>
            <label>Venue
              <input value={meta.venue} onChange={(e) => setMeta({ ...meta, venue: e.target.value })} placeholder="optional" />
            </label>
          </div>
          {state.games.length === 0 && (
            <p className="muted small">Tip: add events under <b>Games</b> first, then pick one here.</p>
          )}
          <button className="btn btn-primary" disabled={busy || chosen.length < 2}>
            {busy ? 'Adding…' : `Schedule fixture${chosen.length ? ` (${chosen.length} teams)` : ''}`}
          </button>
        </form>
      )}
      <Banner kind="error">{error}</Banner>

      {state.fixtures.length === 0 ? (
        <Empty>No fixtures scheduled yet.</Empty>
      ) : (
        groupByGame(state.fixtures).map((group) => (
          <section key={group.key} className="fixture-group">
            <h2 className="section-title">{group.title}</h2>
            {group.fixtures.map((f) => (
              <FixtureRow key={f.id} f={f} state={state} compId={compId} token={token} run={run} busy={busy} />
            ))}
          </section>
        ))
      )}
    </>
  )
}

// Group fixtures under their game, newest first. Iterating the reversed list
// means the group holding the most recent fixture appears on top, and each
// group's newest fixture is first — so new fixtures never require scrolling.
function groupByGame(fixtures) {
  const groups = []
  const byKey = {}
  ;[...fixtures].reverse().forEach((f) => {
    const key = f.gameId || '__none__'
    if (!byKey[key]) {
      byKey[key] = { key, title: f.gameName || 'No game', fixtures: [] }
      groups.push(byKey[key])
    }
    byKey[key].fixtures.push(f)
  })
  return groups
}

function FixtureRow({ f, state, compId, token, run, busy }) {
  const [scores, setScores] = useState(() => {
    const init = {}
    f.participants.forEach((p) => { init[p.teamId] = p.score === '' ? '' : String(p.score) })
    return init
  })
  const [status, setStatus] = useState(f.status || 'scheduled')

  async function save() {
    const payload = f.participants.map((p) => ({
      teamId: p.teamId,
      score: scores[p.teamId] === '' ? '' : Number(scores[p.teamId]),
    }))
    await run(() => api.updateFixture(token, compId, { fixtureId: f.id, scores: payload, status }))
  }

  return (
    <div className="card fixture-edit">
      <div className="fixture-edit-head">
        <strong>{f.gameName || `${f.participants.length}-team fixture`}</strong>
        <div className="fixture-edit-meta">
          {f.date && <span className="muted">{f.date}</span>}
          {f.venue && <span className="muted">· {f.venue}</span>}
        </div>
      </div>
      <div className="part-grid">
        {f.participants.map((p) => (
          <label key={p.teamId} className="part-cell">
            <span>{teamName(state, p.teamId)}</span>
            <input
              type="number"
              value={scores[p.teamId] ?? ''}
              onChange={(e) => setScores({ ...scores, [p.teamId]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <div className="fixture-edit-actions">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
        </select>
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>Save</button>
        <button className="btn btn-danger btn-sm" disabled={busy}
          onClick={() => { if (confirm('Delete this fixture?')) run(() => api.deleteFixture(token, compId, f.id)) }}>
          Delete
        </button>
      </div>
    </div>
  )
}
