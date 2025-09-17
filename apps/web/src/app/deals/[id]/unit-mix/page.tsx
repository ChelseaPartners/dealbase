'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, AlertCircle, Upload } from 'lucide-react'
import { UnitMixSummary } from '@/components/UnitMixSummary'

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

interface UnitMixData {
  deal_id: number
  unit_mix: UnitMix[]
  totals: {
    total_units: number
    total_actual_rent: number
    total_market_rent: number
  }
}

async function fetchUnitMixData(dealId: string): Promise<UnitMixData> {
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

  // Fetch unit mix data
  const { 
    data: unitMixData, 
    isLoading: unitMixLoading, 
    error: unitMixError 
  } = useQuery({
    queryKey: ['unit-mix', dealId],
    queryFn: () => fetchUnitMixData(dealId),
  })

  if (unitMixLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading unit mix data...</p>
        </div>
      </div>
    )
  }

  if (unitMixError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Unit Mix</h3>
            <p className="text-red-700 mb-4">
              {unitMixError.message}
            </p>
            <Link href={`/deals/${dealId}`} className="btn btn-primary">
              Back to Deal
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!unitMixData || unitMixData.unit_mix.length === 0) {
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
            href={`/intake/${dealId}`}
            className="btn btn-primary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Rent Roll
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
          <h1 className="text-3xl font-bold text-gray-900">Unit Mix Analysis</h1>
          <p className="mt-2 text-gray-600">
            Analyze unit types, occupancy, and rent performance
          </p>
        </div>
      </div>

      {/* Unit Mix Analysis */}
      <div className="space-y-6">
        <UnitMixSummary 
          unitMix={unitMixData.unit_mix}
          totals={unitMixData.totals}
          editable={false}
        />
        
        <div className="flex justify-end">
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['unit-mix', dealId] })}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
