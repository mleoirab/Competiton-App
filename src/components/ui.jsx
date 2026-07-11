// Small shared UI pieces used across pages.

// Wraps content and shows loading / error states. Pass loading + error from a
// data hook (useMe / useCompetition):  <StateGate loading={loading} error={error}>
export function StateGate({ loading, error, children }) {
  if (loading) {
    return <div className="card center muted">Loading…</div>
  }
  if (error) {
    return (
      <div className="card">
        <h2>Couldn’t load data</h2>
        <p className="error">{error}</p>
        <p className="muted">
          If this is your first run, make sure <code>.env</code> has a valid
          <code> VITE_API_URL</code> and the Apps Script is deployed with access
          set to <b>Anyone</b>. See <code>apps-script/SETUP.md</code>.
        </p>
      </div>
    )
  }
  return children
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

export function Empty({ children }) {
  return <div className="empty muted">{children}</div>
}

// Inline banner for form/action feedback.
export function Banner({ kind = 'info', children }) {
  if (!children) return null
  return <div className={`banner banner-${kind}`}>{children}</div>
}
