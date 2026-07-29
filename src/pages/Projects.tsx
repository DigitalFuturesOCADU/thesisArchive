import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/LoadingState'
import { ProjectCard } from '../components/ProjectCard'
import { useArchive } from '../data/useArchive'
import { filterTheses, sortTheses } from '../lib/filter'
import { degreeLabel, lastNameSortKey } from '../lib/roles'

export function Projects() {
  const { data, loading } = useArchive()
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const year = params.get('year') ?? ''
  const degree = params.get('degree') ?? ''
  const advisor = params.get('advisor') ?? ''
  const topic = params.get('topic') ?? ''
  const sort = params.get('sort') ?? 'year'

  const filtered = useMemo(() => {
    if (!data) return []
    return sortTheses(
      filterTheses(data.theses, { q, year, degree, advisor, topic }),
      sort,
    )
  }, [data, q, year, degree, advisor, topic, sort])

  if (loading || !data) return <LoadingState />

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const degrees = [...new Set(data.theses.map((t) => t.degreeName).filter(Boolean))] as string[]

  return (
    <div className="page">
      <div className="toolbar">
        <h1 className="toolbar__title">
          Projects <span className="toolbar__count">{filtered.length}</span>
        </h1>
        <div className="toolbar__filters">
          <label>
            <span className="sr-only">Year</span>
            <select value={year} onChange={(e) => set('year', e.target.value)}>
              <option value="">Year</option>
              {data.years.map((y) => (
                <option key={y.year} value={y.year}>
                  {y.year}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Degree</span>
            <select value={degree} onChange={(e) => set('degree', e.target.value)}>
              <option value="">Degree</option>
              {degrees.map((d) => (
                <option key={d} value={d}>
                  {degreeLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Advisor</span>
            <select value={advisor} onChange={(e) => set('advisor', e.target.value)}>
              <option value="">Advisor</option>
              {[...data.advisors]
                .sort((a, b) => lastNameSortKey(a.name).localeCompare(lastNameSortKey(b.name)))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort</span>
            <select value={sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="year">Newest</option>
              <option value="year-asc">Oldest</option>
              <option value="title">Title</option>
              <option value="student">Student</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState label="No projects match these filters." />
      ) : (
        <div className="card-grid">
          {filtered.map((t) => (
            <ProjectCard key={t.id} thesis={t} />
          ))}
        </div>
      )}
    </div>
  )
}
