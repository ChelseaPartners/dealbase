'use client'

import React, { useState } from 'react'
import { CheckCircle, AlertTriangle, Edit, Eye, EyeOff } from 'lucide-react'

interface RentRollUnit {
  id: number
  unit_number: string
  unit_label?: string
  unit_type: string
  square_feet?: number
  bedrooms?: number
  bathrooms?: number
  actual_rent: number
  market_rent: number
  lease_start?: string
  move_in_date?: string
  lease_expiration?: string
  tenant_name?: string
  lease_status: string
}

interface RentRollTableProps {
  units: RentRollUnit[]
  onEditUnit?: (unit: RentRollUnit) => void
  showDetails?: boolean
}

export function RentRollTable({ units, onEditUnit, showDetails = false }: RentRollTableProps) {
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<keyof RentRollUnit>('unit_number')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'text-green-600 bg-green-100'
      case 'vacant':
        return 'text-red-600 bg-red-100'
      case 'notice_to_vacate':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getRentPremium = (actual: number, market: number) => {
    if (market === 0) return 0
    return ((actual - market) / market) * 100
  }

  const sortedUnits = [...units].sort((a, b) => {
    const aVal = a[sortBy]
    const bVal = b[sortBy]
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    }
    
    return 0
  })

  const toggleExpanded = (unitId: number) => {
    const newExpanded = new Set(expandedUnits)
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId)
    } else {
      newExpanded.add(unitId)
    }
    setExpandedUnits(newExpanded)
  }

  const handleSort = (column: keyof RentRollUnit) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (column: keyof RentRollUnit) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Rent Roll</h3>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {units.length} units
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setExpandedUnits(new Set(units.map(u => u.id)))}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setExpandedUnits(new Set())}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SF
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('actual_rent')}
              >
                Actual Rent {getSortIcon('actual_rent')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lease Start
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Move-In Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lease Exp
              </th>
              {showDetails && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUnits.map((unit) => (
              <React.Fragment key={unit.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleExpanded(unit.id)}
                        className="mr-2 text-gray-400 hover:text-gray-600"
                      >
                        {expandedUnits.has(unit.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {unit.unit_number}
                        </div>
                        {unit.unit_label && (
                          <div className="text-sm text-gray-500">
                            {unit.unit_label}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{unit.unit_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.square_feet ? `${unit.square_feet.toLocaleString()} SF` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(unit.actual_rent)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(unit.lease_start)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(unit.move_in_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(unit.lease_status)}`}>
                      {unit.lease_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(unit.lease_expiration)}
                  </td>
                  {showDetails && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => onEditUnit?.(unit)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
                
                {/* Expanded row with additional details */}
                {expandedUnits.has(unit.id) && (
                  <tr className="bg-gray-50">
                    <td colSpan={showDetails ? 8 : 7} className="px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Bedrooms:</span>
                          <span className="ml-2 text-gray-900">{unit.bedrooms || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Bathrooms:</span>
                          <span className="ml-2 text-gray-900">{unit.bathrooms || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Market Rent:</span>
                          <span className="ml-2 text-gray-900">{formatCurrency(unit.market_rent)}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Tenant:</span>
                          <span className="ml-2 text-gray-900">{unit.tenant_name || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Total Units:</span>
            <span className="ml-2 text-gray-900">{units.length}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Total Actual Rent:</span>
            <span className="ml-2 text-gray-900">
              {formatCurrency(units.reduce((sum, unit) => sum + unit.actual_rent, 0))}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Occupied Units:</span>
            <span className="ml-2 text-gray-900">
              {units.filter(unit => unit.lease_status === 'occupied').length}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Vacant Units:</span>
            <span className="ml-2 text-gray-900">
              {units.filter(unit => unit.lease_status === 'vacant').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
