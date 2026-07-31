import { useEffect, useLayoutEffect } from 'react'
import { Link, useNavigationType } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'
import { lastNameSortKey } from '../lib/roles'

const ADVISORS_SCROLL_KEY = 'advisors-list-scroll-y'

export function Advisors() {
  const { data, loading } = useArchive()
  const navigationType = useNavigationType()

  useEffect(() => {
    const save = () => {
      sessionStorage.setItem(ADVISORS_SCROLL_KEY, String(window.scrollY))
    }
    window.addEventListener('pagehide', save)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
    }
  }, [])

  useLayoutEffect(() => {
    if (loading || !data || navigationType !== 'POP') return
    const raw = sessionStorage.getItem(ADVISORS_SCROLL_KEY)
    if (raw == null) return
    const y = Number(raw)
    if (!Number.isFinite(y)) return
    window.scrollTo(0, y)
  }, [loading, data, navigationType])

  if (loading || !data) return <LoadingState />

  const advisors = [...data.advisors].sort((a, b) =>
    lastNameSortKey(a.name).localeCompare(lastNameSortKey(b.name)),
  )

  return (
    <div className="page">
      <div className="toolbar">
        <h1 className="toolbar__title">
          Advisors <span className="toolbar__count">{advisors.length}</span>
        </h1>
      </div>
      <div className="person-grid">
        {advisors.map((a) => (
          <Link key={a.id} to={`/advisors/${a.id}`} className="person-card">
            <span className="person-card__name">{a.name}</span>
            <span className="person-card__meta">
              {a.projectIds.length} projects
              {a.primaryCount > 0 ? ` · ${a.primaryCount} primary` : ''}
              {a.secondaryCount > 0 ? ` · ${a.secondaryCount} secondary` : ''}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
