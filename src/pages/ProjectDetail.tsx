import { Link, useParams } from 'react-router-dom'
import { LoadingState, EmptyState } from '../components/LoadingState'
import { ReferencesSection } from '../components/ReferencesSection'
import { thesisById, useArchive } from '../data/useArchive'
import { degreeLabel, slugify } from '../lib/roles'

export function ProjectDetail() {
  const { id } = useParams()
  const { data, loading } = useArchive()

  if (loading || !data) return <LoadingState />

  const thesis = thesisById(data, Number(id))
  if (!thesis) return <EmptyState label="Project not found." />

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
        {thesis.references ? (
          <p className="detail-jump">
            <a href="#references">References</a>
          </p>
        ) : null}
      </header>

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
                <Link to={`/advisors/${a.advisorId}`}>{a.name}</Link>
                <span className="muted"> — {a.roleLabel}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section">
        <h2>Documents &amp; links</h2>
        <ul className="plain-list">
          <li>
            <a href={thesis.uri} target="_blank" rel="noreferrer">
              Open Research record
            </a>
          </li>
          {thesis.officialUrl ? (
            <li>
              <a href={thesis.officialUrl} target="_blank" rel="noreferrer">
                Official URL
              </a>
            </li>
          ) : null}
          {thesis.relatedUrls.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer">
                {r.description || r.url}
              </a>
            </li>
          ))}
          {thesis.documents.map((d) => (
            <li key={d.downloadUrl}>
              <a href={d.downloadUrl} target="_blank" rel="noreferrer">
                {d.filename}
              </a>
              {d.mimeType ? <span className="muted"> · {d.mimeType}</span> : null}
            </li>
          ))}
        </ul>
        {thesis.documents.length === 0 &&
        thesis.relatedUrls.length === 0 &&
        !thesis.officialUrl ? (
          <p className="muted">No additional files listed for this record.</p>
        ) : null}
      </section>

      {thesis.references ? <ReferencesSection references={thesis.references} /> : null}
    </div>
  )
}
