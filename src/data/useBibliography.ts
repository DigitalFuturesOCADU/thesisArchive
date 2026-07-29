import { useEffect, useState } from 'react'
import type { BibliographyData } from '../types'

const BIB_URL = `${import.meta.env.BASE_URL}data/bibliography.json`

export function useBibliography() {
  const [data, setData] = useState<BibliographyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(BIB_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as BibliographyData
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setData(null)
          setError(err instanceof Error ? err.message : 'Failed to load bibliography')
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

  return { data, loading, error }
}
