import { Link, useParams } from 'react-router-dom'
import { DocumentsGrid } from '../components/DocumentsGrid'
import { LoadingState, EmptyState } from '../components/LoadingState'
import { ProjectMedia } from '../components/ProjectMedia'
import { ReferencesSection } from '../components/ReferencesSection'
import { thesisById, useArchive } from '../data/useArchive'
import { heroMedia } from '../lib/media'
import { degreeLabel, isExternalExaminerRole, slugify } from '../lib/roles'

export function ProjectDetail() {
  const { id } = useParams()
  const { data, loading } = useArchive()

  if (loading || !data) return <LoadingState />

  const thesis = thesisById(data, Number(id))
  if (!thesis) return <EmptyState label="Project not found." />

  const media = heroMedia(thesis)

  return (
    <div className="page detail">
      <p className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span>/</span>
        <span>{thesis.year}</span>
      </p>

      <header className="detail-header">
        <p className="detail-meta">
          <span>{thesis.year}</span>
          {thesis.degreeName ? <span>{degreeLabel(thesis.degreeName)}</span> : null}
          {thesis.defenceDate ? <span>{thesis.defenceDate}</span> : null}
        </p>
        <h1>{thesis.title}</h1>
        <p className="detail-authors">{thesis.creatorNames.join(', ')}</p>
      </header>

      {media ? <ProjectMedia media={media} title={thesis.title} /> : null}

      {thesis.abstract ? (
        <section className="section">
          <h2>Abstract</h2>
          <p className="prose">{thesis.abstract}</p>
        </section>
      ) : null}

      {thesis.keywords.length > 0 ? (
        <section className="section">
          <h2>Topics</h2>
          <ul className="tag-list tag-list--lg">
            {thesis.keywords.map((k) => (
              <li key={k}>
                <Link to={`/topics/${slugify(k)}`}>{k}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {thesis.advisors.length > 0 ? (
        <section className="section">
          <h2>Advisors</h2>
          <ul className="plain-list">
            {thesis.advisors.map((a, i) => (
              <li key={`${a.advisorId}-${i}`}>
                {isExternalExaminerRole(a.role) ? (
                  <span>{a.name}</span>
                ) : (
                  <Link to={`/advisors/${a.advisorId}`}>{a.name}</Link>
                )}
                <span className="muted"> — {a.roleLabel}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DocumentsGrid thesis={thesis} />

      {thesis.references ? <ReferencesSection references={thesis.references} /> : null}
    </div>
  )
}
