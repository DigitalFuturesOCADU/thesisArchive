import { Link, useParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/LoadingState'
import { ProjectCard } from '../components/ProjectCard'
import { advisorById, useArchive } from '../data/useArchive'
import { isExternalExaminerRole, isPrimaryRole, roleLabel } from '../lib/roles'
import { sortTheses } from '../lib/filter'

export function AdvisorDetail() {
  const { id } = useParams()
  const { data, loading } = useArchive()

  if (loading || !data) return <LoadingState />

  const advisor = id ? advisorById(data, id) : undefined
  if (!advisor) return <EmptyState label="Advisor not found." />

  // Advisor pages only list primary/secondary work — never external examiner slots.
  const projects = sortTheses(
    data.theses.filter((t) =>
      t.advisors.some(
        (a) => a.advisorId === advisor.id && !isExternalExaminerRole(a.role),
      ),
    ),
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
          {projects.length} projects · {advisor.primaryCount} primary ·{' '}
          {advisor.secondaryCount} secondary
          {advisor.facultyBioUrl ? (
            <>
              {' · '}
              <a
                href={advisor.facultyBioUrl}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Faculty Bio
              </a>
            </>
          ) : null}
        </p>
      </div>

      <div className="card-grid">
        {projects.map((t) => {
          const roles = t.advisors.filter(
            (a) => a.advisorId === advisor.id && !isExternalExaminerRole(a.role),
          )
          const label = roles.some((a) => isPrimaryRole(a.role))
            ? 'Primary advisor'
            : roleLabel(roles[0]?.role ?? null)
          return <ProjectCard key={t.id} thesis={t} badge={label} />
        })}
      </div>
    </div>
  )
}
