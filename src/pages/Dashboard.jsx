import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { useMe } from '../useData'
import { StateGate, PageHeader, Empty } from '../components/ui'

export default function Dashboard() {
  const { user } = useAuth()
  const { me, loading, error } = useMe()
  const comps = me?.competitions || []

  return (
    <StateGate loading={loading} error={error}>
      <PageHeader
        title={`Hi, ${user?.username}`}
        subtitle="Competitions you administer"
        actions={<Link to="/new" className="btn btn-primary">New competition</Link>}
      />

      {comps.length === 0 ? (
        <Empty>
          You don’t administer any competitions yet. <Link to="/new">Create one</Link>, or open a
          competition you have the code for and request admin access there.
        </Empty>
      ) : (
        <div className="comp-grid">
          {comps.map((c) => (
            <div key={c.competitionId} className="card comp-card">
              <div className="comp-card-head">
                <h3>{c.name}</h3>
                <span className={`pill pill-${c.role === 'primary' ? 'ok' : 'muted'}`}>
                  {c.role === 'primary' ? 'Primary admin' : 'Admin'}
                </span>
              </div>
              <p className="muted">Player code: <code className="code-chip">{c.playerCode}</code></p>
              <div className="comp-card-actions">
                <Link to={`/c/${c.playerCode}`} className="btn">View</Link>
                <Link to={`/c/${c.playerCode}/manage`} className="btn btn-primary">Manage</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </StateGate>
  )
}
