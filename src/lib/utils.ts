import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function currency(value: number | string | null | undefined, currencyCode = 'INR') {
  const code = (currencyCode || 'INR').trim().toUpperCase() || 'INR'
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0))
  } catch {
    return `${code} ${amount(value)}`
  }
}

/** Quantity: whole numbers without decimals; otherwise up to 2 decimals. */
export function quantity(value: number | string | null | undefined) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0'
  if (Number.isInteger(n)) return String(n)
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)
}

/** Rate / amount without currency symbol — always 2 decimals. */
export function amount(value: number | string | null | undefined) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(value ?? 0),
  )
}

export function date(value: string | Date) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

export { customerLabel, supplierLabel, partyParts } from '@/lib/party-label'
export type { PartyLike } from '@/lib/party-label'
