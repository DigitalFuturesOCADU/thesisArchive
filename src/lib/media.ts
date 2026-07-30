import type { Thesis, ThesisDocument } from '../types'

export type HeroMedia =
  | { kind: 'image'; doc: ThesisDocument }
  | { kind: 'video-file'; doc: ThesisDocument }
  | { kind: 'video-embed'; embedUrl: string; sourceUrl: string }

function isPublic(doc: ThesisDocument): boolean {
  return !doc.security || doc.security === 'public'
}

function isImage(doc: ThesisDocument): boolean {
  return Boolean(doc.mimeType?.startsWith('image/'))
}

function isVideoFile(doc: ThesisDocument): boolean {
  return Boolean(doc.mimeType?.startsWith('video/'))
}

/** Convert YouTube / Vimeo watch URLs to iframe embed URLs. */
export function videoEmbedUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id ? `https://www.youtube.com/embed/${id}` : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname.startsWith('/embed/')) return `https://www.youtube.com${url.pathname}`
    const id = url.searchParams.get('v')
    if (id) return `https://www.youtube.com/embed/${id}`
    const shorts = url.pathname.match(/^\/shorts\/([^/]+)/)
    if (shorts?.[1]) return `https://www.youtube.com/embed/${shorts[1]}`
    return null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p))
    return id ? `https://player.vimeo.com/video/${id}` : null
  }

  return null
}

function firstEmbeddableUrl(urls: Array<string | undefined>): HeroMedia | null {
  for (const raw of urls) {
    if (!raw) continue
    const embedUrl = videoEmbedUrl(raw)
    if (embedUrl) return { kind: 'video-embed', embedUrl, sourceUrl: raw }
  }
  return null
}

function collectCandidateUrls(thesis: Thesis): string[] {
  const urls: string[] = []
  if (thesis.officialUrl) urls.push(thesis.officialUrl)
  for (const r of thesis.relatedUrls) urls.push(r.url)
  return urls
}

/**
 * Prefer the first public image in deposited media.
 * If none, use the first public video file, then a YouTube/Vimeo link.
 */
export function heroMedia(thesis: Thesis): HeroMedia | null {
  const docs = thesis.documents.filter(isPublic)
  const image = docs.find(isImage)
  if (image) return { kind: 'image', doc: image }

  const video = docs.find(isVideoFile)
  if (video) return { kind: 'video-file', doc: video }

  return firstEmbeddableUrl(collectCandidateUrls(thesis))
}

export type ThumbnailSize = 'small' | 'medium' | 'preview' | 'lightbox'

/**
 * Open Research (EPrints) already generates document thumbnails.
 * No local indexing needed — derive from the download URL:
 * `…/id/eprint/{id}/{pos}/{file}` → `…/{pos}.has{size}ThumbnailVersion/{file}`
 */
export function eprintsThumbnailUrl(
  downloadUrl: string,
  size: ThumbnailSize = 'medium',
): string | null {
  try {
    const url = new URL(downloadUrl)
    const match = url.pathname.match(/^(\/id\/eprint\/\d+)\/(\d+)\/(.+)$/)
    if (!match) return null
    const [, base, pos, filename] = match
    return `${url.origin}${base}/${pos}.has${size}ThumbnailVersion/${filename}`
  } catch {
    return null
  }
}

/** YouTube poster image for link tiles. */
export function youtubePosterUrl(raw: string): string | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? null
  else if (host.includes('youtube')) {
    id = url.searchParams.get('v')
    if (!id) id = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ?? null
  }
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null
}

export function isPdfDocument(doc: ThesisDocument): boolean {
  return (
    doc.mimeType === 'application/pdf' ||
    doc.filename.toLowerCase().endsWith('.pdf')
  )
}

/** Prefer the accepted thesis PDF, else the first PDF on the record. */
export function primaryPdf(thesis: Thesis): ThesisDocument | undefined {
  const pdfs = thesis.documents.filter((d) => isPublic(d) && isPdfDocument(d))
  return pdfs.find((d) => d.content === 'accepted') ?? pdfs[0]
}
