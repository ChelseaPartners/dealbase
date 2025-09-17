'use client'

import React, { useState } from 'react'
import { CheckCircle, AlertTriangle, Edit } from 'lucide-react'

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
  const [sortBy, setSortBy] = useState<keyof RentRollUnit>('unit_number')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [editingUnitLabel, setEditingUnitLabel] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatUnitNumber = (unitNumber: string) => {
    // Remove any decimal points but don't add commas
    const num = parseFloat(unitNumber)
    if (isNaN(num)) return unitNumber
    return Math.floor(num).toString()
  }

  const formatUnitType = (unit: RentRollUnit) => {
    // Safely extract and validate bedroom and bathroom counts
    let bedrooms = unit.bedrooms || 0
    let bathrooms = unit.bathrooms || 0
    
    // Convert to numbers and validate they're reasonable values
    bedrooms = typeof bedrooms === 'number' ? Math.floor(bedrooms) : 0
    bathrooms = typeof bathrooms === 'number' ? Math.floor(bathrooms) : 0
    
    // Clamp values to reasonable ranges (0-10 for bedrooms, 0-5 for bathrooms)
    bedrooms = Math.max(0, Math.min(10, bedrooms))
    bathrooms = Math.max(0, Math.min(5, bathrooms))
    
    return `${bedrooms}BD / ${bathrooms}BA`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getUnitStatus = (unit: RentRollUnit) => {
    // If actual rent is $0, the unit is vacant regardless of the stored status
    if (unit.actual_rent === 0) {
      return 'vacant'
    }
    return unit.lease_status
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

  const validateUnitLabel = (label: string): boolean => {
    if (label.length > 16) return false
    return /^[A-Za-z0-9\-_]*$/.test(label)
  }

  const handleUnitLabelEdit = (unitId: number, currentLabel: string) => {
    setEditingUnitLabel(unitId)
    setEditingValue(currentLabel || '')
  }

  const handleUnitLabelSave = async (unitId: number) => {
    const trimmedValue = editingValue.trim()
    
    if (trimmedValue && !validateUnitLabel(trimmedValue)) {
      // Show validation error
      alert('Unit label can only contain letters, numbers, hyphens, and underscores, and must be 16 characters or less')
      return
    }

    // Find the unit and update it
    const unit = units.find(u => u.id === unitId)
    if (unit) {
      // Normalize the label (trim and uppercase)
      const normalizedLabel = trimmedValue ? trimmedValue.toUpperCase() : null
      
      // Update the unit in the local state (optimistic update)
      unit.unit_label = normalizedLabel
      
      // TODO: Call API to update the unit label
      // This would be implemented when we have the API endpoint
      
      setEditingUnitLabel(null)
      setEditingValue('')
    }
  }

  const handleUnitLabelCancel = () => {
    setEditingUnitLabel(null)
    setEditingValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, unitId: number) => {
    if (e.key === 'Enter') {
      handleUnitLabelSave(unitId)
    } else if (e.key === 'Escape') {
      handleUnitLabelCancel()
    }
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
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Label
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Type
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
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('market_rent')}
              >
                Market Rent {getSortIcon('market_rent')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lease Start
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Move-In Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lease Exp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
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
                    <div className="text-sm font-medium text-gray-900">
                      {formatUnitNumber(unit.unit_number)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUnitLabel === unit.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, unit.id)}
                          onBlur={() => handleUnitLabelSave(unit.id)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="A1"
                          maxLength={16}
                          autoFocus
                        />
                        <button
                          onClick={() => handleUnitLabelSave(unit.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleUnitLabelCancel}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div 
                        className="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        onClick={() => handleUnitLabelEdit(unit.id, unit.unit_label || '')}
                      >
                        {unit.unit_label || (
                          <span className="text-gray-400 italic">Click to add</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{formatUnitType(unit)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.square_feet ? `${unit.square_feet.toLocaleString()} SF` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(unit.actual_rent)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(unit.market_rent)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit.tenant_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(unit.lease_start)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(unit.move_in_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(unit.lease_expiration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getUnitStatus(unit))}`}>
                      {getUnitStatus(unit).replace('_', ' ')}
                    </span>
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
              {units.filter(unit => getUnitStatus(unit) === 'occupied').length}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Vacant Units:</span>
            <span className="ml-2 text-gray-900">
              {units.filter(unit => getUnitStatus(unit) === 'vacant').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
