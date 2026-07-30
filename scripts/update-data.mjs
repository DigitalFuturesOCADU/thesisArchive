import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const archivePath = path.join(root, 'public', 'data', 'archive.json')
const bibliographyPath = path.join(root, 'public', 'data', 'bibliography.json')

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts', script)], {
      cwd: root,
      stdio: 'inherit',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${script} exited with code ${code}`))
    })
  })
}

async function printSummary() {
  const archive = JSON.parse(await readFile(archivePath, 'utf8'))
  const bibliography = JSON.parse(await readFile(bibliographyPath, 'utf8'))
  const years = archive.years ?? []
  const newest = years[0]?.year
  const oldest = years.at(-1)?.year

  console.log('')
  console.log('── Refresh summary ──────────────────────────')
  console.log(`  Generated:    ${archive.generatedAt}`)
  console.log(`  Source:       ${archive.sourceLabel}`)
  console.log(`  Theses:       ${archive.theses.length}`)
  console.log(`  Advisors:     ${archive.advisors.length}`)
  console.log(`  Topics:       ${archive.topics.length}`)
  console.log(`  Citations:    ${bibliography.citationCount}`)
  console.log(
    `  Years:        ${oldest ?? '—'}–${newest ?? '—'} (${years.length} buckets)`,
  )
  console.log('────────────────────────────────────────────')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Spot-check locally:  npm run dev')
  console.log('  2. If duplicate advisors appear, update data/advisor-aliases.json and re-run npm run normalize')
  console.log('  3. Commit refreshed data:')
  console.log('       git add public/data/archive.json public/data/bibliography.json')
  console.log('       git commit -m "Refresh archive data from Open Research"')
  console.log('       git push')
  console.log('  Pushing main deploys GitHub Pages automatically.')
  console.log('')
}

async function main() {
  console.log('Updating archive data from Open Research…')
  console.log('')
  await run('scrape.mjs')
  console.log('')
  await run('normalize.mjs')
  await printSummary()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
