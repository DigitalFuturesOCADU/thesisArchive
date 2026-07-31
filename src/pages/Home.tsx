import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'
import { sortTheses } from '../lib/filter'
import type { ProjectImagesData } from '../types'

const BAND_COUNT = 8
const PROJECT_IMAGES_URL = `${import.meta.env.BASE_URL}data/project-images.json`

type BandItem = {
  projectId: number
  title: string
  year: number
  /** Ordered candidates — thumbs only, never full-res archive files. */
  urls: string[]
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

/** Instant pick — no network probes before first paint. */
function pickBandImages(catalog: ProjectImagesData): BandItem[] {
  const picked: BandItem[] = []

  for (const project of shuffle(catalog.projects)) {
    if (picked.length >= BAND_COUNT) break

    const urls = shuffle(project.images)
      .map((image) => image.thumbnailUrl)
      .filter((url): url is string => Boolean(url))

    if (urls.length === 0) continue

    picked.push({
      projectId: project.id,
      title: project.title,
      year: project.year,
      urls,
    })
  }

  return picked
}

function BandTile({ item, onDead }: { item: BandItem; onDead: (projectId: number) => void }) {
  const [urls, setUrls] = useState(item.urls)
  const src = urls[0]

  if (!src) return null

  return (
    <Link
      to={`/projects/${item.projectId}`}
      className="home-image-band__item"
      title={`${item.title} (${item.year})`}
    >
      <img
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        fetchPriority="high"
        referrerPolicy="no-referrer"
        onError={() => {
          setUrls((prev) => {
            const next = prev.slice(1)
            if (next.length === 0) onDead(item.projectId)
            return next
          })
        }}
      />
      <span className="visually-hidden">
        {item.title} ({item.year})
      </span>
    </Link>
  )
}

export function Home() {
  const { data, loading, usingFixture } = useArchive()
  const [band, setBand] = useState<BandItem[]>([])

  useEffect(() => {
    let cancelled = false
    async function loadBand() {
      try {
        const res = await fetch(PROJECT_IMAGES_URL)
        if (!res.ok) return
        const json = (await res.json()) as ProjectImagesData
        if (!cancelled) setBand(pickBandImages(json))
      } catch {
        // Band is decorative — ignore failures.
      }
    }
    void loadBand()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || !data) return <LoadingState />

  const latestYear = data.years[0]?.year
  const latestYearProjects = latestYear
    ? sortTheses(
        data.theses.filter((t) => t.year === latestYear),
        'title',
      )
    : []
  const topTopics = [...data.topics].sort((a, b) => b.count - a.count).slice(0, 18)

  return (
    <div className="page home">
      <section className="home-bar">
        {band.length > 0 ? (
          <div
            className="home-image-band"
            aria-label="Featured project images"
            style={{ '--band-count': band.length } as CSSProperties}
          >
            {band.map((item) => (
              <BandTile
                key={item.projectId}
                item={item}
                onDead={(projectId) => {
                  setBand((prev) => prev.filter((b) => b.projectId !== projectId))
                }}
              />
            ))}
          </div>
        ) : null}
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

      {latestYear ? (
        <section className="section section--tight">
          <div className="section__head">
            <h2 className="section__title">{latestYear} projects</h2>
            <Link to={`/years/${latestYear}`} className="text-link">
              All
            </Link>
          </div>
          <div className="card-grid">
            {latestYearProjects.map((t) => (
              <ProjectCard key={t.id} thesis={t} />
            ))}
          </div>
        </section>
      ) : null}

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
