import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/LoadingState'
import { useProjectImages } from '../data/useProjectImages'
import type { ProjectImage, ProjectImageGroup, ProjectImagesData } from '../types'

/**
 * One continuous grid of equal squares. Year and project labels are cells in that
 * same grid rather than block headings, so the run of images never breaks into
 * separate islands with ragged edges.
 */
type Cell =
  | { kind: 'year'; key: string; year: number; projects: number; tiles: number }
  | { kind: 'gap'; key: string; years: number[] }
  | { kind: 'label'; key: string; project: ProjectImageGroup }
  | {
      kind: 'tile'
      key: string
      projectId: number
      title: string
      year: number
      byline: string
      media: ProjectImage
    }

function byline(creatorNames: string[]): string {
  return creatorNames.join(', ')
}

function buildCells(data: ProjectImagesData): Cell[] {
  const byYear = new Map<number, ProjectImageGroup[]>()
  for (const project of data.projects) {
    const list = byYear.get(project.year) ?? []
    list.push(project)
    byYear.set(project.year, list)
  }

  const years = [...byYear.keys()].sort((a, b) => b - a)
  const cells: Cell[] = []

  years.forEach((year, i) => {
    const projects = (byYear.get(year) ?? []).sort((a, b) => a.title.localeCompare(b.title))
    cells.push({
      kind: 'year',
      key: `year-${year}`,
      year,
      projects: projects.length,
      tiles: projects.reduce((n, p) => n + p.images.length, 0),
    })

    for (const project of projects) {
      cells.push({ kind: 'label', key: `label-${project.id}`, project })
      project.images.forEach((media, index) => {
        cells.push({
          kind: 'tile',
          key: `tile-${project.id}-${index}`,
          projectId: project.id,
          title: project.title,
          year: project.year,
          byline: byline(project.creatorNames),
          media,
        })
      })
    }

    // Years between two covered years hold no media at all — mark the break so the
    // jump from e.g. 2021 to 2018 reads as archive coverage, not a rendering bug.
    const next = years[i + 1]
    if (next !== undefined && next < year - 1) {
      const missing: number[] = []
      for (let y = year - 1; y > next; y -= 1) missing.push(y)
      cells.push({ kind: 'gap', key: `gap-${year}`, years: missing })
    }
  })

  return cells
}

function MediaTile({ cell }: { cell: Extract<Cell, { kind: 'tile' }> }) {
  const [failed, setFailed] = useState(false)
  const src = cell.media.thumbnailUrl
  if (!src || failed) return null

  const isVideo = cell.media.kind === 'video'

  return (
    <Link
      to={`/projects/${cell.projectId}`}
      className="media-grid__cell media-grid__tile"
      title={`${cell.title} — ${cell.byline} (${cell.year})`}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
      {isVideo ? (
        <span className="media-grid__play" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </span>
      ) : null}
      <span className="media-grid__caption" aria-hidden="true">
        <strong>{cell.title}</strong>
        <em>{cell.byline}</em>
      </span>
      <span className="visually-hidden">
        {isVideo ? 'Video from ' : ''}
        {cell.title} — {cell.byline} ({cell.year})
      </span>
    </Link>
  )
}

/**
 * The grid's 1px gutters are its ink backdrop showing through, so a part-filled
 * last row would show as a black block. Count the columns the browser actually
 * resolved and pad the tail with blank cells.
 */
function useTailFillers(gridRef: React.RefObject<HTMLDivElement | null>, count: number) {
  const [fillers, setFillers] = useState(0)

  useEffect(() => {
    const el = gridRef.current
    if (!el || count === 0) return

    const measure = () => {
      const columns = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length
      if (columns > 0) setFillers((columns - (count % columns)) % columns)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [gridRef, count])

  return fillers
}

export function Media() {
  const { data, loading, error } = useProjectImages()
  const cells = useMemo(() => (data ? buildCells(data) : []), [data])
  const gridRef = useRef<HTMLDivElement>(null)
  const fillers = useTailFillers(gridRef, cells.length)

  if (loading) return <LoadingState />

  if (error || !data || cells.length === 0) {
    return (
      <div className="page">
        <div className="toolbar">
          <h1 className="toolbar__title">Media</h1>
        </div>
        <EmptyState label={error ?? 'No project media has been deposited yet.'} />
      </div>
    )
  }

  const videoCount = data.videoCount ?? 0

  return (
    <div className="page media-page">
      <div className="toolbar">
        <h1 className="toolbar__title">Media</h1>
        <p className="toolbar__meta">
          {data.imageCount} items from {data.projectCount} projects
          {videoCount > 0 ? ` · ${videoCount} video` : ''}
        </p>
      </div>

      <div className="media-grid" ref={gridRef}>
        {cells.map((cell) => {
          if (cell.kind === 'year') {
            return (
              <Link
                key={cell.key}
                to={`/years/${cell.year}`}
                className="media-grid__cell media-grid__year"
              >
                <span className="media-grid__year-num">{cell.year}</span>
                <span className="media-grid__year-meta">
                  {cell.projects} {cell.projects === 1 ? 'project' : 'projects'}
                  <br />
                  {cell.tiles} items
                </span>
              </Link>
            )
          }

          if (cell.kind === 'gap') {
            return (
              <div key={cell.key} className="media-grid__cell media-grid__gap">
                <span className="media-grid__gap-years">{cell.years.join(' · ')}</span>
                <span className="media-grid__gap-note">No media deposited</span>
              </div>
            )
          }

          if (cell.kind === 'label') {
            return (
              <Link
                key={cell.key}
                to={`/projects/${cell.project.id}`}
                className="media-grid__cell media-grid__label"
              >
                <span className="media-grid__label-title">{cell.project.title}</span>
                <span className="media-grid__label-by">{byline(cell.project.creatorNames)}</span>
                <span className="media-grid__label-count">{cell.project.images.length}</span>
              </Link>
            )
          }

          return <MediaTile key={cell.key} cell={cell} />
        })}
        {Array.from({ length: fillers }, (_, i) => (
          <div key={`filler-${i}`} className="media-grid__cell" aria-hidden="true" />
        ))}
      </div>
    </div>
  )
}
