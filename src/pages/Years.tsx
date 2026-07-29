import { Link } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'

export function Years() {
  const { data, loading } = useArchive()
  if (loading || !data) return <LoadingState />

  return (
    <div className="page">
      <div className="toolbar">
        <h1 className="toolbar__title">
          Years <span className="toolbar__count">{data.years.length}</span>
        </h1>
      </div>
      <ul className="year-row year-row--page">
        {data.years.map((y) => (
          <li key={y.year}>
            <Link to={`/years/${y.year}`}>{y.year}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
