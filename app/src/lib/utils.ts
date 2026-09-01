import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export function formatQty(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 3 })
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function monthName(m: number): string {
  return MONTHS[m - 1] ?? String(m)
}

/** ISO date (yyyy-mm-dd) → "21 Jun 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`
}

export function formatDateTime(iso: string): string {
  const dt = new Date(iso)
  const time = dt.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
  return `${formatDate(iso.slice(0, 10))}, ${time}`
}

/**
 * Local calendar date, NOT `toISOString().slice(0,10)` — that returns the UTC
 * date, which is yesterday for any positive-offset zone (IST included) in the
 * early hours.
 */
export function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function isToday(iso: string): boolean {
  return iso.slice(0, 10) === todayISO()
}

/**
 * Shift an ISO date by n days.
 *
 * Anchored at UTC noon so the arithmetic stays inside the same calendar day in
 * every timezone and across DST — parsing at local midnight and formatting back
 * as UTC silently shifts the date by one.
 */
export function addDays(iso: string, n: number): string {
  const dt = new Date(iso + 'T12:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}
