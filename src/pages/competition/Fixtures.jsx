import { useCompetitionContext, teamName } from '../../useData'
import { PageHeader, Empty } from '../../components/ui'

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  live: 'Live',
  completed: 'Completed',
  finished: 'Completed',
}

export default function Fixtures() {
  const { state } = useCompetitionContext()

  // Group fixtures by their game, newest first (reversed = most recent on top).
  const groups = []
  const byKey = {}
  ;[...state.fixtures].reverse().forEach((f) => {
    const key = f.gameId || '__none__'
    if (!byKey[key]) {
      byKey[key] = { key, title: f.gameName || 'No game', fixtures: [] }
      groups.push(byKey[key])
    }
    byKey[key].fixtures.push(f)
  })

  return (
    <>
      <PageHeader title="Fixtures" subtitle="Matches between two or more teams." />
      {state.fixtures.length === 0 ? (
        <Empty>No fixtures scheduled yet.</Empty>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="fixture-group">
            <h2 className="section-title">{group.title}</h2>
            <div className="fixture-list">
              {group.fixtures.map((f) => <FixtureCard key={f.id} f={f} state={state} />)}
            </div>
          </section>
        ))
      )}
    </>
  )
}

function FixtureCard({ f, state }) {
  const done = f.status === 'completed' || f.status === 'finished'
  const parts = [...f.participants]
  if (done) parts.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
  const topScore = done ? Math.max(...parts.map((p) => Number(p.score) || 0)) : null

  return (
    <div className="card fixture-row">
      <div className="fixture-meta">
        <span className={`pill pill-${done ? 'ok' : 'muted'}`}>
          {STATUS_LABELS[f.status] || f.status}
        </span>
        {f.date && <span className="muted">{f.date}</span>}
        {f.venue && <span className="muted">· {f.venue}</span>}
        <span className="muted">· {f.participants.length} teams</span>
      </div>
      <ul className="fixture-parts">
        {parts.map((p) => {
          const leader = done && (Number(p.score) || 0) === topScore
          return (
            <li key={p.teamId} className={`fixture-part ${leader ? 'leader' : ''}`}>
              <span className="fixture-part-team">{teamName(state, p.teamId)}</span>
              <span className="fixture-part-score">{done ? (p.score === '' ? 0 : p.score) : '—'}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
