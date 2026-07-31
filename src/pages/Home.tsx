import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ProjectCard } from '../components/ProjectCard'
import { LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'
import { sortTheses } from '../lib/filter'
import type { ProjectImage, ProjectImageGroup, ProjectImagesData } from '../types'

const BAND_COUNT = 8
const PROJECT_IMAGES_URL = `${import.meta.env.BASE_URL}data/project-images.json`

type BandItem = {
  projectId: number
  title: string
  year: number
  url: string
  fallbackUrls: string[]
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function candidateUrls(image: ProjectImage): string[] {
  // Prefer lightbox thumbs (correct aspect, small file). Full image is fallback.
  // Never use EPrints "medium" thumbs — those are padded to 200×150.
  const urls = [image.thumbnailUrl, image.url].filter((u): u is string => Boolean(u))
  return [...new Set(urls)]
}

type ProbeResult = { ok: true; width: number; height: number } | { ok: false }

function probeImage(url: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const img = new Image()
    let settled = false
    const done = (result: ProbeResult) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    const timer = window.setTimeout(() => done({ ok: false }), 8000)
    img.onload = () => {
      window.clearTimeout(timer)
      if (img.naturalWidth > 0) {
        done({ ok: true, width: img.naturalWidth, height: img.naturalHeight })
      } else {
        done({ ok: false })
      }
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      done({ ok: false })
    }
    img.referrerPolicy = 'no-referrer'
    img.src = url
  })
}

/** Prefer nearer-to-square sources — they crop more cleanly in the band tiles. */
function coverScore(width: number, height: number) {
  const ar = width / height
  return -Math.abs(Math.log2(ar))
}

async function resolveProjectImage(project: ProjectImageGroup): Promise<BandItem | null> {
  let best:
    | (BandItem & { score: number })
    | null = null

  for (const image of shuffle(project.images)) {
    const urls = candidateUrls(image)
    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i]
      const probed = await probeImage(url)
      if (!probed.ok) continue
      const score = coverScore(probed.width, probed.height)
      if (!best || score > best.score) {
        best = {
          projectId: project.id,
          title: project.title,
          year: project.year,
          url,
          fallbackUrls: [...urls.slice(0, i), ...urls.slice(i + 1)],
          score,
        }
      }
      // Good enough square/landscape — stop searching this project.
      if (score > -0.35) break
    }
    if (best && best.score > -0.35) break
  }

  if (!best) return null
  const { score: _score, ...item } = best
  return item
}

async function pickBandImages(catalog: ProjectImagesData): Promise<BandItem[]> {
  const projects = shuffle(catalog.projects)
  const picked: BandItem[] = []
  for (const project of projects) {
    if (picked.length >= BAND_COUNT) break
    const item = await resolveProjectImage(project)
    if (item) picked.push(item)
  }
  return picked
}

function BandTile({ item, onDead }: { item: BandItem; onDead: (projectId: number) => void }) {
  const [src, setSrc] = useState(item.url)
  const [fallbacks, setFallbacks] = useState(item.fallbackUrls)

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
        referrerPolicy="no-referrer"
        onError={() => {
          const [next, ...rest] = fallbacks
          if (next) {
            setFallbacks(rest)
            setSrc(next)
            return
          }
          onDead(item.projectId)
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
        const items = await pickBandImages(json)
        if (!cancelled) setBand(items)
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
