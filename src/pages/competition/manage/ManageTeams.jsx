import { useState } from 'react'
import { api } from '../../../api'
import { useAuth } from '../../../auth'
import { useCompetitionContext } from '../../../useData'
import { useAction } from '../../../useAction'
import { PageHeader, Banner, Empty } from '../../../components/ui'
import { TeamBadge } from '../../../components/TeamTag'

const EMOJIS = ['🦁','🐉','🦈','🦅','🐺','🐯','🐻','🦊','🐍','🦄','🐢','🐙','⚡','🔥','⭐','🚀','🏆','⚽','🏀','🎯']
const DEFAULT = { name: '', color: '#6C8CFF', mascot: '🦁' }

export default function ManageTeams() {
  const { token } = useAuth()
  const { state, refresh } = useCompetitionContext()
  const compId = state.competition.id
  const { run, busy, error } = useAction(refresh)
  const [form, setForm] = useState(DEFAULT)
  const [editingId, setEditingId] = useState(null)

  async function addTeam(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    await run(() => api.createTeam(token, compId, { ...form, name: form.name.trim() }), {
      onSuccess: () => setForm(DEFAULT),
    })
  }

  return (
    <>
      <PageHeader title="Teams" subtitle="Give each team a color and a mascot. New players auto-join the smallest team." />

      <form className="card form" onSubmit={addTeam}>
        <div className="team-form-row">
          <label className="grow">Team name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Red Dragons" />
          </label>
          <label className="color-field">Color
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </label>
          <div className="mascot-field">
            <span className="field-label">Mascot</span>
            <div className="mascot-preview" style={{ background: form.color }}>{form.mascot}</div>
          </div>
        </div>
        <EmojiPicker value={form.mascot} onPick={(m) => setForm({ ...form, mascot: m })} />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add team'}</button>
      </form>
      <Banner kind="error">{error}</Banner>

      {state.teams.length === 0 ? (
        <Empty>No teams yet. Add a couple so players can be balanced across them.</Empty>
      ) : (
        <div className="team-grid">
          {state.teams.map((team) => (
            <div key={team.id} className="card team-card-view">
              {editingId === team.id ? (
                <EditTeam
                  team={team}
                  busy={busy}
                  onCancel={() => setEditingId(null)}
                  onSave={(patch) => run(() => api.updateTeam(token, compId, team.id, patch), { onSuccess: () => setEditingId(null) })}
                />
              ) : (
                <>
                  <div className="team-card-head">
                    <span className="team-tag"><TeamBadge team={team} /> <span className="team-tag-name">{team.name}</span></span>
                    <span className="pill pill-muted">{team.players.length}</span>
                  </div>
                  {team.players.length > 0 && (
                    <ul className="roster">{team.players.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
                  )}
                  <div className="team-card-actions">
                    <button className="btn btn-sm" disabled={busy} onClick={() => setEditingId(team.id)}>Edit</button>
                    <button className="btn btn-danger btn-sm" disabled={busy}
                      onClick={() => { if (confirm(`Delete team “${team.name}”? Its players go back to the pool and get re-balanced.`)) run(() => api.deleteTeam(token, compId, team.id)) }}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function EditTeam({ team, onSave, onCancel, busy }) {
  const [f, setF] = useState({ name: team.name, color: team.color || '#6C8CFF', mascot: team.mascot || '🦁' })
  return (
    <div className="form">
      <div className="team-form-row">
        <label className="grow">Name
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label className="color-field">Color
          <input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
        </label>
        <div className="mascot-field">
          <span className="field-label">Mascot</span>
          <div className="mascot-preview" style={{ background: f.color }}>{f.mascot}</div>
        </div>
      </div>
      <EmojiPicker value={f.mascot} onPick={(m) => setF({ ...f, mascot: m })} />
      <div className="team-card-actions">
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => f.name.trim() && onSave(f)}>Save</button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function EmojiPicker({ value, onPick }) {
  return (
    <div className="emoji-picker">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          className={`emoji-btn ${value === e ? 'on' : ''}`}
          onClick={() => onPick(e)}
        >
          {e}
        </button>
      ))}
    </div>
  )
}
