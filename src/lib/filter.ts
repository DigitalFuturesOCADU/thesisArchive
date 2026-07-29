import type { Thesis } from '../types'

export interface ProjectFilters {
  q?: string
  year?: string
  degree?: string
  advisor?: string
  topic?: string
}

export function filterTheses(theses: Thesis[], filters: ProjectFilters): Thesis[] {
  const q = filters.q?.trim().toLowerCase()
  return theses.filter((t) => {
    if (filters.year && String(t.year) !== filters.year) return false
    if (filters.degree && (t.degreeName ?? '').toLowerCase() !== filters.degree.toLowerCase()) {
      return false
    }
    if (filters.advisor && !t.advisors.some((a) => a.advisorId === filters.advisor)) {
      return false
    }
    if (filters.topic) {
      const needle = filters.topic.toLowerCase()
      const hit = t.keywords.some(
        (k) => k.toLowerCase() === needle || slugMatch(k) === needle,
      )
      if (!hit) return false
    }
    if (!q) return true
    const hay = [
      t.title,
      t.abstract ?? '',
      ...t.creatorNames,
      ...t.keywords,
      ...t.advisors.map((a) => a.name),
      t.degreeName ?? '',
      String(t.year),
    ]
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
}

function slugMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function sortTheses(theses: Thesis[], sort: string): Thesis[] {
  const copy = [...theses]
  switch (sort) {
    case 'title':
      return copy.sort((a, b) => a.title.localeCompare(b.title))
    case 'student':
      return copy.sort((a, b) =>
        (a.creatorNames[0] ?? '').localeCompare(b.creatorNames[0] ?? ''),
      )
    case 'year-asc':
      return copy.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title))
    case 'year':
    default:
      return copy.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title))
  }
}
