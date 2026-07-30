import { LoadingState } from '../components/LoadingState'
import { TopicBrowseSections } from '../components/TopicBrowseSections'
import { useArchive } from '../data/useArchive'

export function Topics() {
  const { data, loading } = useArchive()
  if (loading || !data) return <LoadingState />

  return (
    <div className="page">
      <div className="toolbar">
        <h1 className="toolbar__title">
          Topics <span className="toolbar__count">{data.topics.length}</span>
        </h1>
      </div>
      <TopicBrowseSections topics={data.topics} topLimit={0} showAllLink={false} />
    </div>
  )
}
