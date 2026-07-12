import { useCompetitionContext } from '../../useData'
import { PageHeader, Empty } from '../../components/ui'
import Podium from '../../components/Podium'
import TeamTag from '../../components/TeamTag'

export default function Standings() {
  const { state } = useCompetitionContext()

  return (
    <>
      <PageHeader title="Standings" subtitle="Points earned across all fixtures." />
      {state.standings.length === 0 ? (
        <Empty>No teams yet. Once teams are added and games scored, the table appears here.</Empty>
      ) : (
        <>
          <Podium standings={state.standings} />
          <div className="card table-card">
            <table className="table">
              <thead>
                <tr><th>#</th><th>Team</th><th className="num">Games</th><th className="num">Points</th></tr>
              </thead>
              <tbody>
                {state.standings.map((row) => (
                  <tr key={row.teamId}>
                    <td className="rank">{row.rank}</td>
                    <td><TeamTag team={row} size="sm" /></td>
                    <td className="num">{row.games}</td>
                    <td className="num strong">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
