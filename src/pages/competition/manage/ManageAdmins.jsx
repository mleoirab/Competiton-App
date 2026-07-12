import { useCallback, useEffect, useState } from 'react'
import { api } from '../../../api'
import { useAuth } from '../../../auth'
import { useCompetitionContext } from '../../../useData'
import { PageHeader, Banner, Empty } from '../../../components/ui'

export default function ManageAdmins() {
  const { token } = useAuth()
  const { state, refresh } = useCompetitionContext()
  const compId = state.competition.id
  const [admins, setAdmins] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Customize the admin code
  const [editingCode, setEditingCode] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [savingCode, setSavingCode] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      setAdmins(await api.listAdmins(token, compId))
    } catch (e) {
      setError(e.message)
    }
  }, [token, compId])

  useEffect(() => { load() }, [load])

  if (state.adminRole !== 'primary') {
    return (
      <div className="card">
        <h2>Not allowed</h2>
        <p className="muted">Only the primary admin can manage admins.</p>
      </div>
    )
  }

  async function remove(adminId, username) {
    if (!confirm(`Remove admin “${username}”?`)) return
    setBusy(true)
    setError('')
    try {
      await api.removeAdmin(token, compId, adminId)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function saveCode(e) {
    e.preventDefault()
    const c = newCode.trim().toUpperCase()
    if (!/^[A-Z0-9]{4,12}$/.test(c)) return setCodeError('Use 4–12 letters or numbers (no spaces or symbols).')
    setCodeError('')
    setSavingCode(true)
    try {
      await api.setAdminCode(token, compId, c)
      await refresh() // updates state.competition.adminCode
      setEditingCode(false)
    } catch (err) {
      setCodeError(err.message)
    } finally {
      setSavingCode(false)
    }
  }

  return (
    <>
      <PageHeader title="Admins" subtitle="People who can help manage this competition." />

      <div className="card share-card">
        <div>
          <p className="muted">Admin code — share only with people who should help manage:</p>
          <div className="code-big admin">{state.competition.adminCode}</div>
          {!editingCode ? (
            <button
              className="btn btn-sm"
              onClick={() => { setNewCode(state.competition.adminCode || ''); setCodeError(''); setEditingCode(true) }}
            >
              Customize code
            </button>
          ) : (
            <form className="form-inline code-edit" onSubmit={saveCode}>
              <input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="code-input"
                maxLength={12}
                autoFocus
                placeholder="Your own code"
              />
              <button className="btn btn-primary btn-sm" disabled={savingCode}>{savingCode ? 'Saving…' : 'Save'}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditingCode(false); setCodeError('') }}>Cancel</button>
            </form>
          )}
          <Banner kind="error">{codeError}</Banner>
          <p className="muted small">They log in (or create an account), then enter this under “Admin code”.</p>
        </div>
      </div>

      <Banner kind="error">{error}</Banner>

      {!admins ? (
        <div className="card center muted">Loading…</div>
      ) : admins.length === 0 ? (
        <Empty>No admins found.</Empty>
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead><tr><th>Admin</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td className="strong">{a.username}</td>
                  <td>
                    <span className={`pill pill-${a.role === 'primary' ? 'ok' : 'muted'}`}>
                      {a.role === 'primary' ? 'Primary' : 'Secondary'}
                    </span>
                  </td>
                  <td className="right">
                    {a.role !== 'primary' && (
                      <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => remove(a.id, a.username)}>
                        Remove
                      </button>
                    )}
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
