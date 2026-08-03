import { Link } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'
import { degreeLabel, lastNameSortKey } from '../lib/roles'
import type { Thesis } from '../types'

function authorLabel(thesis: Thesis): string {
  return thesis.creatorNames.join(', ') || '—'
}

function sortTheses(theses: Thesis[]): Thesis[] {
  return [...theses].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return lastNameSortKey(authorLabel(a)).localeCompare(lastNameSortKey(authorLabel(b)))
  })
}

export function Authors() {
  const { data, loading } = useArchive()
  if (loading || !data) return <LoadingState />

  const theses = sortTheses(data.theses)
  const byYear = new Map<number, Thesis[]>()
  for (const thesis of theses) {
    const list = byYear.get(thesis.year) ?? []
    list.push(thesis)
    byYear.set(thesis.year, list)
  }
  const years = [...byYear.keys()].sort((a, b) => b - a)

  return (
    <div className="page">
      <div className="toolbar">
        <h1 className="toolbar__title">
          Authors <span className="toolbar__count">{data.theses.length}</span>
        </h1>
      </div>

      <div className="author-list">
        {years.map((year) => (
          <section key={year} className="author-list__year">
            <h2 className="author-list__year-title">{year}</h2>
            <ul className="author-list__rows">
              {(byYear.get(year) ?? []).map((thesis) => (
                <li key={thesis.id}>
                  <Link to={`/projects/${thesis.id}`} className="author-row">
                    <span className="author-row__author">{authorLabel(thesis)}</span>
                    <span className="author-row__title">{thesis.title}</span>
                    <span className="author-row__degree">
                      {degreeLabel(thesis.degreeName) || '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
