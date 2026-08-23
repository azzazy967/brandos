import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, Download, Search } from 'lucide-react'
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
  /** Hide this column below the given breakpoint */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl'
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
  /** Rows per page. Defaults to 10. */
  pageSize?: number
}

type SortDir = 'asc' | 'desc' | null

const RESPONSIVE_CLASSES: Record<string, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

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
  pageSize: initialPageSize = 10,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(initialPageSize)

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

  // Reset to first page when search or sort changes
  React.useEffect(() => { setCurrentPage(1) }, [search, sortKey, sortDir])

  const totalRecords = sorted.length
  const showAll = perPage === 0
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(totalRecords / perPage))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedRows = useMemo(() => {
    if (showAll) return sorted
    const start = (safePage - 1) * perPage
    return sorted.slice(start, start + perPage)
  }, [sorted, safePage, perPage, showAll])

  const rangeStart = totalRecords === 0 ? 0 : (safePage - 1) * (showAll ? totalRecords : perPage) + 1
  const rangeEnd = showAll ? totalRecords : Math.min(safePage * perPage, totalRecords)

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
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all duration-200"
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
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 sticky top-0">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap',
                      col.sortable !== false && 'cursor-pointer select-none hover:text-slate-900 dark:hover:text-slate-100',
                      col.hideBelow && RESPONSIVE_CLASSES[col.hideBelow],
                      col.className
                    )}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable !== false && (
                        <span className="text-slate-300 dark:text-slate-600">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {paginatedRows.map((row, idx) => (
                <tr
                  key={'id' in row && row.id != null ? String((row as Record<string, unknown>).id) : idx /* no stable id available, fall back to index */}
                  className={cn(
                    'hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-150',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row)
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-slate-700 dark:text-slate-300', col.hideBelow && RESPONSIVE_CLASSES[col.hideBelow], col.className)}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {totalRecords === 0
                ? '0 records'
                : `Showing ${rangeStart}\u2013${rangeEnd} of ${totalRecords} records`}
              {search && data.length !== totalRecords && ` (filtered from ${data.length})`}
            </span>

            <div className="flex items-center gap-2">
              {/* Page size selector */}
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1) }}
                className="h-7 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 px-1.5 focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
                <option value={0}>All</option>
              </select>

              {/* Previous / Next */}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="min-w-[3.5rem] text-center tabular-nums">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
