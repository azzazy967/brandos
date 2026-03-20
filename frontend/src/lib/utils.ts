import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EGP'): string {
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-EG').format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value ?? 0).toFixed(decimals)}%`
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(d)
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    healthy: 'text-green-600',
    good: 'text-green-600',
    active: 'text-green-600',
    delivered: 'text-green-600',
    collected: 'text-green-600',
    connected: 'text-green-600',
    closed: 'text-slate-500',
    warning: 'text-amber-600',
    low: 'text-amber-600',
    pending: 'text-amber-600',
    in_transit: 'text-blue-600',
    critical: 'text-red-600',
    out_of_stock: 'text-red-600',
    failed: 'text-red-600',
    overdue: 'text-red-600',
    dead_stock: 'text-slate-500',
    disconnected: 'text-slate-500',
    error: 'text-red-600',
  }
  return map[status.toLowerCase()] ?? 'text-slate-600'
}

export function getDeltaColor(delta: number): string {
  if (delta > 0) return 'text-green-600'
  if (delta < 0) return 'text-red-600'
  return 'text-slate-500'
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h]
      const str = val === null || val === undefined ? '' : String(val)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
