'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, Building2, Calendar, User, MapPin, Filter, Trash2, Eye } from 'lucide-react'

interface DealTableRow {
  id: string
  property: string
  address: string
  dealType: string
  createdOn: string // ISO date
  createdBy: string
  status: string
}

interface DealTableProps {
  rows: DealTableRow[]
  isLoading?: boolean
  onRowClick: (id: string) => void
  onDelete?: (id: string) => void
  onView?: (id: string) => void
}

type SortField = 'property' | 'dealType' | 'createdOn' | 'createdBy' | 'status'
type SortDirection = 'asc' | 'desc'

export function DealTable({ rows, isLoading = false, onRowClick, onDelete, onView }: DealTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Filter and sort data
  const filteredAndSortedRows = useMemo(() => {
    let filtered = rows

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = rows.filter(row => 
        row.property.toLowerCase().includes(term) ||
        row.address.toLowerCase().includes(term) ||
        row.dealType.toLowerCase().includes(term)
      )
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any = a[sortField]
        let bValue: any = b[sortField]

        // Handle date sorting
        if (sortField === 'createdOn') {
          aValue = new Date(aValue).getTime()
          bValue = new Date(bValue).getTime()
        } else {
          // Handle string sorting
          aValue = String(aValue).toLowerCase()
          bValue = String(bValue).toLowerCase()
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [rows, searchTerm, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toISOString().split('T')[0]
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    switch (status.toLowerCase()) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'completed':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'draft':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'archived':
        return `${baseClasses} bg-gray-100 text-gray-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field
    const direction = isActive ? sortDirection : null

    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center space-x-1 text-left font-medium text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
      >
        <span>{children}</span>
        <div className="flex flex-col">
          <ChevronUp 
            className={`h-3 w-3 ${isActive && direction === 'asc' ? 'text-primary-600' : 'text-gray-400'}`} 
          />
          <ChevronDown 
            className={`h-3 w-3 -mt-1 ${isActive && direction === 'desc' ? 'text-primary-600' : 'text-gray-400'}`} 
          />
        </div>
      </button>
    )
  }

  const SkeletonRow = () => (
    <tr className="border-b border-gray-200">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse mr-3"></div>
          <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
      </td>
      {(onDelete || onView) && (
        <td className="px-6 py-4 whitespace-nowrap text-center">
          <div className="flex items-center justify-center space-x-2">
            {onView && (
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            )}
            {onDelete && (
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            )}
          </div>
        </td>
      )}
    </tr>
  )

  if (isLoading) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Deals</h3>
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deal Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={index} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Deals</h3>
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
        </div>

        {/* Empty State */}
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No deals found</h3>
          <p className="mt-2 text-gray-500">
            {searchTerm ? 'No deals match your search criteria.' : 'Get started by creating your first deal.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      {/* Header with Search */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Deals</h3>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search deals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                <SortButton field="property">Property</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[250px]">
                Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                <SortButton field="dealType">Deal Type</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                <SortButton field="createdOn">Created On</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                <SortButton field="createdBy">Created By</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                <SortButton field="status">Status</SortButton>
              </th>
              {(onDelete || onView) && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedRows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row.id)}
                onMouseEnter={() => setHoveredRow(row.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`cursor-pointer transition-colors duration-150 ${
                  hoveredRow === row.id ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[180px]" title={row.property}>
                      {row.property}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <div className="text-sm text-gray-900 truncate max-w-[230px]" title={row.address}>
                      {row.address}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 truncate max-w-[100px]" title={row.dealType}>
                    {row.dealType}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <div className="text-sm text-gray-900">
                      {formatDate(row.createdOn)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <div className="text-sm text-gray-900 truncate max-w-[130px]" title={row.createdBy}>
                      {row.createdBy}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(row.status)}>
                    {row.status}
                  </span>
                </td>
                {(onDelete || onView) && (
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {onView && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // Prevent row click
                            onView(row.id)
                          }}
                          className="inline-flex items-center p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-150"
                          title={`View details for ${row.property}`}
                          aria-label={`View details for ${row.property}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // Prevent row click
                            onDelete(row.id)
                          }}
                          className="inline-flex items-center p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-150"
                          title="Delete deal"
                          aria-label={`Delete ${row.property}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer with Results Count */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-700">
          <div>
            Showing {filteredAndSortedRows.length} of {rows.length} deals
            {searchTerm && (
              <span className="ml-2 text-gray-500">
                (filtered by "{searchTerm}")
              </span>
            )}
          </div>
          {/* TODO: Add pagination controls here */}
          <div className="text-gray-500">
            {/* TODO: Implement pagination */}
          </div>
        </div>
      </div>
    </div>
  )
}
