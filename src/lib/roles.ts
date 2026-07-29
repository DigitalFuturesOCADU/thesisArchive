import type { AdvisorRole } from '../types'

export function isPrimaryRole(role: AdvisorRole): boolean {
  return role === 'pa'
}

/** All non-primary advisory roles display as secondary. */
export function roleLabel(role: AdvisorRole): string {
  return isPrimaryRole(role) ? 'Primary advisor' : 'Secondary advisor'
}

export function formatPersonName(given?: string | null, family?: string | null): string {
  return [given, family].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseKeywords(raw?: string | null): string[] {
  if (!raw) return []
  return raw
    .split(/[,;/|]/)
    .map((k) => k.trim())
    .filter(Boolean)
}

export function degreeLabel(code?: string): string {
  if (!code) return ''
  const map: Record<string, string> = {
    mdes: 'MDes',
    mfa: 'MFA',
    ma: 'MA',
  }
  return map[code.toLowerCase()] ?? code.toUpperCase()
}
