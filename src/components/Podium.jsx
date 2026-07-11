// Top-3 podium. Expects standings rows: { rank, name, points }.
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }
const ORDER = [2, 1, 3] // visual left-to-right: 2nd, 1st, 3rd

export default function Podium({ standings }) {
  const top = standings.slice(0, 3)
  if (top.length === 0) return null

  // Map by rank so ties/short lists render safely.
  const byRank = {}
  top.forEach((row, i) => {
    const r = row.rank || i + 1
    if (!byRank[r]) byRank[r] = row
  })

  return (
    <div className="podium">
      {ORDER.map((rank) => {
        const row = byRank[rank]
        if (!row) return <div key={rank} className="podium-slot empty-slot" />
        return (
          <div key={rank} className={`podium-slot place-${rank}`}>
            <div className="podium-medal">{MEDALS[rank]}</div>
            <div className="podium-name">{row.name}</div>
            <div className="podium-points">{row.points} pts</div>
            <div className="podium-bar">{rank}</div>
          </div>
        )
      })}
    </div>
  )
}
