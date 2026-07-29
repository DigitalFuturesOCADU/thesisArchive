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

/** Sort key by family name (last token), then full name. */
export function lastNameSortKey(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const last = parts[parts.length - 1] ?? ''
  const rest = parts.slice(0, -1).join(' ')
  return `${last.toLowerCase()}\u0000${rest.toLowerCase()}`
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
