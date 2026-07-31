import { appendFile, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const paths = ['public/data/archive.json', 'public/data/bibliography.json']
const GIT_MAX_BUFFER = 64 * 1024 * 1024

function stripGeneratedAt(json) {
  const { generatedAt: _ignored, ...rest } = json
  return JSON.stringify(rest)
}

function readGitHead(relPath) {
  try {
    return execFileSync('git', ['show', `HEAD:${relPath}`], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: GIT_MAX_BUFFER,
    })
  } catch {
    return null
  }
}

async function main() {
  let changed = false

  for (const rel of paths) {
    const abs = path.join(root, rel)
    const nextRaw = await readFile(abs, 'utf8')
    const next = JSON.parse(nextRaw)
    const prevRaw = readGitHead(rel)

    if (!prevRaw) {
      changed = true
      continue
    }

    const prev = JSON.parse(prevRaw)
    if (stripGeneratedAt(next) !== stripGeneratedAt(prev)) {
      changed = true
    } else {
      // Timestamp-only churn — restore committed file so git stays clean.
      execFileSync('git', ['checkout', 'HEAD', '--', rel], { cwd: root })
    }
  }

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`)
  }

  console.log(changed ? 'Meaningful data changes detected.' : 'No meaningful data changes.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
