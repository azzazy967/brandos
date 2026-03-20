import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, exportToCSV } from '@/lib/utils'
import { EmptyState } from './EmptyState'
import { SkeletonTable } from './SkeletonTable'

export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
  exportValue?: (row: T) => string | number
}

interface DataTableProps<T extends object> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  exportFilename?: string
  emptyTitle?: string
  emptyDescription?: string
  className?: string
  rowClassName?: (row: T) => string
  onRowClick?: (row: T) => void
  action?: { label: string; onClick: () => void }
}

type SortDir = 'asc' | 'desc' | null

export function DataTable<T extends object>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  exportFilename,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display.',
  className,
  rowClassName,
  onRowClick,
  action,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(row =>
      columns.some(col => {
        const val = (row as Record<string, unknown>)[col.key]
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      })
    )
  }, [data, search, columns])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey]
      const bv = (b as Record<string, unknown>)[sortKey]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const handleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return }
    if (sortDir === 'asc') { setSortDir('desc'); return }
    setSortKey(null); setSortDir(null)
  }

  const handleExport = () => {
    if (!exportFilename) return
    const exportData = sorted.map(row =>
      Object.fromEntries(
        columns.map(col => [
          col.header,
          col.exportValue ? col.exportValue(row) : ((row as Record<string, unknown>)[col.key] ?? ''),
        ])
      )
    )
    exportToCSV(exportData, exportFilename)
  }

  if (loading) return <SkeletonTable rows={6} cols={columns.length} />

  return (
    <div className={cn('space-y-3', className)}>
      {(searchable || exportFilename) && (
        <div className="flex items-center justify-between gap-3">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all duration-200"
              />
            </div>
          )}
          {exportFilename && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download size={14} />
              Export CSV
            </Button>
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={action} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left font-semibold text-slate-600 whitespace-nowrap',
                      col.sortable !== false && 'cursor-pointer select-none hover:text-slate-900',
                      col.className
                    )}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable !== false && (
                        <span className="text-slate-300">
                          {sortKey === col.key && sortDir === 'asc' ? (
                            <ChevronUp size={14} className="text-[#2563EB]" />
                          ) : sortKey === col.key && sortDir === 'desc' ? (
                            <ChevronDown size={14} className="text-[#2563EB]" />
                          ) : (
                            <ChevronsUpDown size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    'hover:bg-slate-50 transition-colors duration-150',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row)
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-slate-700', col.className)}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
            {sorted.length} {sorted.length === 1 ? 'record' : 'records'}
            {search && data.length !== sorted.length && ` (filtered from ${data.length})`}
          </div>
        </div>
      )}
    </div>
  )
}
