'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, AlertCircle, Upload } from 'lucide-react'
import { UnitMixSummary } from '@/components/UnitMixSummary'

interface LeaseRateAnalysis {
  unit_type: string
  unit_label?: string
  total_units: number
  occupied_units: number
  vacant_units: number
  
  // T3 Analysis (3 months)
  t3_avg_rent: number
  t3_units_count: number
  t3_rent_trend: string  // "increasing", "decreasing", "stable"
  
  // T6 Analysis (6 months)
  t6_avg_rent: number
  t6_units_count: number
  t6_rent_trend: string
  
  // T12 Analysis (12 months)
  t12_avg_rent: number
  t12_units_count: number
  t12_rent_trend: string
  
  // Current vs Historical
  current_avg_rent: number
  rent_premium_vs_t3: number
  rent_premium_vs_t6: number
  rent_premium_vs_t12: number
}

interface MonthlyRentTrend {
  month: number
  year: number
  month_name: string
  avg_rent: number
  total_units: number
  occupied_units: number
  occupancy_rate: number
}

interface ComprehensiveUnitMixAnalysis {
  deal_id: number
  analysis_date: string
  unit_mix: LeaseRateAnalysis[]
  monthly_trends: MonthlyRentTrend[]
  summary_stats: {
    total_units: number
    total_occupied: number
    overall_occupancy_rate: number
    unit_types_count: number
    analysis_periods: string[]
    last_updated: string
  }
}

async function fetchUnitMixData(dealId: string): Promise<ComprehensiveUnitMixAnalysis> {
  const response = await fetch(`/api/deals/${dealId}/unit-mix`)
  if (!response.ok) {
    throw new Error('Failed to fetch unit mix data')
  }
  return response.json()
}

export default function UnitMixPage() {
  const params = useParams()
  const dealId = params.id as string
  const queryClient = useQueryClient()

  // Fetch comprehensive unit mix data
  const { 
    data: analysisData, 
    isLoading: analysisLoading, 
    error: analysisError 
  } = useQuery({
    queryKey: ['unit-mix-analysis', dealId],
    queryFn: () => fetchUnitMixData(dealId),
  })

  if (analysisLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading comprehensive unit mix analysis...</p>
        </div>
      </div>
    )
  }

  if (analysisError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analysis</h3>
            <p className="text-red-700 mb-4">
              {analysisError.message}
            </p>
            <Link href={`/deals/${dealId}`} className="btn btn-primary">
              Back to Deal
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!analysisData || analysisData.unit_mix.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/deals/${dealId}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Deal
          </Link>
        </div>

        <div className="text-center py-12">
          <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Unit Mix Data</h3>
          <p className="text-gray-600 mb-6">
            Upload a rent roll file to generate unit mix analysis.
          </p>
          <Link
            href={`/deals/${dealId}`}
            className="btn btn-primary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/deals/${dealId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Deal
        </Link>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Comprehensive Unit Mix Analysis</h1>
          <p className="mt-2 text-gray-600">
            Detailed analysis with T3, T6, T12 lease rates and rent trends
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Last updated: {new Date(analysisData.analysis_date).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Units</h3>
          <p className="text-2xl font-bold text-gray-900">{analysisData.summary_stats?.total_units || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Occupied Units</h3>
          <p className="text-2xl font-bold text-gray-900">{analysisData.summary_stats?.total_occupied || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Occupancy Rate</h3>
          <p className="text-2xl font-bold text-gray-900">{analysisData.summary_stats?.overall_occupancy_rate || 0}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500">Unit Types</h3>
          <p className="text-2xl font-bold text-gray-900">{analysisData.summary_stats?.unit_types_count || 0}</p>
        </div>
      </div>

      {/* Comprehensive Unit Mix Analysis */}
      <div className="space-y-8">
        {/* Lease Rate Analysis Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lease Rate Analysis by Unit Type</h3>
            <p className="text-sm text-gray-500">T3, T6, T12 lease rates and trends per unit type</p>
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
                    Current Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    T3 Avg Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    T6 Avg Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    T12 Avg Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysisData.unit_mix.map((mix) => (
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
                        {mix.occupied_units}/{mix.total_units}
                      </div>
                      <div className="text-xs text-gray-500">
                        {((mix.occupied_units / mix.total_units) * 100).toFixed(1)}% occupied
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        ${mix.current_avg_rent.toLocaleString()}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${mix.t3_avg_rent.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({mix.t3_units_count} units)
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${mix.t6_avg_rent.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({mix.t6_units_count} units)
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${mix.t12_avg_rent.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        ({mix.t12_units_count} units)
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mix.t3_rent_trend === 'increasing' ? 'bg-green-100 text-green-800' :
                          mix.t3_rent_trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          T3: {mix.t3_rent_trend}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mix.t6_rent_trend === 'increasing' ? 'bg-green-100 text-green-800' :
                          mix.t6_rent_trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          T6: {mix.t6_rent_trend}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mix.t12_rent_trend === 'increasing' ? 'bg-green-100 text-green-800' :
                          mix.t12_rent_trend === 'decreasing' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          T12: {mix.t12_rent_trend}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Rent Trends */}
        {analysisData.monthly_trends.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">T12 Monthly Rent Trends</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Rent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Occupancy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Units
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysisData.monthly_trends.map((trend, index) => (
                    <tr key={`${trend.year}-${trend.month}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {trend.month_name} {trend.year}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          ${trend.avg_rent.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium ${
                            trend.occupancy_rate >= 95 ? 'text-green-600' :
                            trend.occupancy_rate >= 90 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {trend.occupancy_rate.toFixed(1)}%
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            ({trend.occupied_units}/{trend.total_units})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trend.total_units}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        <div className="flex justify-end">
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['unit-mix-analysis', dealId] })}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Analysis
          </button>
        </div>
      </div>
    </div>
  )
}
