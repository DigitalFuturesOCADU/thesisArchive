import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const sourcesPath = path.join(root, 'data', 'sources.json')
const rawDir = path.join(root, 'data', 'raw')

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`)
  }
  return res.json()
}

async function main() {
  const { sources } = JSON.parse(await readFile(sourcesPath, 'utf8'))
  await mkdir(rawDir, { recursive: true })

  const currentYear = new Date().getFullYear()
  let total = 0

  for (const source of sources) {
    const start = source.yearStart ?? 2013
    const end = source.yearEnd ?? currentYear
    console.log(`Scraping ${source.label} (${start}–${end})…`)

    for (let year = start; year <= end; year++) {
      const url = source.exportUrlTemplate.replaceAll('{year}', String(year))
      try {
        const data = await fetchJson(url)
        if (!Array.isArray(data)) {
          console.warn(`  ${year}: unexpected payload, skipping`)
          continue
        }
        const out = path.join(rawDir, `${source.id}-${year}.json`)
        await writeFile(
          out,
          JSON.stringify(
            {
              sourceId: source.id,
              sourceLabel: source.label,
              division: source.division,
              year,
              fetchedAt: new Date().toISOString(),
              records: data,
            },
            null,
            2,
          ),
        )
        total += data.length
        console.log(`  ${year}: ${data.length} records → ${path.relative(root, out)}`)
      } catch (err) {
        console.warn(`  ${year}: ${err.message}`)
      }
    }
  }

  console.log(`Done. ${total} records written under data/raw/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
