'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, TrendingUp, TrendingDown, Users, Home } from 'lucide-react'
import Link from 'next/link'

interface UnitMixRollupData {
  deal_id: number
  analysis_date: string
  unit_mix: {
    unit_type: string
    unit_label?: string
    total_units: number
    occupied_units: number
    vacant_units: number
    current_avg_rent: number
    t3_avg_rent: number
    t6_avg_rent: number
    t12_avg_rent: number
    t3_rent_trend: string
    t6_rent_trend: string
    t12_rent_trend: string
  }[]
  summary_stats: {
    total_units: number
    total_occupied: number
    overall_occupancy_rate: number
    unit_types_count: number
    analysis_periods: string[]
    last_updated: string
  }
}

interface UnitMixRollupProps {
  dealId: string
}

async function fetchUnitMixData(dealId: string): Promise<UnitMixRollupData> {
  const response = await fetch(`/api/deals/${dealId}/unit-mix`)
  if (!response.ok) {
    throw new Error('Failed to fetch unit mix data')
  }
  return response.json()
}

export function UnitMixRollup({ dealId }: UnitMixRollupProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['unit-mix-rollup', dealId],
    queryFn: () => fetchUnitMixData(dealId),
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unit Mix Data Unavailable</h3>
          <p className="text-gray-500 mb-4">Upload rent roll data to generate unit mix analysis</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600'
      case 'decreasing':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Unit Mix Summary</h2>
          <p className="text-sm text-gray-500">Primary unit mix data overview</p>
        </div>
        <Link
          href={`/deals/${dealId}/unit-mix`}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View Full Analysis
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-2">
            <Home className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.summary_stats?.total_units || 0}</p>
          <p className="text-xs text-gray-500">Total Units</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mx-auto mb-2">
            <Users className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.summary_stats?.total_occupied || 0}</p>
          <p className="text-xs text-gray-500">Occupied</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mx-auto mb-2">
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.summary_stats?.overall_occupancy_rate || 0}%</p>
          <p className="text-xs text-gray-500">Occupancy</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg mx-auto mb-2">
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.summary_stats?.unit_types_count || 0}</p>
          <p className="text-xs text-gray-500">Unit Types</p>
        </div>
      </div>

      {/* Unit Mix Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Units
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Occupancy
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Rent
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                T12 Trend
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(data.unit_mix || []).slice(0, 3).map((mix) => (
              <tr key={mix.unit_type} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {mix.unit_type}
                  </div>
                  {mix.unit_label && (
                    <div className="text-sm text-gray-500">
                      {mix.unit_label}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {mix.occupied_units}/{mix.total_units}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${
                      (mix.occupied_units / mix.total_units) * 100 >= 95 ? 'text-green-600' :
                      (mix.occupied_units / mix.total_units) * 100 >= 90 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {((mix.occupied_units / mix.total_units) * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(mix.current_avg_rent)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getTrendIcon(mix.t12_rent_trend)}
                    <span className={`ml-2 text-sm ${getTrendColor(mix.t12_rent_trend)}`}>
                      {mix.t12_rent_trend}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(data.unit_mix || []).length > 3 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            Showing 3 of {(data.unit_mix || []).length} unit types
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        Last updated: {data.analysis_date ? new Date(data.analysis_date).toLocaleDateString() : 'N/A'}
      </div>
    </div>
  )
}
