import { useState } from 'react'
import type { RelatedUrl, Thesis, ThesisDocument } from '../types'
import {
  eprintsThumbnailUrl,
  isPdfDocument,
  primaryPdf,
  videoEmbedUrl,
  youtubePosterUrl,
} from '../lib/media'

type TileKind =
  | 'pdf'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'file'
  | 'link'
  | 'youtube'

interface DocTile {
  key: string
  href: string
  label: string
  kind: TileKind
  thumbUrl?: string | null
  featured?: boolean
  badge?: string
}

function kindForDocument(doc: ThesisDocument): TileKind {
  const mime = doc.mimeType ?? ''
  if (isPdfDocument(doc)) return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (
    mime.includes('zip') ||
    mime.includes('octet-stream') ||
    /\.(zip|apk|rar|7z)$/i.test(doc.filename)
  ) {
    return 'archive'
  }
  return 'file'
}

function kindForUrl(url: string): TileKind {
  return videoEmbedUrl(url)?.includes('youtube') ? 'youtube' : 'link'
}

function shortLabel(label: string, max = 36): string {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}

function linkLabel(item: RelatedUrl): string {
  if (item.description?.trim()) return item.description.trim()
  try {
    return new URL(item.url).hostname.replace(/^www\./, '')
  } catch {
    return item.url
  }
}

function buildTiles(thesis: Thesis): { pdf: DocTile | null; rest: DocTile[] } {
  const thesisPdf = primaryPdf(thesis)
  const pdf: DocTile | null = thesisPdf
    ? {
        key: `pdf-${thesisPdf.downloadUrl}`,
        href: thesisPdf.downloadUrl,
        label: thesisPdf.filename,
        kind: 'pdf',
        thumbUrl: eprintsThumbnailUrl(thesisPdf.downloadUrl, 'preview'),
        featured: true,
        badge: 'PDF',
      }
    : null

  const rest: DocTile[] = []

  if (thesis.officialUrl) {
    rest.push({
      key: `official-${thesis.officialUrl}`,
      href: thesis.officialUrl,
      label: 'Official URL',
      kind: kindForUrl(thesis.officialUrl),
      thumbUrl: youtubePosterUrl(thesis.officialUrl),
      badge: 'Link',
    })
  }

  for (const r of thesis.relatedUrls) {
    rest.push({
      key: `related-${r.url}`,
      href: r.url,
      label: linkLabel(r),
      kind: kindForUrl(r.url),
      thumbUrl: youtubePosterUrl(r.url),
      badge: r.type === 'author' ? 'Author' : 'Link',
    })
  }

  for (const doc of thesis.documents) {
    if (thesisPdf && doc.downloadUrl === thesisPdf.downloadUrl) continue
    const kind = kindForDocument(doc)
    rest.push({
      key: doc.downloadUrl,
      href: doc.downloadUrl,
      label: doc.filename,
      kind,
      thumbUrl: eprintsThumbnailUrl(doc.downloadUrl, 'preview'),
      badge:
        kind === 'pdf' ? 'PDF' : kind === 'image' ? 'Image' : kind === 'video' ? 'Video' : undefined,
    })
  }

  return { pdf, rest }
}

function TypeGlyph({ kind }: { kind: TileKind }) {
  return (
    <span className={`doc-tile__glyph doc-tile__glyph--${kind}`} aria-hidden="true">
      {kind === 'pdf' ? 'PDF' : null}
      {kind === 'image' ? 'IMG' : null}
      {kind === 'video' ? 'VID' : null}
      {kind === 'audio' ? 'AUD' : null}
      {kind === 'archive' ? 'ZIP' : null}
      {kind === 'file' ? 'FILE' : null}
      {kind === 'link' ? 'URL' : null}
      {kind === 'youtube' ? 'YT' : null}
    </span>
  )
}

function DocTileCard({ tile }: { tile: DocTile }) {
  const [thumbFailed, setThumbFailed] = useState(false)
  const showThumb = Boolean(tile.thumbUrl) && !thumbFailed

  return (
    <a
      className={`doc-tile${tile.featured ? ' doc-tile--featured' : ''}`}
      href={tile.href}
      target="_blank"
      rel="noreferrer"
      title={tile.label}
    >
      <span className="doc-tile__media">
        {showThumb ? (
          <img
            src={tile.thumbUrl!}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <TypeGlyph kind={tile.kind} />
        )}
        {tile.badge ? <span className="doc-tile__badge">{tile.badge}</span> : null}
      </span>
      <span className="doc-tile__label">{shortLabel(tile.label)}</span>
    </a>
  )
}

export function DocumentsGrid({ thesis }: { thesis: Thesis }) {
  const { pdf, rest } = buildTiles(thesis)

  return (
    <section className="section">
      <h2>Documents &amp; links</h2>
      <p className="doc-record-link">
        <a href={thesis.uri} target="_blank" rel="noreferrer">
          Open Research record
        </a>
      </p>
      {pdf ? (
        <div className="doc-tile-row doc-tile-row--featured">
          <DocTileCard tile={pdf} />
        </div>
      ) : null}
      {rest.length > 0 ? (
        <div className="doc-tile-grid">
          {rest.map((tile) => (
            <DocTileCard key={tile.key} tile={tile} />
          ))}
        </div>
      ) : null}
    </section>
  )
}


