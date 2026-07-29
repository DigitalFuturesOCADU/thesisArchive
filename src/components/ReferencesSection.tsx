import { useMemo, useState } from 'react'
import { linkifyReference, parseReferences } from '../lib/references'

const PREVIEW_COUNT = 8

export function ReferencesSection({ references }: { references: string }) {
  const entries = useMemo(() => parseReferences(references), [references])
  const [expanded, setExpanded] = useState(false)

  if (entries.length === 0) return null

  const visible = expanded ? entries : entries.slice(0, PREVIEW_COUNT)
  const hidden = Math.max(0, entries.length - PREVIEW_COUNT)

  return (
    <section className="section references-section" id="references">
      <header className="references-section__head">
        <h2>References</h2>
        <p className="lede references-section__lede">
          Sources and related reading deposited with this thesis — useful for finding prior work,
          methods, and adjacent projects.
        </p>
        <p className="muted references-section__count">
          {entries.length} source{entries.length === 1 ? '' : 's'}
        </p>
      </header>

      <ol className="reference-list">
        {visible.map((entry, i) => (
          <li key={`${i}-${entry.text.slice(0, 24)}`} className="reference-list__item">
            <p>
              {linkifyReference(entry.text).map((part, j) =>
                typeof part === 'string' ? (
                  <span key={j}>{part}</span>
                ) : (
                  <a key={j} href={part.href} target="_blank" rel="noreferrer">
                    {shortenUrl(part.label)}
                  </a>
                ),
              )}
            </p>
            {entry.urls.length > 0 ? (
              <ul className="reference-list__links">
                {entry.urls.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      Open link
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>

      {hidden > 0 ? (
        <button
          type="button"
          className="text-button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Show fewer references' : `Show all ${entries.length} references`}
        </button>
      ) : null}
    </section>
  )
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '' : u.pathname
    const display = `${u.hostname}${path}`
    return display.length > 48 ? `${display.slice(0, 45)}…` : display
  } catch {
    return url.length > 48 ? `${url.slice(0, 45)}…` : url
  }
}
