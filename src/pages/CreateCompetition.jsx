import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { PageHeader, Banner } from '../components/ui'

export default function CreateCompetition() {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState(null) // { name, playerCode, adminCode }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Give your competition a name.')
    setError('')
    setSubmitting(true)
    try {
      setCreated(await api.createCompetition(token, name.trim()))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <div className="narrow">
        <PageHeader title="Competition created 🎉" subtitle={created.name} />
        <div className="card center">
          <p className="muted">Share the <b>player code</b> so people can join:</p>
          <div className="code-big">{created.playerCode}</div>
        </div>
        <div className="card center">
          <p className="muted">Give the <b>admin code</b> only to people who should help manage:</p>
          <div className="code-big admin">{created.adminCode}</div>
          <p className="muted small">Anyone with an account who enters this becomes a secondary admin.</p>
        </div>
        <div className="comp-card-actions center">
          <Link to={`/c/${created.playerCode}/manage/teams`} className="btn btn-primary">Add teams</Link>
          <Link to={`/c/${created.playerCode}`} className="btn">View competition</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="narrow">
      <PageHeader title="New competition" subtitle="You’ll be its primary admin, with a player code and an admin code." />
      <form className="card form" onSubmit={handleSubmit}>
        <Banner kind="error">{error}</Banner>
        <label>
          Competition name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Summer Sports Day" />
        </label>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create competition'}
        </button>
      </form>
    </div>
  )
}
