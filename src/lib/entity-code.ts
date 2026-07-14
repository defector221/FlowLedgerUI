const SALT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function salt(length = 4) {
  let out = ''
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  for (let i = 0; i < length; i += 1) {
    out += SALT_ALPHABET[bytes[i]! % SALT_ALPHABET.length]
  }
  return out
}

/** Matches backend EntityCodeGenerator slugify behavior closely. */
export function slugifyName(name: string) {
  const normalized = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
  if (!normalized) return 'ITEM'
  const parts = normalized.split('-').filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 12)
  const out: string[] = []
  for (const part of parts) {
    out.push(part.slice(0, 6))
    if (out.length >= 2 || out.join('-').length >= 12) break
  }
  return out.join('-').slice(0, 12)
}

export function generateEntityCode(name: string, prefix?: string) {
  const slug = slugifyName(name || 'ITEM')
  const base = prefix ? `${prefix}-${slug}` : slug
  return `${base}-${salt(4)}`
}
