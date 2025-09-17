'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Edit, Save, X } from 'lucide-react'

interface UnitMix {
  unit_type: string
  unit_label?: string
  total_units: number
  occupied_units: number
  vacant_units: number
  avg_square_feet?: number
  avg_bedrooms?: number
  avg_bathrooms?: number
  avg_actual_rent: number
  avg_market_rent: number
  rent_premium: number
  pro_forma_rent?: number
  total_square_feet?: number
  total_actual_rent: number
  total_market_rent: number
  total_pro_forma_rent: number
}

interface UnitMixSummaryProps {
  unitMix: UnitMix[]
  totals: {
    total_units: number
    total_actual_rent: number
    total_market_rent: number
  }
  onUpdateProFormaRent?: (unitType: string, proFormaRent: number) => void
  editable?: boolean
}

export function UnitMixSummary({ 
  unitMix, 
  totals, 
  onUpdateProFormaRent,
  editable = false 
}: UnitMixSummaryProps) {
  const [editingRent, setEditingRent] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getPremiumColor = (premium: number) => {
    if (premium > 5) return 'text-green-600'
    if (premium < -5) return 'text-red-600'
    return 'text-gray-600'
  }

  const getOccupancyColor = (occupied: number, total: number) => {
    const rate = (occupied / total) * 100
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleEditStart = (unitType: string, currentValue?: number) => {
    setEditingRent(unitType)
    setEditValue(currentValue?.toString() || '')
  }

  const handleEditSave = () => {
    if (editingRent && editValue && onUpdateProFormaRent) {
      const numericValue = parseFloat(editValue)
      if (!isNaN(numericValue)) {
        onUpdateProFormaRent(editingRent, numericValue)
      }
    }
    setEditingRent(null)
    setEditValue('')
  }

  const handleEditCancel = () => {
    setEditingRent(null)
    setEditValue('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave()
    } else if (e.key === 'Escape') {
      handleEditCancel()
    }
  }

  return (
    <div className="space-y-6">
      {/* Unit Mix Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Unit Mix Analysis</h3>
          <p className="text-sm text-gray-500">Breakdown by unit type with rent analysis</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occupancy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg SF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Rent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Rent
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {unitMix.map((mix) => (
                <tr key={mix.unit_type} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {mix.unit_type}
                      </div>
                      {mix.unit_label && (
                        <div className="text-sm text-gray-500">
                          {mix.unit_label}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {mix.total_units}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${getOccupancyColor(mix.occupied_units, mix.total_units)}`}>
                        {((mix.occupied_units / mix.total_units) * 100).toFixed(1)}%
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({mix.occupied_units}/{mix.total_units})
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mix.avg_square_feet ? `${mix.avg_square_feet.toLocaleString()} SF` : 'N/A'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(mix.avg_actual_rent)}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(mix.total_actual_rent)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Rent Performance</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            {unitMix.map((mix) => (
              <li key={mix.unit_type}>
                {mix.unit_type}: {formatCurrency(mix.avg_actual_rent)} avg rent
              </li>
            ))}
          </ul>
        </div>
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Occupancy Status</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {unitMix.map((mix) => {
                const occupancy = (mix.occupied_units / mix.total_units) * 100
                if (occupancy < 95) {
                  return (
                    <li key={mix.unit_type}>
                      {mix.unit_type}: {occupancy.toFixed(1)}% occupied
                      {occupancy < 90 ? ' (Low occupancy)' : ''}
                    </li>
                  )
                }
                return null
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
