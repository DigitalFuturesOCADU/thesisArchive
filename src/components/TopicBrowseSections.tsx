import { Link } from 'react-router-dom'
import type { Topic } from '../types'

function sortByCount(topics: Topic[]): Topic[] {
  return [...topics].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  )
}

function sortByLabel(topics: Topic[]): Topic[] {
  return [...topics].sort((a, b) => a.label.localeCompare(b.label))
}

function partitionTopics(topics: Topic[], excludeSlug?: string) {
  const filtered = excludeSlug ? topics.filter((t) => t.slug !== excludeSlug) : topics
  const recurring = sortByCount(filtered.filter((t) => t.count > 1))
  const singles = sortByLabel(filtered.filter((t) => t.count === 1))
  return { recurring, singles }
}

function TopicChipList({
  topics,
  dense = false,
}: {
  topics: Topic[]
  dense?: boolean
}) {
  if (topics.length === 0) return null
  return (
    <ul className={`chip-row chip-row--wrap${dense ? ' chip-row--dense' : ''}`}>
      {topics.map((t) => (
        <li key={t.slug}>
          <Link to={`/topics/${t.slug}`}>
            {t.label}
            <span>{t.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Topics browse blocks: recurring topics (home-style), then Singles. */
export function TopicBrowseSections({
  topics,
  excludeSlug,
  topLimit = 18,
  showAllLink = true,
}: {
  topics: Topic[]
  excludeSlug?: string
  /** Cap recurring chips like the home page; omit or 0 for all. */
  topLimit?: number
  showAllLink?: boolean
}) {
  const { recurring, singles } = partitionTopics(topics, excludeSlug)
  const shown = topLimit > 0 ? recurring.slice(0, topLimit) : recurring

  return (
    <>
      {shown.length > 0 ? (
        <section className="section section--tight">
          <div className="section__head">
            <h2 className="section__title">Topics</h2>
            {showAllLink ? (
              <Link to="/topics" className="text-link">
                All topics
              </Link>
            ) : null}
          </div>
          <TopicChipList topics={shown} />
        </section>
      ) : null}

      {singles.length > 0 ? (
        <section className="section section--tight">
          <div className="section__head">
            <h2 className="section__title">Singles</h2>
            <span className="section__meta">{singles.length}</span>
          </div>
          <TopicChipList topics={singles} dense />
        </section>
      ) : null}
    </>
  )
}
