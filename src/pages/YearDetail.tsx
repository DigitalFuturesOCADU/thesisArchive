import { Link, useParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/LoadingState'
import { ProjectCard } from '../components/ProjectCard'
import { useArchive, yearBucket } from '../data/useArchive'
import { sortTheses } from '../lib/filter'

export function YearDetail() {
  const { year } = useParams()
  const { data, loading } = useArchive()

  if (loading || !data) return <LoadingState />

  const y = year ? yearBucket(data, Number(year)) : undefined
  if (!y) return <EmptyState label="Year not found." />

  const projects = sortTheses(
    data.theses.filter((t) => y.projectIds.includes(t.id)),
    'title',
  )

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/years">Years</Link>
        <span>/</span>
        <span>{y.year}</span>
      </p>
      <div className="toolbar">
        <h1 className="toolbar__title">
          {y.year} <span className="toolbar__count">{y.count}</span>
        </h1>
      </div>
      <div className="card-grid">
        {projects.map((t) => (
          <ProjectCard key={t.id} thesis={t} />
        ))}
      </div>
    </div>
  )
}
