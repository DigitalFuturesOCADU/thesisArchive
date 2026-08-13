import { useEffect, useState } from 'react'
import type { ProjectImagesData } from '../types'

const PROJECT_IMAGES_URL = `${import.meta.env.BASE_URL}data/project-images.json`

export function useProjectImages() {
  const [data, setData] = useState<ProjectImagesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(PROJECT_IMAGES_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as ProjectImagesData
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Could not load project media.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
