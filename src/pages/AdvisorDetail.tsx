import { Link, useParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/LoadingState'
import { ProjectCard } from '../components/ProjectCard'
import { advisorById, useArchive } from '../data/useArchive'
import { isPrimaryRole } from '../lib/roles'
import { sortTheses } from '../lib/filter'

export function AdvisorDetail() {
  const { id } = useParams()
  const { data, loading } = useArchive()

  if (loading || !data) return <LoadingState />

  const advisor = id ? advisorById(data, id) : undefined
  if (!advisor) return <EmptyState label="Advisor not found." />

  const projects = sortTheses(
    data.theses.filter((t) => advisor.projectIds.includes(t.id)),
    'year',
  )

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/advisors">Advisors</Link>
        <span>/</span>
        <span>{advisor.name}</span>
      </p>
      <div className="toolbar">
        <h1 className="toolbar__title">{advisor.name}</h1>
        <p className="toolbar__meta">
          {advisor.projectIds.length} projects · {advisor.primaryCount} primary ·{' '}
          {advisor.secondaryCount} secondary
        </p>
      </div>
      {advisor.aliases.length > 0 ? (
        <p className="muted tight">Also recorded as: {advisor.aliases.join('; ')}</p>
      ) : null}

      <div className="card-grid">
        {projects.map((t) => {
          const roles = t.advisors.filter((a) => a.advisorId === advisor.id)
          const label = roles.some((a) => isPrimaryRole(a.role))
            ? 'Primary advisor'
            : 'Secondary advisor'
          return <ProjectCard key={t.id} thesis={t} badge={label} />
        })}
      </div>
    </div>
  )
}
