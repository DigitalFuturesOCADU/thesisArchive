import { Link } from 'react-router-dom'
import type { Thesis } from '../types'
import { isExternalExaminerRole, slugify } from '../lib/roles'

export function ProjectCard({
  thesis,
  badge,
}: {
  thesis: Thesis
  badge?: string
}) {
  const advisors = thesis.advisors.filter((a) => !isExternalExaminerRole(a.role))

  return (
    <article className="project-card">
      {/* Only the advisor pages pass a badge; every other card starts at the title */}
      {badge ? (
        <div className="project-card__meta">
          <span className="project-card__badge">{badge}</span>
        </div>
      ) : null}
      <h2 className="project-card__title">
        {/* Stretched via ::after — the whole card is the hit target. */}
        <Link to={`/projects/${thesis.id}`} className="project-card__link">
          {thesis.title}
        </Link>
      </h2>
      <p className="project-card__author">{thesis.creatorNames.join(', ') || '—'}</p>
      <div className="project-card__foot">
        <p className="project-card__advisor">
          <span className="project-card__advisor-label">
            {advisors.length === 1 ? 'Advisor:' : 'Advisors:'}
          </span>
          {advisors.length > 0
            ? advisors.map((a, i) => (
                <span key={`${a.advisorId}-${i}`}>
                  {i > 0 ? ', ' : null}
                  <Link to={`/advisors/${a.advisorId}`}>{a.name}</Link>
                </span>
              ))
            : '—'}
        </p>
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
      </div>
    </article>
  )
}
