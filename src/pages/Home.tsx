import { Link } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'
import { sortTheses } from '../lib/filter'

export function Home() {
  const { data, loading, usingFixture } = useArchive()

  if (loading || !data) return <LoadingState />

  const recent = sortTheses(data.theses, 'year').slice(0, 12)
  const topTopics = [...data.topics].sort((a, b) => b.count - a.count).slice(0, 18)

  return (
    <div className="page home">
      <section className="home-bar">
        <div className="home-bar__stats" aria-label="Archive counts">
          <Link to="/projects">
            <strong>{data.theses.length}</strong>
            <span>Projects</span>
          </Link>
          <Link to="/advisors">
            <strong>{data.advisors.length}</strong>
            <span>Advisors</span>
          </Link>
          <Link to="/years">
            <strong>
              {data.years.at(-1)?.year}–{data.years[0]?.year}
            </strong>
            <span>Years</span>
          </Link>
          <Link to="/topics">
            <strong>{data.topics.length}</strong>
            <span>Topics</span>
          </Link>
        </div>
        {usingFixture ? (
          <p className="fixture-note">Showing sample data until the live archive is generated.</p>
        ) : null}
      </section>

      <section className="section section--tight">
        <div className="section__head">
          <h1 className="section__title">Years</h1>
          <Link to="/years" className="text-link">
            All
          </Link>
        </div>
        <ul className="year-row">
          {data.years.map((y) => (
            <li key={y.year}>
              <Link to={`/years/${y.year}`}>{y.year}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">Recent projects</h2>
          <Link to="/projects" className="text-link">
            All projects
          </Link>
        </div>
        <div className="card-grid">
          {recent.map((t) => (
            <ProjectCard key={t.id} thesis={t} />
          ))}
        </div>
      </section>

      <section className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">Topics</h2>
          <Link to="/topics" className="text-link">
            All topics
          </Link>
        </div>
        <ul className="chip-row chip-row--wrap">
          {topTopics.map((t) => (
            <li key={t.slug}>
              <Link to={`/topics/${t.slug}`}>
                {t.label}
                <span>{t.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
