import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import { Link, useNavigationType } from 'react-router-dom'
import { LoadingState } from '../components/LoadingState'
import { useArchive } from '../data/useArchive'
import { lastNameSortKey } from '../lib/roles'
import type { Advisor } from '../types'
import dfFaculty from '../../data/df-faculty.json'

const ADVISORS_SCROLL_KEY = 'advisors-list-scroll-y'

const FACULTY_GROUP_ORDER = [
  'Faculty of Art',
  'Faculty of Design',
  'Faculty of Arts & Science',
]

function sortByLastName(advisors: Advisor[]) {
  return [...advisors].sort((a, b) =>
    lastNameSortKey(a.name).localeCompare(lastNameSortKey(b.name)),
  )
}

function pickByIds(byId: Map<string, Advisor>, ids: string[]) {
  return ids.map((id) => byId.get(id)).filter((a): a is Advisor => Boolean(a))
}

function AdvisorCard({ advisor }: { advisor: Advisor }) {
  return (
    <Link to={`/advisors/${advisor.id}`} className="person-card">
      <span className="person-card__name">{advisor.name}</span>
      <span className="person-card__meta">
        {advisor.projectIds.length} projects
        {advisor.primaryCount > 0 ? ` · ${advisor.primaryCount} primary` : ''}
        {advisor.secondaryCount > 0 ? ` · ${advisor.secondaryCount} secondary` : ''}
      </span>
    </Link>
  )
}

function AdvisorGrid({ advisors }: { advisors: Advisor[] }) {
  if (advisors.length === 0) {
    return <p className="muted">None in the archive yet.</p>
  }
  return (
    <div className="person-grid">
      {advisors.map((a) => (
        <AdvisorCard key={a.id} advisor={a} />
      ))}
    </div>
  )
}

function AdvisorSection({
  title,
  count,
  children,
  level = 2,
}: {
  title: string
  count?: number
  children: ReactNode
  level?: 2 | 3
}) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <section className="advisor-section">
      <div className="section__head">
        <Heading className={level === 2 ? 'advisor-section__title' : 'section__title'}>
          {title}
          {count != null ? <span className="toolbar__count"> {count}</span> : null}
        </Heading>
      </div>
      {children}
    </section>
  )
}

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

  const byId = new Map(data.advisors.map((a) => [a.id, a]))
  const featuredIds = new Set([
    ...dfFaculty.current,
    ...dfFaculty.previous,
    ...(dfFaculty.administration ?? []),
  ])

  const current = sortByLastName(pickByIds(byId, dfFaculty.current))
  const previous = sortByLastName(pickByIds(byId, dfFaculty.previous))
  const administration = sortByLastName(pickByIds(byId, dfFaculty.administration ?? []))

  const remaining = data.advisors.filter((a) => !featuredIds.has(a.id))
  const inDirectory = remaining.filter((a) => a.ocaduFaculty || a.facultyBioUrl)
  const notInDirectory = sortByLastName(
    remaining.filter((a) => !a.ocaduFaculty && !a.facultyBioUrl),
  )

  const facultyGroups = new Map<string, Advisor[]>()
  for (const advisor of inDirectory) {
    const key = advisor.ocaduFaculty || 'Faculty unknown'
    const list = facultyGroups.get(key) ?? []
    list.push(advisor)
    facultyGroups.set(key, list)
  }

  // Current DF faculty are also listed under Faculty of Arts & Science.
  const fasKey = 'Faculty of Arts & Science'
  const fasList = facultyGroups.get(fasKey) ?? []
  const fasIds = new Set(fasList.map((a) => a.id))
  for (const advisor of current) {
    if (!fasIds.has(advisor.id)) {
      fasList.push(advisor)
      fasIds.add(advisor.id)
    }
  }
  if (fasList.length > 0) facultyGroups.set(fasKey, fasList)

  const orderedFacultyKeys = [
    ...FACULTY_GROUP_ORDER.filter((k) => facultyGroups.has(k)),
    ...[...facultyGroups.keys()]
      .filter((k) => !FACULTY_GROUP_ORDER.includes(k))
      .sort((a, b) => a.localeCompare(b)),
  ]

  const allOcaduCount = [...facultyGroups.values()].reduce((n, list) => n + list.length, 0)

  return (
    <div className="page">
      <div className="toolbar">
        <h1 className="toolbar__title">
          Advisors <span className="toolbar__count">{data.advisors.length}</span>
        </h1>
      </div>

      <AdvisorSection title="Digital Futures Faculty" count={current.length + previous.length}>
        <AdvisorSection title="Current" count={current.length} level={3}>
          <AdvisorGrid advisors={current} />
        </AdvisorSection>
        <AdvisorSection title="Previous" count={previous.length} level={3}>
          <AdvisorGrid advisors={previous} />
        </AdvisorSection>
      </AdvisorSection>

      <AdvisorSection title="OCADU Administration" count={administration.length}>
        <AdvisorGrid advisors={administration} />
      </AdvisorSection>

      <AdvisorSection
        title="All OCADU Faculty"
        count={allOcaduCount + notInDirectory.length}
      >
        {orderedFacultyKeys.map((faculty) => {
          const advisors = sortByLastName(facultyGroups.get(faculty) ?? [])
          return (
            <AdvisorSection key={faculty} title={faculty} count={advisors.length} level={3}>
              <AdvisorGrid advisors={advisors} />
            </AdvisorSection>
          )
        })}
        {notInDirectory.length > 0 ? (
          <AdvisorSection
            title="Not in faculty directory"
            count={notInDirectory.length}
            level={3}
          >
            <AdvisorGrid advisors={notInDirectory} />
          </AdvisorSection>
        ) : null}
      </AdvisorSection>
    </div>
  )
}
