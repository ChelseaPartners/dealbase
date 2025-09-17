'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Download, RefreshCw, AlertCircle, Upload } from 'lucide-react'
import { RentRollTable } from '@/components/RentRollTable'

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

interface RentRollData {
  deal_id: number
  units: RentRollUnit[]
  total_units: number
}

async function fetchRentRollData(dealId: string): Promise<RentRollData> {
  const response = await fetch(`/api/deals/${dealId}/rentroll`)
  if (!response.ok) {
    throw new Error('Failed to fetch rent roll data')
  }
  return response.json()
}

export default function RentRollPage() {
  const params = useParams()
  const dealId = params.id as string
  const queryClient = useQueryClient()

  // Fetch rent roll data
  const { 
    data: rentRollData, 
    isLoading: rentRollLoading, 
    error: rentRollError 
  } = useQuery({
    queryKey: ['rentroll', dealId],
    queryFn: () => fetchRentRollData(dealId),
  })

  if (rentRollLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rent roll data...</p>
        </div>
      </div>
    )
  }

  if (rentRollError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Rent Roll</h3>
            <p className="text-red-700 mb-4">
              {rentRollError.message}
            </p>
            <Link href={`/deals/${dealId}`} className="btn btn-primary">
              Back to Deal
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!rentRollData || rentRollData.units.length === 0) {
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Rent Roll Data</h3>
          <p className="text-gray-600 mb-6">
            Upload a rent roll file to analyze unit-level data.
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
          <h1 className="text-3xl font-bold text-gray-900">Rent Roll</h1>
          <p className="mt-2 text-gray-600">
            Unit-level rent roll data with lease details
          </p>
        </div>
      </div>

      {/* Rent Roll Table */}
      <div className="space-y-6">
        <RentRollTable 
          units={rentRollData.units}
          showDetails={true}
        />
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </div>
          <div className="flex space-x-3">
            <button className="btn btn-secondary btn-sm">
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </button>
            <button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['rentroll', dealId] })}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}