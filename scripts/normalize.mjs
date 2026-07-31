import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const rawDir = path.join(root, 'data', 'raw')
const outPath = path.join(root, 'public', 'data', 'archive.json')
const bibliographyPath = path.join(root, 'public', 'data', 'bibliography.json')
const projectImagesPath = path.join(root, 'public', 'data', 'project-images.json')
const aliasesPath = path.join(root, 'data', 'advisor-aliases.json')
const committeesPath = path.join(root, 'data', 'advisor-committees.json')
const fieldPolicyPath = path.join(root, 'data', 'field-policy.json')
const sourcesPath = path.join(root, 'data', 'sources.json')
const facultyDirectoryPath = path.join(root, 'data', 'faculty-directory.json')
const facultyOverridesPath = path.join(root, 'data', 'faculty-overrides.json')

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi
const DOI_RE = /(?:doi\.org\/|doi:\s*)(10\.\d{4,}\/[^\s<>"')\]]+)/i
const NOISE_ENTRY =
  /^(bibliography|references|works cited|additional bibliography|retrieved from|university press|notes?|endnotes?)\.?$/i

function isPrimary(role) {
  return role === 'pa'
}

function isExternalExaminerRole(role) {
  return role === 'ea'
}

function roleLabel(role) {
  if (isPrimary(role)) return 'Primary advisor'
  if (isExternalExaminerRole(role)) return 'External examiner'
  return 'Secondary advisor'
}

function buildExternalExaminerIndex(entries = []) {
  const ids = new Set()
  const emails = new Set()
  const names = new Set()
  for (const person of entries) {
    if (person.id) ids.add(person.id)
    for (const email of person.emails ?? []) {
      const e = normalizeEmail(email)
      if (e) emails.add(e)
    }
    for (const alias of [person.name, ...(person.nameAliases ?? [])]) {
      if (alias) names.add(String(alias).toLowerCase().trim())
    }
  }
  return { ids, emails, names }
}

function isForcedExternalExaminer(person, rawName, email, externalIndex) {
  if (!externalIndex) return false
  if (person?.id && externalIndex.ids.has(person.id)) return true
  if (email && externalIndex.emails.has(email)) return true
  if (rawName && externalIndex.names.has(rawName.toLowerCase())) return true
  if (person?.name && externalIndex.names.has(person.name.toLowerCase())) return true
  return false
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

function resolveAdvisor(raw, aliasIndex, dynamicPeople, ignoreIds, externalIndex) {
  const email = normalizeEmail(raw.id)
  const rawName = formatName(raw.name)
  const nameKey = rawName.toLowerCase()

  // Blank deposits (no name, no email) produce junk advisor-* ids — drop them.
  if (!email && !rawName) return null

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
    const id = email ? slugify(emailLocal(email)) : slugify(rawName)
    if (!id || ignoreIds.has(id)) return null
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

  if (ignoreIds.has(person.id)) return null

  const forcedExternal = isForcedExternalExaminer(person, rawName, email, externalIndex)
  const role = forcedExternal ? 'ea' : (raw.type ?? null)

  return {
    role,
    roleLabel: roleLabel(role),
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

function applyCommitteeOverride(advisors, eprintId, committees) {
  const override = committees[String(eprintId)]
  if (!override?.advisors?.length) return advisors

  const byId = new Map(advisors.map((a) => [a.advisorId, a]))
  const next = []
  for (const spec of override.advisors) {
    const existing = byId.get(spec.advisorId)
    if (!existing) {
      console.warn(
        `Committee override for eprint ${eprintId}: advisor ${spec.advisorId} not in deposit`,
      )
      continue
    }
    next.push({
      ...existing,
      role: spec.role,
      roleLabel: roleLabel(spec.role),
    })
  }
  return next
}

function normalizeRecord(
  record,
  sourceMeta,
  aliasIndex,
  dynamicPeople,
  advisorsAcc,
  ignoreIds,
  externalIndex,
  committees,
) {
  const creators = (record.creators ?? []).map((c) => ({
    given: cleanNamePart(c.name?.given),
    family: cleanNamePart(c.name?.family),
  }))
  const creatorNames = creators.map((c) => [c.given, c.family].filter(Boolean).join(' '))

  let advisors = (record.thesis_advisors ?? [])
    .map((a) => resolveAdvisor(a, aliasIndex, dynamicPeople, ignoreIds, externalIndex))
    .filter(Boolean)
    // External examiners are inconsistently deposited — omit from the public archive.
    .filter((a) => !isExternalExaminerRole(a.role))

  advisors = applyCommitteeOverride(advisors, record.eprintid, committees)

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
    // External examiners appear on project pages, but not in the Advisors index.
    if (isExternalExaminerRole(adv.role)) continue

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

function trimUrl(url) {
  return String(url).replace(/[.,;:]+$/g, '')
}

function splitReferenceEntries(raw) {
  const normalized = String(raw).replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) return []

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

  return chunks
}

function extractUrls(text) {
  return [...new Set([...text.matchAll(URL_RE)].map((m) => trimUrl(m[0])))]
}

function stableUrlKey(url) {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    if (!host || host === 'www') return null

    // DOI hosts are handled separately via DOI_RE on the full text.
    if (host.includes('doi.org')) return null

    const pathPart = u.pathname.replace(/\/+$/, '') || ''
    const params = u.searchParams

    // YouTube / Vimeo-style watch URLs need the video id, not just /watch.
    const videoId = params.get('v')
    if (videoId) return `url:${host}${pathPart}?v=${videoId}`

    const docId = params.get('docID') || params.get('docId') || params.get('id')
    if (docId) return `url:${host}${pathPart}?id=${docId}`

    // Generic paths without identifying query params are too weak to merge on.
    if (!pathPart || pathPart === '/') return null
    if (['/watch', '/detail.action', '/url', '/search'].includes(pathPart)) return null

    return `url:${host}${pathPart}`.toLowerCase()
  } catch {
    return null
  }
}

function citationKey(text, urls) {
  const doiMatch = text.match(DOI_RE)
  if (doiMatch) {
    return `doi:${doiMatch[1].replace(/[.,;:]+$/g, '').toLowerCase()}`
  }
  for (const url of urls) {
    const key = stableUrlKey(url)
    if (key) return key
  }
  const bare = text
    .replace(URL_RE, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(retrieved|from|accessed|available|online|http|https|www)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (bare.length < 40 || NOISE_ENTRY.test(bare)) return null
  return `text:${bare.slice(0, 120)}`
}

function buildBibliography(theses) {
  const map = new Map()

  for (const thesis of theses) {
    if (!thesis.references) continue
    for (const text of splitReferenceEntries(thesis.references)) {
      if (NOISE_ENTRY.test(text) || text.length < 24) continue
      const urls = extractUrls(text)
      const key = citationKey(text, urls)
      if (!key) continue

      let entry = map.get(key)
      if (!entry) {
        entry = {
          id: slugify(key).slice(0, 80) || `cite-${map.size + 1}`,
          key,
          text,
          urls,
          projectIds: new Set(),
        }
        map.set(key, entry)
      }
      entry.projectIds.add(thesis.id)
      // Prefer a longer, cleaner display string when merging variants.
      if (text.length > entry.text.length) entry.text = text
      for (const url of urls) {
        if (!entry.urls.includes(url)) entry.urls.push(url)
      }
    }
  }

  // Ensure unique ids
  const used = new Set()
  const citations = [...map.values()]
    .map((c) => {
      let id = c.id
      let n = 2
      while (used.has(id)) {
        id = `${c.id}-${n}`
        n += 1
      }
      used.add(id)
      return {
        id,
        text: c.text,
        urls: c.urls,
        projectIds: [...c.projectIds].sort((a, b) => b - a),
        count: c.projectIds.size,
      }
    })
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))

  return citations
}

function nameKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function loadFacultyDirectory() {
  try {
    const raw = JSON.parse(await readFile(facultyDirectoryPath, 'utf8'))
    const byName = new Map()
    const bySlug = new Map()
    for (const person of raw.people ?? []) {
      if (!person?.url || !person?.name) continue
      byName.set(nameKey(person.name), person)
      if (person.slug) bySlug.set(String(person.slug).toLowerCase(), person)
    }
    return { byName, bySlug }
  } catch {
    console.warn(
      'No data/faculty-directory.json — run npm run fetch:faculty to attach OCAD bio links.',
    )
    return { byName: new Map(), bySlug: new Map() }
  }
}

function isPublicDoc(doc) {
  return !doc.security || doc.security === 'public'
}

function isRasterImageDocument(doc) {
  if (!isPublicDoc(doc)) return false
  const filename = String(doc.filename || '')
  // Skip SVGs and junk deposits (e.g. YouTube URLs saved as image filenames).
  if (/\.svg$/i.test(filename) || /%3[fF]|[?&]sqp=|maxresdefault\.jpg%/i.test(filename)) {
    return false
  }
  const mime = String(doc.mimeType || '').toLowerCase()
  if (mime.startsWith('image/') && !mime.includes('svg')) return true
  return /\.(jpe?g|png|gif|webp|avif)$/i.test(filename)
}

function isRasterImageUrl(url) {
  return /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(String(url || ''))
}

function eprintsThumbnailUrl(downloadUrl, size = 'medium') {
  try {
    const url = new URL(downloadUrl)
    const match = url.pathname.match(/^(\/id\/eprint\/\d+)\/(\d+)\/(.+)$/)
    if (!match) return undefined
    const [, base, pos, filename] = match
    return `${url.origin}${base}/${pos}.has${size}ThumbnailVersion/${filename}`
  } catch {
    return undefined
  }
}

function buildProjectImages(theses) {
  const projects = []
  for (const thesis of theses) {
    const images = []
    for (const doc of thesis.documents ?? []) {
      if (!isRasterImageDocument(doc)) continue
      const entry = {
        filename: doc.filename,
        url: doc.downloadUrl,
        mimeType: doc.mimeType,
        source: 'document',
      }
      // Prefer lightbox thumbs for UI bands — they keep the source aspect ratio.
      // "medium" thumbs are padded to a fixed 200×150 box and look letterboxed.
      const thumb = eprintsThumbnailUrl(doc.downloadUrl, 'lightbox')
      if (thumb) entry.thumbnailUrl = thumb
      images.push(entry)
    }
    for (const related of thesis.relatedUrls ?? []) {
      if (!related?.url || !isRasterImageUrl(related.url)) continue
      images.push({
        filename: related.url.split('/').pop()?.split('?')[0] || related.url,
        url: related.url,
        source: 'related',
        description: related.description,
      })
    }
    if (images.length === 0) continue
    projects.push({
      id: thesis.id,
      title: thesis.title,
      year: thesis.year,
      creatorNames: thesis.creatorNames,
      images,
    })
  }
  return {
    projectCount: projects.length,
    imageCount: projects.reduce((n, p) => n + p.images.length, 0),
    projects,
  }
}

function facultyMatchFor(advisor, facultyDir) {
  const byName = facultyDir.byName.get(nameKey(advisor.name))
  if (byName) return byName
  for (const alias of advisor.aliases ?? []) {
    const hit = facultyDir.byName.get(nameKey(alias))
    if (hit) return hit
  }
  for (const email of advisor.emails ?? []) {
    const local = emailLocal(email)
    if (local && facultyDir.bySlug.has(local)) return facultyDir.bySlug.get(local)
  }
  return undefined
}

async function main() {
  // Touch field policy so normalize stays coupled to the documented contract.
  await readFile(fieldPolicyPath, 'utf8')
  const { sources } = JSON.parse(await readFile(sourcesPath, 'utf8'))
  const aliasesFile = JSON.parse(await readFile(aliasesPath, 'utf8'))
  const committeesFile = JSON.parse(await readFile(committeesPath, 'utf8'))
  const committees = committeesFile.committees ?? {}
  const { canonical } = aliasesFile
  const ignoreIds = new Set(aliasesFile.ignoreIds ?? [])
  const externalIndex = buildExternalExaminerIndex(aliasesFile.externalExaminers ?? [])
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
        ignoreIds,
        externalIndex,
        committees,
      )
      byId.set(thesis.id, thesis)
    }
  }

  const theses = [...byId.values()].sort(
    (a, b) => b.year - a.year || a.title.localeCompare(b.title),
  )

  const facultyDir = await loadFacultyDirectory()
  let facultyOverrides = {}
  try {
    const raw = JSON.parse(await readFile(facultyOverridesPath, 'utf8'))
    facultyOverrides = raw.advisors ?? {}
  } catch {
    // optional
  }

  const advisors = [...advisorsAcc.values()]
    .map((a) => {
      const advisor = {
        id: a.id,
        name: a.name,
        aliases: [...a.aliases].sort(),
        emails: [...a.emails].sort(),
        projectIds: [...a.projectIds].sort((x, y) => y - x),
        primaryCount: a.primaryCount,
        secondaryCount: a.secondaryCount,
      }
      const match = facultyMatchFor(advisor, facultyDir)
      if (match?.url) advisor.facultyBioUrl = match.url
      if (match?.faculty) advisor.ocaduFaculty = match.faculty
      const override = facultyOverrides[advisor.id]
      if (override?.facultyBioUrl) advisor.facultyBioUrl = override.facultyBioUrl
      if (override?.ocaduFaculty) advisor.ocaduFaculty = override.ocaduFaculty
      return advisor
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const withBios = advisors.filter((a) => a.facultyBioUrl).length
  const withFaculty = advisors.filter((a) => a.ocaduFaculty).length
  const overridden = advisors.filter((a) => facultyOverrides[a.id]).length
  console.log(
    `Faculty bio links matched for ${withBios}/${advisors.length} advisors (${withFaculty} with OCAD faculty tag, ${overridden} overrides)`,
  )

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
  const citations = buildBibliography(theses)
  const generatedAt = new Date().toISOString()

  const archive = {
    generatedAt,
    sourceLabel: sources.map((s) => s.label).join(', '),
    theses,
    advisors,
    topics,
    years,
  }

  const bibliography = {
    generatedAt,
    sourceLabel: archive.sourceLabel,
    citationCount: citations.length,
    citations,
  }

  const projectImages = {
    generatedAt,
    sourceLabel: archive.sourceLabel,
    ...buildProjectImages(theses),
  }

  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(archive, null, 2))
  await writeFile(bibliographyPath, JSON.stringify(bibliography, null, 2))
  await writeFile(projectImagesPath, JSON.stringify(projectImages, null, 2))
  console.log(
    `Wrote ${theses.length} theses, ${advisors.length} advisors, ${topics.length} topics, ${citations.length} citations → ${path.relative(root, outPath)} + bibliography.json`,
  )
  console.log(
    `Wrote ${projectImages.imageCount} images across ${projectImages.projectCount} projects → ${path.relative(root, projectImagesPath)}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
