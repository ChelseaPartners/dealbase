'use client'

import { useState } from 'react'
import { BarChart3, Trash2, Edit3, CheckCircle } from 'lucide-react'

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
  groupBy?: 'unit_type' | 'square_feet' | 'unit_label'
  onGroupByChange?: (groupBy: 'unit_type' | 'square_feet' | 'unit_label') => void
}

export function UnitMixVisualization({
  dealId,
  unitMixData,
  totals,
  isLinked,
  onEditRow,
  onDeleteRow,
  groupBy = 'square_feet',
  onGroupByChange
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
            {/* Grouping Toggle */}
            {onGroupByChange && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Group by:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => onGroupByChange('unit_type')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      groupBy === 'unit_type'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Type
                  </button>
                  <button
                    onClick={() => onGroupByChange('square_feet')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      groupBy === 'square_feet'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    SqFt
                  </button>
                  <button
                    onClick={() => onGroupByChange('unit_label')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      groupBy === 'unit_label'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Label
                  </button>
                </div>
              </div>
            )}
            
            {/* Status indicator */}
            {isLinked ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Rent Roll linked
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Manual entry
              </span>
            )}
            
          </div>
        </div>
      </div>

      {/* Charts/Metrics Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totals.total_units}</div>
            <div className="text-xs text-gray-500">Total Units</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {unitMixData.length > 0 
                ? `${Math.round(unitMixData.reduce((sum, mix) => sum + (mix.total_square_feet || 0), 0)).toLocaleString()}`
                : '0'}
            </div>
            <div className="text-xs text-gray-500">Total SF</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totals.total_units > 0 && totals.total_actual_rent
                ? `$${Math.round(totals.total_actual_rent / totals.total_units).toLocaleString()}`
                : '$0'}
            </div>
            <div className="text-xs text-gray-500">Avg In Place Rent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totals.total_units > 0 && totals.total_occupied !== undefined
                ? ((totals.total_occupied / totals.total_units) * 100).toFixed(0)
                : 0}%
            </div>
            <div className="text-xs text-gray-500">Occupancy</div>
          </div>
        </div>
      </div>

      {/* Unit Mix Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {groupBy === 'square_feet' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Type
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {groupBy === 'unit_type' ? 'Unit Type' : groupBy === 'square_feet' ? 'Unit SF' : 'Unit Label'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                # of Units
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occupancy
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg SF
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg In Place Rent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Market Rent
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rent Premium
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
                  {groupBy === 'square_feet' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {mix.unit_label ? mix.unit_label.split(' - ')[0] : '—'}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {groupBy === 'unit_type' ? mix.unit_type : 
                       groupBy === 'square_feet' ? `${mix.avg_square_feet} SF` : 
                       mix.unit_label || '—'}
                    </div>
                    {groupBy === 'unit_type' && mix.unit_label && (
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
                      mix.total_units === 0 ? 'text-gray-500' :
                      (mix.occupied_units / mix.total_units) >= 0.95 ? 'text-green-600' :
                      (mix.occupied_units / mix.total_units) >= 0.90 ? 'text-green-500' :
                      (mix.occupied_units / mix.total_units) >= 0.80 ? 'text-yellow-600' :
                      (mix.occupied_units / mix.total_units) >= 0.70 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {mix.total_units === 0 ? 'N/A' : `${((mix.occupied_units / mix.total_units) * 100).toFixed(1)}%`}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mix.avg_square_feet ? `${mix.avg_square_feet.toLocaleString()} SF` : 'N/A'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${mix.avg_actual_rent ? Math.round(mix.avg_actual_rent).toLocaleString() : 'N/A'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${mix.avg_market_rent ? Math.round(mix.avg_market_rent).toLocaleString() : 'N/A'}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {mix.rent_premium !== null && mix.rent_premium !== undefined ? (
                      <span className={`font-medium ${
                        mix.rent_premium > 0 ? 'text-red-600' :
                        mix.rent_premium < 0 ? 'text-green-600' :
                        'text-gray-500'
                      }`}>
                        {mix.rent_premium > 0 ? '+' : ''}${Math.round(mix.rent_premium).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
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
                <td colSpan={isLinked ? (groupBy === 'square_feet' || groupBy === 'unit_label' ? 7 : 6) : (groupBy === 'square_feet' || groupBy === 'unit_label' ? 8 : 7)} className="px-6 py-12 text-center">
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
                {groupBy === 'square_feet' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">Total / Wtd. Avg.</div>
                  </td>
                )}
                {groupBy === 'square_feet' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Empty cell for Unit SF column */}
                  </td>
                )}
                {groupBy !== 'square_feet' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">Total / Wtd. Avg.</div>
                  </td>
                )}
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {totals.total_units}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {totals.total_units > 0 && totals.total_occupied !== undefined
                    ? `${((totals.total_occupied / totals.total_units) * 100).toFixed(1)}%`
                    : '0%'}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {unitMixData.length > 0 
                    ? `${Math.round(unitMixData.reduce((sum, mix) => sum + (mix.avg_square_feet || 0), 0) / unitMixData.length).toLocaleString()} SF`
                    : 'N/A'}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  ${totals.total_units > 0 && totals.total_actual_rent
                    ? Math.round(totals.total_actual_rent / totals.total_units).toLocaleString()
                    : '0'}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  ${totals.total_units > 0 && totals.total_market_rent
                    ? Math.round(totals.total_market_rent / totals.total_units).toLocaleString()
                    : '0'}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {(() => {
                    if (totals.total_units === 0 || !totals.total_actual_rent || !totals.total_market_rent) {
                      return <span className="text-gray-500">N/A</span>
                    }
                    const avgActualRent = totals.total_actual_rent / totals.total_units
                    const avgMarketRent = totals.total_market_rent / totals.total_units
                    const rentPremium = avgActualRent - avgMarketRent
                    return (
                      <span className={`font-semibold ${
                        rentPremium > 0 ? 'text-red-600' :
                        rentPremium < 0 ? 'text-green-600' :
                        'text-gray-500'
                      }`}>
                        {rentPremium > 0 ? '+' : ''}${Math.round(rentPremium).toLocaleString()}
                      </span>
                    )
                  })()}
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
