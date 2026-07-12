// Top-3 podium. Expects sorted standings rows: { rank, name, points }.
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function Podium({ standings }) {
  const top = standings.slice(0, 3)
  if (top.length === 0) return null

  // Place teams into the three podium spots BY POSITION (sorted order), not by
  // rank — otherwise ties (everyone rank 1) collapse into one slot. The medal
  // still reflects the team's real rank, so tied teams honestly share a medal.
  // Visual left-to-right: 2nd spot, 1st spot (center/tallest), 3rd spot.
  const layout = [
    { place: 2, row: top[1] },
    { place: 1, row: top[0] },
    { place: 3, row: top[2] },
  ]

  return (
    <div className="podium">
      {layout.map(({ place, row }) => {
        // Keep the place-N class on empty slots too, so they hold their column
        // position and the filled slot(s) stay centered.
        if (!row) return <div key={place} className={`podium-slot empty-slot place-${place}`} />
        return (
          <div key={place} className={`podium-slot place-${place}`}>
            <div className="podium-medal">{MEDALS[row.rank] || `#${row.rank}`}</div>
            <div className="podium-name">{row.name}</div>
            <div className="podium-points">{row.points} pts</div>
            {/* Height & colour come from the real rank, so tied teams match. */}
            <div className={`podium-bar rank-${row.rank}`}>{row.rank}</div>
          </div>
        )
      })}
    </div>
  )
}
