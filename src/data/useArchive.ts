import { useEffect, useState } from 'react'
import type { ArchiveData } from '../types'
import { fixtureArchive } from './fixtures'

const ARCHIVE_URL = `${import.meta.env.BASE_URL}data/archive.json`

export function useArchive() {
  const [data, setData] = useState<ArchiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingFixture, setUsingFixture] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(ARCHIVE_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as ArchiveData
        if (!cancelled) {
          setData(json)
          setUsingFixture(false)
          setError(null)
        }
      } catch {
        if (!cancelled) {
          setData(fixtureArchive)
          setUsingFixture(true)
          setError(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error, usingFixture }
}

export function thesisById(data: ArchiveData, id: number) {
  return data.theses.find((t) => t.id === id)
}

export function advisorById(data: ArchiveData, id: string) {
  return data.advisors.find((a) => a.id === id)
}

export function topicBySlug(data: ArchiveData, slug: string) {
  return data.topics.find((t) => t.slug === slug)
}

export function yearBucket(data: ArchiveData, year: number) {
  return data.years.find((y) => y.year === year)
}
