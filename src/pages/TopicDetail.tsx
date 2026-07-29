import { Link, useParams } from 'react-router-dom'
import { EmptyState, LoadingState } from '../components/LoadingState'
import { ProjectCard } from '../components/ProjectCard'
import { topicBySlug, useArchive } from '../data/useArchive'
import { sortTheses } from '../lib/filter'

export function TopicDetail() {
  const { slug } = useParams()
  const { data, loading } = useArchive()

  if (loading || !data) return <LoadingState />

  const topic = slug ? topicBySlug(data, slug) : undefined
  if (!topic) return <EmptyState label="Topic not found." />

  const projects = sortTheses(
    data.theses.filter((t) => topic.projectIds.includes(t.id)),
    'year',
  )

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/topics">Topics</Link>
        <span>/</span>
        <span>{topic.label}</span>
      </p>
      <div className="toolbar">
        <h1 className="toolbar__title">
          {topic.label} <span className="toolbar__count">{topic.count}</span>
        </h1>
      </div>
      <div className="card-grid">
        {projects.map((t) => (
          <ProjectCard key={t.id} thesis={t} />
        ))}
      </div>
    </div>
  )
}
