import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outPath = path.join(root, 'data', 'faculty-directory.json')

const BASE = 'https://www.ocadu.ca/academics/explore-faculty'

function decode(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function parseRows(html) {
  const out = []
  const re =
    /simple-card--title"><a href="(\/academics\/explore-faculty\/([^"]+))"[^>]*>([^<]+)<\/a>/g
  let m
  while ((m = re.exec(html))) {
    const slug = decode(m[2]).trim()
    const name = decode(m[3]).trim()
    if (!slug || !name) continue
    out.push({
      name,
      slug,
      url: `${BASE}/${slug}`,
    })
  }
  return out
}

async function fetchPage(page) {
  const url = page === 0 ? BASE : `${BASE}?page=${page}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'thesisArchive-faculty-directory/1.0' },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.text()
}

async function main() {
  const bySlug = new Map()

  for (let page = 0; page < 100; page++) {
    const html = await fetchPage(page)
    const rows = parseRows(html)
    if (rows.length === 0) break
    for (const row of rows) bySlug.set(row.slug, row)
    console.log(`  page ${page}: ${rows.length} (total ${bySlug.size})`)
  }

  const people = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name))
  const payload = {
    fetchedAt: new Date().toISOString(),
    sourceUrl: BASE,
    count: people.length,
    people,
  }

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(payload, null, 2))
  console.log(`Wrote ${people.length} faculty bios → ${path.relative(root, outPath)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
