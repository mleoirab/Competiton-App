import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { setPlayer } from '../player'
import { PageHeader, Banner } from '../components/ui'

// Player join — no account. Enter a competition code + a display name.
// The device remembers you (via a player token) so you stay in on this browser.
export default function JoinCompetition() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [code, setCode] = useState((params.get('code') || '').toUpperCase())
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const c = code.trim().toUpperCase()
    if (!c) return setError('Enter the competition code.')
    if (!name.trim()) return setError('Enter a display name.')
    setError('')
    setSubmitting(true)
    try {
      const res = await api.joinAsPlayer(c, name.trim())
      setPlayer(res.code, { token: res.playerToken, name: res.name })
      navigate(`/c/${res.code}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="narrow">
      <PageHeader title="Join a competition" subtitle="No account needed — just a code and a name." />
      <form className="card form" onSubmit={handleSubmit}>
        <Banner kind="error">{error}</Banner>
        <label>
          Competition code
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoFocus={!code}
            placeholder="e.g. K7P2QM"
            className="code-input"
            maxLength={8}
          />
        </label>
        <label>
          Your display name
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus={!!code} placeholder="e.g. Amaka" maxLength={24} />
        </label>
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Joining…' : 'Join'}
        </button>
      </form>
      <p className="muted center">You’ll be placed on the team with the fewest players automatically.</p>
    </div>
  )
}
