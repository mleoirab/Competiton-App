import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { PageHeader, Banner } from '../components/ui'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (username.trim().length < 3) return setError('Username must be at least 3 characters.')
    if (password.length < 4) return setError('Password must be at least 4 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setSubmitting(true)
    try {
      await signup(username.trim(), password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="narrow">
      <PageHeader title="Create a host account" subtitle="Hosts create and run competitions. Players don’t need an account." />
      <form className="card form" onSubmit={handleSubmit}>
        <Banner kind="error">{error}</Banner>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus placeholder="e.g. amaka" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label>
          Confirm password
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      <p className="muted center">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  )
}
