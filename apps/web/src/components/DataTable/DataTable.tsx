'use client'

import { useState, useMemo, ReactNode } from 'react'
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react'
// === TYPES ===
export interface DataTableColumn<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string | number
  minWidth?: string | number
  render?: (value: any, row: T, index: number) => ReactNode
  className?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  isLoading?: boolean
  density?: 'compact' | 'cozy' | 'comfortable'
  onRowClick?: (row: T, index: number) => void
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  onFilter?: (query: string) => void
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  rowKey?: keyof T | ((row: T, index: number) => string | number)
  selectable?: boolean
  selectedRows?: T[]
  onSelectionChange?: (selectedRows: T[]) => void
}

type SortField = string
type SortDirection = 'asc' | 'desc'

// === UTILITY FUNCTIONS ===
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// === COMPONENTS ===
function SortButton({ 
  field, 
  children, 
  sortField, 
  sortDirection, 
  onSort 
}: {
  field: string
  children: ReactNode
  sortField: SortField | null
  sortDirection: SortDirection
  onSort: (field: string) => void
}) {
  const isActive = sortField === field
  const isAsc = isActive && sortDirection === 'asc'
  const isDesc = isActive && sortDirection === 'desc'

  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'group flex items-center gap-1 font-medium text-xs uppercase tracking-wider transition-colors',
        'hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:ring-offset-1',
        isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
      )}
      aria-label={`Sort by ${field} ${isActive ? (isAsc ? 'ascending' : isDesc ? 'descending' : 'none') : 'none'}`}
    >
      {children}
      <div className="flex flex-col">
        <ChevronUp 
          className={cn(
            'h-3 w-3 transition-colors',
            isAsc ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-quaternary)] group-hover:text-[var(--color-text-tertiary)]'
          )} 
        />
        <ChevronDown 
          className={cn(
            'h-3 w-3 -mt-1 transition-colors',
            isDesc ? 'text-[var(--color-accent-primary)]' : 'text-[var(--color-text-quaternary)] group-hover:text-[var(--color-text-tertiary)]'
          )} 
        />
      </div>
    </button>
  )
}

function SkeletonRow({ columns }: { columns: DataTableColumn<any>[] }) {
  return (
    <tr className="border-b border-[var(--color-border-primary)]">
      {columns.map((column, index) => (
        <td
          key={index}
          className={cn(
            'px-[var(--cell-padding-x)] py-[var(--cell-padding-y)]',
            column.align === 'center' && 'text-center',
            column.align === 'right' && 'text-right',
            column.className
          )}
        >
          <div className="h-4 bg-[var(--color-bg-tertiary)] rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

function EmptyState({ message, columns }: { message: string; columns: DataTableColumn<any>[] }) {
  return (
    <tr>
      <td colSpan={columns.length} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] flex items-center justify-center">
            <Filter className="w-6 h-6 text-[var(--color-text-quaternary)]" />
          </div>
          <div className="text-[var(--color-text-secondary)] font-medium">{message}</div>
        </div>
      </td>
    </tr>
  )
}

// === MAIN COMPONENT ===
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  density = 'cozy',
  onRowClick,
  onSort,
  onFilter,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data available',
  className,
  rowKey = 'id',
  selectable = false,
  selectedRows = [],
  onSelectionChange
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredRow, setHoveredRow] = useState<string | number | null>(null)

  // Handle sorting
  const handleSort = (field: string) => {
    if (onSort) {
      const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
      setSortField(field)
      setSortDirection(newDirection)
      onSort(field, newDirection)
    }
  }

  // Handle filtering
  const handleFilter = (query: string) => {
    setSearchTerm(query)
    if (onFilter) {
      onFilter(query)
    }
  }

  // Get row key
  const getRowKey = (row: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(row, index)
    }
    return row[rowKey] || index
  }

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchTerm) {
      filtered = data.filter(row =>
        columns.some(column => {
          const value = String(row[column.key] || '')
          return value.toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }

    // Apply sorting
    if (sortField && onSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField]
        const bValue = b[sortField]
        
        if (aValue === bValue) return 0
        if (aValue == null) return 1
        if (bValue == null) return -1
        
        const comparison = aValue < bValue ? -1 : 1
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [data, searchTerm, sortField, sortDirection, columns, onSort])

  // Handle row click
  const handleRowClick = (row: T, index: number) => {
    if (onRowClick) {
      onRowClick(row, index)
    }
  }

  // Handle row hover
  const handleRowHover = (rowKey: string | number | null) => {
    setHoveredRow(rowKey)
  }

  if (isLoading) {
    return (
      <div className={cn('density-cozy', className)}>
        <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
              <thead className="bg-[var(--color-bg-secondary)] sticky top-0 z-[var(--z-sticky)]">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      className={cn(
                        'px-[var(--cell-padding-x)] py-3 text-left text-xs font-medium uppercase tracking-wider',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        column.className
                      )}
                      style={{ 
                        width: column.width,
                        minWidth: column.minWidth 
                      }}
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-[var(--color-surface-primary)] divide-y divide-[var(--color-border-primary)]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonRow key={index} columns={columns} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('density-cozy', className)}>
      {/* Search Bar */}
      {onFilter && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => handleFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border-primary)] rounded-lg bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:border-[var(--color-accent-primary)] transition-colors"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border-primary)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--color-border-primary)]">
            <thead className="bg-[var(--color-bg-secondary)] sticky top-0 z-[var(--z-sticky)]">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className={cn(
                      'px-[var(--cell-padding-x)] py-3 text-left text-xs font-medium uppercase tracking-wider',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                    style={{ 
                      width: column.width,
                      minWidth: column.minWidth 
                    }}
                  >
                    {column.sortable && onSort ? (
                      <SortButton
                        field={String(column.key)}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      >
                        {column.label}
                      </SortButton>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-[var(--color-surface-primary)] divide-y divide-[var(--color-border-primary)]">
              {filteredAndSortedData.length === 0 ? (
                <EmptyState message={emptyMessage} columns={columns} />
              ) : (
                filteredAndSortedData.map((row, index) => {
                  const key = getRowKey(row, index)
                  const isHovered = hoveredRow === key
                  
                  return (
                    <tr
                      key={key}
                      onClick={() => handleRowClick(row, index)}
                      onMouseEnter={() => handleRowHover(key)}
                      onMouseLeave={() => handleRowHover(null)}
                      className={cn(
                        'transition-colors cursor-pointer',
                        isHovered && 'bg-[var(--color-bg-secondary)]',
                        onRowClick && 'hover:bg-[var(--color-bg-secondary)] focus-within:bg-[var(--color-bg-secondary)] focus-within:ring-2 focus-within:ring-[var(--focus-ring-color)] focus-within:ring-inset'
                      )}
                    >
                      {columns.map((column, colIndex) => {
                        const value = row[column.key]
                        
                        return (
                          <td
                            key={colIndex}
                            className={cn(
                              'px-[var(--cell-padding-x)] py-[var(--cell-padding-y)] text-sm text-[var(--color-text-primary)]',
                              column.align === 'center' && 'text-center',
                              column.align === 'right' && 'text-right',
                              column.className
                            )}
                          >
                            {column.render ? column.render(value, row, index) : value}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
