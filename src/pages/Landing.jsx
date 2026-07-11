import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function Landing() {
  const { isLoggedIn } = useAuth()
  if (isLoggedIn) return <Navigate to="/dashboard" replace />

  return (
    <>
      <section className="hero">
        <h1>Run any team competition</h1>
        <p className="lead">
          Hosts create a competition and share a code. Players just enter the
          code and a name — no sign-up — and land on balanced teams. Scores,
          standings and fixtures update live for everyone.
        </p>
      </section>

      <div className="split-cta">
        <div className="card cta-card">
          <h2>🎮 I’m a player</h2>
          <p className="muted">Got a code from the organiser? Jump straight in — no account needed.</p>
          <Link to="/join" className="btn btn-primary">Join a competition</Link>
        </div>
        <div className="card cta-card">
          <h2>🛠️ I’m hosting</h2>
          <p className="muted">Create and run a competition. You’ll need a quick host account.</p>
          <div className="cta-actions">
            <Link to="/signup" className="btn btn-primary">Create host account</Link>
            <Link to="/login" className="btn">Log in</Link>
          </div>
        </div>
      </div>
    </>
  )
}
