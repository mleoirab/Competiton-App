// A team's identity chip: colored badge holding its mascot emoji, then its name.
// Pass a team-like object with { name, color, mascot } (works for team rows and
// standings rows). `size` = 'sm' | 'md' | 'lg'; `nameless` shows just the badge.

export function TeamBadge({ team, size = 'md' }) {
  const color = team?.color || 'var(--card-2)'
  const mascot = team?.mascot || '🏳️'
  return (
    <span className={`team-badge team-badge-${size}`} style={{ background: color }} aria-hidden="true">
      {mascot}
    </span>
  )
}

export default function TeamTag({ team, size = 'md', nameless = false }) {
  if (!team) return <span className="muted">—</span>
  return (
    <span className="team-tag">
      <TeamBadge team={team} size={size} />
      {!nameless && <span className="team-tag-name">{team.name}</span>}
    </span>
  )
}
