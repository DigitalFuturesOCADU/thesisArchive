import { Link } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'

export function Advisors() {
  const { data, loading } = useArchive()
  if (loading || !data) return <LoadingState />

  const advisors = [...data.advisors].sort(
    (a, b) => b.projectIds.length - a.projectIds.length || a.name.localeCompare(b.name),
  )

  return (
    <div className="page">
      <div className="toolbar">
        <h1 className="toolbar__title">
          Advisors <span className="toolbar__count">{advisors.length}</span>
        </h1>
      </div>
      <div className="person-grid">
        {advisors.map((a) => (
          <Link key={a.id} to={`/advisors/${a.id}`} className="person-card">
            <span className="person-card__name">{a.name}</span>
            <span className="person-card__meta">
              {a.projectIds.length} projects
              {a.primaryCount > 0 ? ` · ${a.primaryCount} primary` : ''}
              {a.secondaryCount > 0 ? ` · ${a.secondaryCount} secondary` : ''}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
