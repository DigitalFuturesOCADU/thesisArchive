const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/gi

export interface ReferenceEntry {
  text: string
  urls: string[]
}

/** Split deposited referencetext into readable entries. */
export function parseReferences(raw: string): ReferenceEntry[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) return []

  // Prefer blank-line separated blocks; fall back to single newlines when dense.
  let chunks = normalized
    .split(/\n\s*\n+/)
    .map((c) => c.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  if (chunks.length <= 1) {
    chunks = normalized
      .split(/\n+/)
      .map((c) => c.replace(/\s+/g, ' ').trim())
      .filter((c) => c.length > 12)
  }

  return chunks.map((text) => {
    const urls = [...text.matchAll(URL_RE)].map((m) => trimTrailingPunct(m[1]))
    return { text, urls: [...new Set(urls)] }
  })
}

function trimTrailingPunct(url: string): string {
  return url.replace(/[.,;:]+$/g, '')
}

export function linkifyReference(text: string): Array<string | { href: string; label: string }> {
  const parts: Array<string | { href: string; label: string }> = []
  let last = 0
  for (const match of text.matchAll(URL_RE)) {
    const url = trimTrailingPunct(match[0])
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    parts.push({ href: url, label: url })
    last = index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : [text]
}
