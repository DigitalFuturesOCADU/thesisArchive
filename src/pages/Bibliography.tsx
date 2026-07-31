import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'
import { useBibliography } from '../data/useBibliography'
import { linkifyReference } from '../lib/references'
import type { Citation, Thesis } from '../types'

const TOP_N = 10
const RESULT_LIMIT = 80

export function Bibliography() {
  const { data: archive, loading: archiveLoading } = useArchive()
  const { data: bib, loading: bibLoading, error } = useBibliography()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [minCited, setMinCited] = useState(false)
  const [lottery, setLottery] = useState<Citation | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [drawKey, setDrawKey] = useState(0)
  const [shufflePreview, setShufflePreview] = useState<string | null>(null)
  const drawTimer = useRef<number | null>(null)

  const thesisMap = useMemo(() => {
    const map = new Map<number, Thesis>()
    for (const t of archive?.theses ?? []) map.set(t.id, t)
    return map
  }, [archive])

  const topCited = useMemo(() => {
    if (!bib) return []
    return bib.citations.filter((c) => c.count > 1).slice(0, TOP_N)
  }, [bib])

  const results = useMemo(() => {
    if (!bib) return []
    const needle = q.trim().toLowerCase()
    let list = bib.citations
    if (minCited) list = list.filter((c) => c.count > 1)
    if (needle) {
      list = list.filter(
        (c) =>
          c.text.toLowerCase().includes(needle) ||
          c.urls.some((u) => u.toLowerCase().includes(needle)),
      )
    } else if (!minCited) {
      return []
    }
    return list.slice(0, RESULT_LIMIT)
  }, [bib, q, minCited])

  const totalMatches = useMemo(() => {
    if (!bib) return 0
    const needle = q.trim().toLowerCase()
    let list = bib.citations
    if (minCited) list = list.filter((c) => c.count > 1)
    if (needle) {
      list = list.filter(
        (c) =>
          c.text.toLowerCase().includes(needle) ||
          c.urls.some((u) => u.toLowerCase().includes(needle)),
      )
    } else if (!minCited) {
      return 0
    }
    return list.length
  }, [bib, q, minCited])

  if (archiveLoading || bibLoading) return <LoadingState label="Loading bibliographies…" />
  if (error || !bib || !archive) {
    return <EmptyState label={error ?? 'Bibliographies unavailable.'} />
  }

  function setQ(value: string) {
    const next = new URLSearchParams(params)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  function drawLottery() {
    if (!bib || bib.citations.length === 0 || drawing) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      const pick = bib.citations[Math.floor(Math.random() * bib.citations.length)]
      setLottery(pick)
      setDrawKey((k) => k + 1)
      return
    }

    if (drawTimer.current !== null) window.clearInterval(drawTimer.current)

    setDrawing(true)
    setLottery(null)
    setShufflePreview(null)

    const ticks = 7
    let i = 0
    drawTimer.current = window.setInterval(() => {
      const sample = bib.citations[Math.floor(Math.random() * bib.citations.length)]
      setShufflePreview(truncatePreview(sample.text))
      i += 1
      if (i >= ticks) {
        if (drawTimer.current !== null) window.clearInterval(drawTimer.current)
        drawTimer.current = null
        const pick = bib.citations[Math.floor(Math.random() * bib.citations.length)]
        setShufflePreview(null)
        setLottery(pick)
        setDrawKey((k) => k + 1)
        setDrawing(false)
      }
    }, 85)
  }

  return (
    <div className="page bibliography">
      <div className="toolbar">
        <h1 className="toolbar__title">
          Bibliographies <span className="toolbar__count">{bib.citationCount}</span>
        </h1>
        <p className="toolbar__meta">
          Sources deposited with Digital Futures theses — see which projects cite them.
        </p>
      </div>

      <section className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">Search sources</h2>
        </div>
        <div className="bib-search">
          <label className="sr-only" htmlFor="bib-q">
            Search bibliographies
          </label>
          <input
            id="bib-q"
            type="search"
            placeholder="Author, title, keyword, DOI, or URL…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="bib-search__toggle">
            <input
              type="checkbox"
              checked={minCited}
              onChange={(e) => setMinCited(e.target.checked)}
            />
            Cited by 2+ projects
          </label>
        </div>

        {!q.trim() && !minCited ? (
          <p className="muted">
            Search across {bib.citationCount.toLocaleString()} sources, or browse the most-cited
            list below.
          </p>
        ) : totalMatches === 0 ? (
          <EmptyState label="No sources match this search." />
        ) : (
          <>
            <p className="bib-results-meta">
              Showing {results.length.toLocaleString()} of {totalMatches.toLocaleString()} match
              {totalMatches === 1 ? '' : 'es'}
              {totalMatches > RESULT_LIMIT ? ' — refine your search to narrow further' : ''}
            </p>
            <ul className="cite-list">
              {results.map((c) => (
                <li key={c.id}>
                  <CitationBlock citation={c} thesisMap={thesisMap} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="section section--tight lottery">
        <div className="lottery-control">
          <button
            type="button"
            className="lottery-btn"
            onClick={drawLottery}
            disabled={drawing}
            aria-busy={drawing}
          >
            DF Bibliottery
          </button>
          {drawing ? (
            <span className="lottery-rings" aria-hidden="true">
              <span className="lottery-ring" />
              <span className="lottery-ring" />
              <span className="lottery-ring" />
            </span>
          ) : null}
        </div>
        {drawing && shufflePreview ? (
          <p key={shufflePreview} className="lottery-shuffle" aria-hidden="true">
            {shufflePreview}
          </p>
        ) : null}
        {lottery ? (
          <div key={drawKey} className="lottery-result">
            <CitationBlock citation={lottery} thesisMap={thesisMap} />
          </div>
        ) : null}
      </section>

      <section className="section section--tight">
        <div className="section__head">
          <h2 className="section__title">Most cited</h2>
        </div>
        {topCited.length === 0 ? (
          <p className="muted tight">Not enough overlapping citations to rank yet.</p>
        ) : (
          <ol className="cite-rank">
            {topCited.map((c, i) => (
              <li key={c.id} className="cite-rank__item">
                <span className="cite-rank__n">{i + 1}</span>
                <CitationBlock citation={c} thesisMap={thesisMap} compact />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function CitationBlock({
  citation,
  thesisMap,
  compact = false,
}: {
  citation: Citation
  thesisMap: Map<number, Thesis>
  compact?: boolean
}) {
  const projects = citation.projectIds
    .map((id) => thesisMap.get(id))
    .filter((t): t is Thesis => Boolean(t))

  return (
    <article className={`cite-card ${compact ? 'cite-card--compact' : ''}`}>
      <p className="cite-card__text">
        {linkifyReference(citation.text).map((part, j) =>
          typeof part === 'string' ? (
            <span key={j}>{part}</span>
          ) : (
            <a key={j} href={part.href} target="_blank" rel="noreferrer">
              {shortUrl(part.label)}
            </a>
          ),
        )}
      </p>
      <div className="cite-card__meta">
        <span className="cite-card__count">
          {citation.count} project{citation.count === 1 ? '' : 's'}
        </span>
        {citation.urls[0] ? (
          <a href={citation.urls[0]} target="_blank" rel="noreferrer">
            Open source
          </a>
        ) : null}
      </div>
      <ul className="cite-card__projects">
        {projects.map((t) => (
          <li key={t.id}>
            <Link to={`/projects/${t.id}`}>
              <span className="cite-card__year">{t.year}</span>
              {t.title}
              <span className="muted"> — {t.creatorNames.join(', ')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  )
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url)
    const display = `${u.hostname}${u.pathname === '/' ? '' : u.pathname}`
    return display.length > 52 ? `${display.slice(0, 49)}…` : display
  } catch {
    return url.length > 52 ? `${url.slice(0, 49)}…` : url
  }
}

function truncatePreview(text: string, max = 88): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean
}
