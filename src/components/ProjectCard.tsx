import { Link } from 'react-router-dom'
import type { Thesis } from '../types'
import { degreeLabel, slugify } from '../lib/roles'

export function ProjectCard({
  thesis,
  badge,
}: {
  thesis: Thesis
  badge?: string
}) {
  const advisors = thesis.advisors.map((a) => a.name).join(', ')

  return (
    <article className="project-card">
      <Link to={`/projects/${thesis.id}`} className="project-card__link">
        <div className="project-card__meta">
          <span>{thesis.year}</span>
          {thesis.degreeName ? <span>{degreeLabel(thesis.degreeName)}</span> : null}
          {badge ? <span className="project-card__badge">{badge}</span> : null}
        </div>
        <p className="project-card__author">{thesis.creatorNames.join(', ') || '—'}</p>
        <h2 className="project-card__title">{thesis.title}</h2>
        <p className="project-card__advisor">{advisors || '—'}</p>
      </Link>
      {thesis.keywords.length > 0 ? (
        <ul className="tag-list">
          {thesis.keywords.slice(0, 3).map((k) => (
            <li key={k}>
              <Link to={`/topics/${slugify(k)}`}>{k}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="tag-list tag-list--spacer" aria-hidden="true" />
      )}
    </article>
  )
}
