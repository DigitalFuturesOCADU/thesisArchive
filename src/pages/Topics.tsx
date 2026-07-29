import { Link } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'

export function Topics() {
  const { data, loading } = useArchive()
  if (loading || !data) return <LoadingState />

  const topics = [...data.topics].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  )

  return (
    <div className="page">
      <div className="toolbar">
        <h1 className="toolbar__title">
          Topics <span className="toolbar__count">{topics.length}</span>
        </h1>
      </div>
      <ul className="chip-row chip-row--wrap chip-row--dense">
        {topics.map((t) => (
          <li key={t.slug}>
            <Link to={`/topics/${t.slug}`}>
              {t.label}
              <span>{t.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
