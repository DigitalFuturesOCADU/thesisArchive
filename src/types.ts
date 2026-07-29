export type AdvisorRole = 'pa' | 'cm' | 'sr' | 'ia' | 'ea' | 'pd' | string | null

export interface PersonName {
  given: string
  family: string
}

export interface ThesisAdvisor {
  role: AdvisorRole
  roleLabel: string
  advisorId: string
  name: string
  rawName?: string
  email?: string | null
}

export interface ThesisDocument {
  filename: string
  mimeType?: string
  downloadUrl: string
  documentUri?: string
  security?: string
  content?: string
}

export interface RelatedUrl {
  url: string
  type?: string
  description?: string
}

export interface Thesis {
  id: number
  uri: string
  title: string
  abstract?: string
  keywords: string[]
  date?: string
  year: number
  season?: string
  department: string
  divisions: string[]
  thesisType?: string
  degreeName?: string
  creators: PersonName[]
  creatorNames: string[]
  advisors: ThesisAdvisor[]
  documents: ThesisDocument[]
  relatedUrls: RelatedUrl[]
  officialUrl?: string
  defenceDate?: string
  references?: string
}

export interface Advisor {
  id: string
  name: string
  aliases: string[]
  emails: string[]
  projectIds: number[]
  primaryCount: number
  secondaryCount: number
}

export interface Topic {
  slug: string
  label: string
  count: number
  projectIds: number[]
}

export interface YearBucket {
  year: number
  count: number
  projectIds: number[]
}

export interface Citation {
  id: string
  text: string
  urls: string[]
  projectIds: number[]
  count: number
}

export interface BibliographyData {
  generatedAt: string
  sourceLabel: string
  citationCount: number
  citations: Citation[]
}

export interface ArchiveData {
  generatedAt: string
  sourceLabel: string
  theses: Thesis[]
  advisors: Advisor[]
  topics: Topic[]
  years: YearBucket[]
}
