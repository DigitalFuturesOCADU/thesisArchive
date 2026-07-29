import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const rawDir = path.join(root, 'data', 'raw')
const outPath = path.join(root, 'public', 'data', 'archive.json')
const aliasesPath = path.join(root, 'data', 'advisor-aliases.json')
const fieldPolicyPath = path.join(root, 'data', 'field-policy.json')
const sourcesPath = path.join(root, 'data', 'sources.json')

function isPrimary(role) {
  return role === 'pa'
}

/** All non-primary advisory roles display as secondary. */
function roleLabel(role) {
  return isPrimary(role) ? 'Primary advisor' : 'Secondary advisor'
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function cleanNamePart(value) {
  if (!value) return ''
  return String(value)
    .replace(/\bDr\.?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatName(name) {
  if (!name) return ''
  const given = cleanNamePart(name.given)
  const family = cleanNamePart(name.family)
  let full = [given, family].filter(Boolean).join(' ').trim()
  // Collapse duplicated full names: "Alexis Morris Alexis Morris"
  const parts = full.split(/\s+/)
  if (parts.length >= 4 && parts.length % 2 === 0) {
    const half = parts.length / 2
    const a = parts.slice(0, half).join(' ')
    const b = parts.slice(half).join(' ')
    if (a.toLowerCase() === b.toLowerCase()) full = a
  }
  return full
}

function parseKeywords(raw) {
  if (!raw) return []
  return String(raw)
    .split(/[,;/|]/)
    .map((k) => k.trim())
    .filter(Boolean)
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null
  const cleaned = email.trim().toLowerCase()
  if (!cleaned.includes('@')) return null
  return cleaned
}

function emailLocal(email) {
  const e = normalizeEmail(email)
  if (!e) return null
  return e.split('@')[0]
}

function buildAliasIndex(canonical) {
  const byEmail = new Map()
  const byName = new Map()
  const byLocal = new Map()

  for (const person of canonical) {
    for (const email of person.emails ?? []) {
      const e = normalizeEmail(email)
      if (e) {
        byEmail.set(e, person)
        const local = emailLocal(e)
        if (local) byLocal.set(local, person)
      }
    }
    for (const alias of person.nameAliases ?? []) {
      byName.set(alias.toLowerCase().trim(), person)
    }
    byName.set(person.name.toLowerCase().trim(), person)
  }

  return { byEmail, byName, byLocal }
}

function resolveAdvisor(raw, aliasIndex, dynamicPeople) {
  const email = normalizeEmail(raw.id)
  const rawName = formatName(raw.name)
  const nameKey = rawName.toLowerCase()

  let person =
    (email && aliasIndex.byEmail.get(email)) ||
    (email && aliasIndex.byLocal.get(emailLocal(email))) ||
    (nameKey && aliasIndex.byName.get(nameKey)) ||
    null

  if (!person && email) {
    const local = emailLocal(email)
    person = dynamicPeople.get(`local:${local}`) ?? null
  }
  if (!person && nameKey) {
    person = dynamicPeople.get(`name:${nameKey}`) ?? null
  }

  if (!person) {
    const id = email
      ? slugify(emailLocal(email))
      : slugify(rawName) || `advisor-${Math.random().toString(36).slice(2, 8)}`
    person = {
      id,
      name: rawName || id,
      emails: email ? [email] : [],
      nameAliases: [],
      _dynamic: true,
    }
    if (email) dynamicPeople.set(`local:${emailLocal(email)}`, person)
    if (nameKey) dynamicPeople.set(`name:${nameKey}`, person)
    aliasIndex.byName.set(nameKey, person)
    if (email) {
      aliasIndex.byEmail.set(email, person)
      aliasIndex.byLocal.set(emailLocal(email), person)
    }
  }

  return {
    role: raw.type ?? null,
    roleLabel: roleLabel(raw.type ?? null),
    advisorId: person.id,
    name: person.name,
    rawName: rawName || undefined,
    email,
  }
}

function documentLinks(record) {
  const docs = []
  const documents = record.documents ?? []
  for (const doc of documents) {
    const files = doc.files ?? []
    const filename = doc.main || files[0]?.filename
    if (!filename) continue
    const pos = doc.pos ?? doc.placement ?? 1
    const downloadUrl = `${record.uri}/${pos}/${encodeURIComponent(filename).replace(/%2F/g, '/')}`
    docs.push({
      filename,
      mimeType: doc.mime_type || files[0]?.mime_type,
      downloadUrl,
      documentUri: doc.uri,
      security: doc.security,
      content: doc.content,
    })
  }
  return docs
}

function relatedUrls(record) {
  const urls = []
  if (record.official_url) {
    urls.push({ url: record.official_url, type: 'official' })
  }
  for (const item of record.related_url ?? []) {
    if (item?.url) {
      urls.push({
        url: item.url,
        type: item.type,
        description: item.description,
      })
    }
  }
  return urls
}

function normalizeRecord(record, sourceMeta, aliasIndex, dynamicPeople, advisorsAcc) {
  const creators = (record.creators ?? []).map((c) => ({
    given: cleanNamePart(c.name?.given),
    family: cleanNamePart(c.name?.family),
  }))
  const creatorNames = creators.map((c) => [c.given, c.family].filter(Boolean).join(' '))

  const advisors = (record.thesis_advisors ?? []).map((a) =>
    resolveAdvisor(a, aliasIndex, dynamicPeople),
  )

  const year =
    record.convocation_date?.year ??
    (record.date ? Number(String(record.date).slice(0, 4)) : sourceMeta.year)

  const thesis = {
    id: record.eprintid,
    uri: record.uri,
    title: (record.title ?? '').replace(/\s+/g, ' ').trim(),
    abstract: record.abstract ? String(record.abstract).trim() : undefined,
    keywords: parseKeywords(record.keywords),
    date: record.date,
    year,
    season: record.convocation_date?.season,
    department: record.department ?? sourceMeta.sourceLabel,
    divisions: record.divisions ?? [sourceMeta.division].filter(Boolean),
    thesisType: record.thesis_type,
    degreeName: record.thesis_degree_name,
    creators,
    creatorNames,
    advisors,
    documents: documentLinks(record),
    relatedUrls: relatedUrls(record).filter((u) => u.type !== 'official'),
    officialUrl: record.official_url,
    defenceDate: record.thesis_defence_date,
    references: record.referencetext ? String(record.referencetext).trim() : undefined,
  }

  for (const adv of advisors) {
    let entry = advisorsAcc.get(adv.advisorId)
    if (!entry) {
      entry = {
        id: adv.advisorId,
        name: adv.name,
        aliases: new Set(),
        emails: new Set(),
        projectIds: new Set(),
        primaryCount: 0,
        secondaryCount: 0,
      }
      advisorsAcc.set(adv.advisorId, entry)
    }
    entry.projectIds.add(thesis.id)
    if (adv.rawName && adv.rawName !== entry.name) entry.aliases.add(adv.rawName)
    if (adv.email) entry.emails.add(adv.email)
    if (isPrimary(adv.role)) entry.primaryCount += 1
    else entry.secondaryCount += 1
  }

  return thesis
}

async function main() {
  // Touch field policy so normalize stays coupled to the documented contract.
  await readFile(fieldPolicyPath, 'utf8')
  const { sources } = JSON.parse(await readFile(sourcesPath, 'utf8'))
  const { canonical } = JSON.parse(await readFile(aliasesPath, 'utf8'))
  const aliasIndex = buildAliasIndex(canonical)
  const dynamicPeople = new Map()
  const advisorsAcc = new Map()

  const files = (await readdir(rawDir)).filter((f) => f.endsWith('.json')).sort()
  if (files.length === 0) {
    throw new Error('No raw files in data/raw/. Run npm run scrape first.')
  }

  const byId = new Map()

  for (const file of files) {
    const payload = JSON.parse(await readFile(path.join(rawDir, file), 'utf8'))
    const sourceMeta = {
      sourceId: payload.sourceId,
      sourceLabel: payload.sourceLabel,
      division: payload.division,
      year: payload.year,
    }
    for (const record of payload.records ?? []) {
      if (!record?.eprintid) continue
      const thesis = normalizeRecord(
        record,
        sourceMeta,
        aliasIndex,
        dynamicPeople,
        advisorsAcc,
      )
      byId.set(thesis.id, thesis)
    }
  }

  const theses = [...byId.values()].sort(
    (a, b) => b.year - a.year || a.title.localeCompare(b.title),
  )

  const advisors = [...advisorsAcc.values()]
    .map((a) => ({
      id: a.id,
      name: a.name,
      aliases: [...a.aliases].sort(),
      emails: [...a.emails].sort(),
      projectIds: [...a.projectIds].sort((x, y) => y - x),
      primaryCount: a.primaryCount,
      secondaryCount: a.secondaryCount,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const topicMap = new Map()
  for (const t of theses) {
    for (const keyword of t.keywords) {
      const slug = slugify(keyword)
      if (!slug) continue
      let topic = topicMap.get(slug)
      if (!topic) {
        topic = { slug, label: keyword, count: 0, projectIds: new Set() }
        topicMap.set(slug, topic)
      }
      topic.projectIds.add(t.id)
      topic.count = topic.projectIds.size
    }
  }
  const topics = [...topicMap.values()]
    .map((t) => ({
      slug: t.slug,
      label: t.label,
      count: t.count,
      projectIds: [...t.projectIds].sort((a, b) => b - a),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  const yearMap = new Map()
  for (const t of theses) {
    let y = yearMap.get(t.year)
    if (!y) {
      y = { year: t.year, count: 0, projectIds: [] }
      yearMap.set(t.year, y)
    }
    y.projectIds.push(t.id)
    y.count += 1
  }
  const years = [...yearMap.values()].sort((a, b) => b.year - a.year)

  const archive = {
    generatedAt: new Date().toISOString(),
    sourceLabel: sources.map((s) => s.label).join(', '),
    theses,
    advisors,
    topics,
    years,
  }

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(archive, null, 2))
  console.log(
    `Wrote ${theses.length} theses, ${advisors.length} advisors, ${topics.length} topics → ${path.relative(root, outPath)}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
