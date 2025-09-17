'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BarChart3, ArrowRight, Trash2, Edit3 } from 'lucide-react'

interface UnitMixRow {
  id: number
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
  rent_growth_rate?: number
  total_square_feet?: number
  total_actual_rent: number
  total_market_rent: number
  total_pro_forma_rent: number
}

interface UnitMixVisualizationProps {
  dealId: string
  unitMixData: UnitMixRow[]
  totals: {
    total_units: number
    total_occupied: number
    total_actual_rent: number
    total_market_rent: number
  }
  isLinked: boolean
  onEditRow?: (rowId: number) => void
  onDeleteRow?: (rowId: number) => void
}

export function UnitMixVisualization({
  dealId,
  unitMixData,
  totals,
  isLinked,
  onEditRow,
  onDeleteRow
}: UnitMixVisualizationProps) {
  const [editingRow, setEditingRow] = useState<number | null>(null)

  const handleEdit = (rowId: number) => {
    if (onEditRow) {
      onEditRow(rowId)
    } else {
      setEditingRow(rowId)
    }
  }

  const handleDelete = (rowId: number) => {
    if (onDeleteRow) {
      onDeleteRow(rowId)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Unit Mix Summary</h3>
            <p className="text-sm text-gray-500">
              {isLinked 
                ? 'Derived from rent roll data (read-only)' 
                : 'Manual entry (editable)'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/deals/${dealId}/unit-mix/full`}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
            >
              Open Unit Mix Dataset
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Charts/Metrics Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totals.total_units}</div>
            <div className="text-xs text-gray-500">Total Units</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totals.total_units > 0
                ? `$${(totals.total_actual_rent / totals.total_units).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                : '$0'}
            </div>
            <div className="text-xs text-gray-500">Avg In Place Rent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totals.total_units > 0 
                ? ((totals.total_occupied / totals.total_units) * 100).toFixed(0)
                : 0}%
            </div>
            <div className="text-xs text-gray-500">Occupancy</div>
          </div>
        </div>
      </div>

      {/* Dataset Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                # of Units
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occupancy
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Unit SF
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                In Place Rent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pro Forma Rent
              </th>
              {!isLinked && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {unitMixData.length > 0 ? (
              unitMixData.map((mix) => (
                <tr key={mix.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {mix.unit_type}
                    </div>
                    {mix.unit_label && (
                      <div className="text-sm text-gray-500">
                        {mix.unit_label}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mix.total_units}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`font-medium ${
                      (mix.occupied_units / mix.total_units) >= 0.95 ? 'text-green-600' :
                      (mix.occupied_units / mix.total_units) >= 0.90 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {((mix.occupied_units / mix.total_units) * 100).toFixed(1)}%
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mix.avg_square_feet ? `${mix.avg_square_feet.toLocaleString()} SF` : 'N/A'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${mix.avg_actual_rent.toLocaleString()}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(mix.pro_forma_rent || mix.avg_actual_rent).toLocaleString()}
                  </td>
                  
                  {!isLinked && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(mix.id)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(mix.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isLinked ? 6 : 7} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm">No unit mix data available</p>
                    <p className="text-xs mt-1">Use the controls below to get started</p>
                  </div>
                </td>
              </tr>
            )}
            
            {/* Total/Weighted Average Row */}
            {unitMixData.length > 0 && (
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">Total / Wtd. Avg.</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {totals.total_units}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {totals.total_units > 0 
                    ? `${((totals.total_occupied / totals.total_units) * 100).toFixed(1)}%`
                    : '0%'}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {unitMixData.length > 0 
                    ? `${Math.round(unitMixData.reduce((sum, mix) => sum + (mix.avg_square_feet || 0), 0) / unitMixData.length).toLocaleString()} SF`
                    : 'N/A'}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  ${totals.total_units > 0 
                    ? (totals.total_actual_rent / totals.total_units).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                    : '0'}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  ${totals.total_units > 0 
                    ? (unitMixData.reduce((sum, mix) => sum + ((mix.pro_forma_rent || mix.avg_actual_rent) * mix.total_units), 0) / totals.total_units).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                    : '0'}
                </td>
                
                {!isLinked && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Empty cell for actions column */}
                  </td>
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
