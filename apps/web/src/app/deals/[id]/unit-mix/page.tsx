'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, ChevronDown, ChevronUp, Download, RefreshCw } from 'lucide-react'
import { UnitMixVisualization } from '@/components/UnitMixVisualization'
import { UnitMixSourceSection } from '@/components/UnitMixSourceSection'
import { RentRollTable } from '@/components/RentRollTable'
import { UploadModal } from '@/components/UploadModal'
import { ReLinkRentRollModal } from '@/components/ReLinkRentRollModal'
import { UploadRentRollModal } from '@/components/UploadRentRollModal'
import { Toast } from '@/components/Toast'

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

interface UnitMixResponse {
  deal_id: number
  provenance: string
  is_linked_to_nrr: boolean
  rent_roll_name?: string
  last_derived_at?: string
  last_manual_edit_at?: string
  unit_mix: UnitMixRow[]
  totals: {
    total_units: number
    total_occupied: number
    total_actual_rent: number
    total_market_rent: number
  }
}

interface RentRoll {
  id: number
  filename: string
  uploaded_at: string
  is_normalized: boolean
}

async function fetchUnitMixData(dealId: string, groupBy: 'unit_type' | 'square_feet' | 'unit_label' = 'square_feet'): Promise<UnitMixResponse> {
  // Use Next.js API route which forwards query parameters to backend
  const timestamp = new Date().getTime()
  const response = await fetch(`/api/deals/${dealId}/unit-mix?group_by=${groupBy}&t=${timestamp}`)
  if (!response.ok) {
    throw new Error('Failed to fetch unit mix data')
  }
  return response.json()
}

async function fetchAvailableRentRolls(dealId: string): Promise<RentRoll[]> {
  const response = await fetch(`/api/deals/${dealId}/rentroll/available`)
  if (!response.ok) {
    throw new Error('Failed to fetch available rent rolls')
  }
  return response.json()
}

export default function UnitMixPage() {
  const params = useParams()
  const dealSlug = params.id as string // This is actually the slug now
  const queryClient = useQueryClient()
  
  // We need to get the deal ID for API calls, but use slug for navigation
  const [dealId, setDealId] = useState<string | null>(null)
  const [showRentRollModal, setShowRentRollModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showRentRollTable, setShowRentRollTable] = useState(false)
  const [groupBy, setGroupBy] = useState<'unit_type' | 'square_feet' | 'unit_label'>('square_feet')

  // Fetch deal by slug to get the ID
  useEffect(() => {
    const fetchDeal = async () => {
      try {
        const response = await fetch(`/api/deals/${dealSlug}`)
        if (response.ok) {
          const deal = await response.json()
          setDealId(deal.id.toString())
        }
      } catch (error) {
        console.error('Error fetching deal:', error)
      }
    }
    
    if (dealSlug) {
      fetchDeal()
    }
  }, [dealSlug])

  // Fetch unit mix data
  const { 
    data: unitMixData, 
    isLoading: unitMixLoading, 
    error: unitMixError 
  } = useQuery({
    queryKey: ['unit-mix', dealId, groupBy],
    queryFn: () => fetchUnitMixData(dealId!, groupBy),
    enabled: !!dealId
  })

  // Fetch normalized rent roll data
  const { 
    data: rentRollData, 
    isLoading: rentRollLoading, 
    error: rentRollError 
  } = useQuery({
    queryKey: ['rentroll', dealId],
    queryFn: async () => {
      const response = await fetch(`/api/deals/${dealId}/rentroll`)
      if (!response.ok) {
        throw new Error('Failed to fetch rent roll data')
      }
      return response.json()
    },
    enabled: !!dealId
  })

  // Fetch available rent rolls for re-linking
  const { 
    data: availableRentRolls, 
    isLoading: rentRollsLoading 
  } = useQuery({
    queryKey: ['rentrolls-available', dealId],
    queryFn: () => fetchAvailableRentRolls(dealId!),
    enabled: showRentRollModal && !!dealId,
  })

  const handleUploadRentRoll = () => {
    setIsUploadModalOpen(true)
  }

  const handleReLinkRentRoll = () => {
    setShowRentRollModal(true)
  }

  const handleSelectRentRoll = async (rentRollId: number) => {
    await handleLinkRentRoll(rentRollId)
  }

  const handleLinkRentRoll = async (rrId: number) => {
    if (!dealId) return
    
    setIsLinking(true)
    try {
      const response = await fetch(`/api/deals/${dealId}/unitmix/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rrId }),
      })
      
      if (response.ok) {
        const result = await response.json()
        queryClient.invalidateQueries({ queryKey: ['unit-mix', dealId] })
        setToastMessage(result.message)
        setShowRentRollModal(false)
      } else {
        throw new Error('Failed to link to rent roll')
      }
    } catch (error) {
      console.error('Error linking to rent roll:', error)
      setToastMessage('Failed to link rent roll. Please try again.')
    } finally {
      setIsLinking(false)
    }
  }

  const handleUploadSuccess = async () => {
    // After successful upload, we need to:
    // 1. Get the uploaded document
    // 2. Normalize it
    // 3. Link it to unit mix
    try {
      // Get available rent rolls to find the newly uploaded one
      const response = await fetch(`/api/deals/${dealId}/rentroll/available`)
      if (response.ok) {
        const rentRolls = await response.json()
        // Find the most recent rent roll (should be the one just uploaded)
        const latestRentRoll = rentRolls[0]
        if (latestRentRoll) {
          // Normalize the rent roll
          const normalizeResponse = await fetch(`/api/deals/${dealId}/rentroll/${latestRentRoll.id}/normalize`, {
            method: 'POST'
          })
          
          if (normalizeResponse.ok) {
            // Link to unit mix
            await handleLinkRentRoll(latestRentRoll.id)
            setToastMessage('Rent roll uploaded and linked successfully!')
          } else {
            setToastMessage('Rent roll uploaded but failed to normalize. Please try again.')
          }
        }
      }
      
      // Refresh the data
      queryClient.invalidateQueries({ queryKey: ['unit-mix', dealId] })
      queryClient.invalidateQueries({ queryKey: ['rentroll', dealId] })
    } catch (error) {
      console.error('Failed to process uploaded rent roll:', error)
      setToastMessage('Rent roll uploaded but failed to link. Please try again.')
    }
  }

  const handleUploadSaveOnly = async () => {
    // Just refresh the documents list to show the new upload
    queryClient.invalidateQueries({ queryKey: ['rentrolls-available', dealId] })
    setToastMessage('Document saved to Documents section')
  }

  const handleManualInput = async () => {
    if (!dealId) return
    
    try {
      const response = await fetch(`/api/deals/${dealId}/unit-mix/unlink`, {
        method: 'POST',
      })
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['unit-mix', dealId] })
        setToastMessage('Switched to manual input mode')
      }
    } catch (error) {
      console.error('Failed to switch to manual mode:', error)
    }
  }

  const handleGroupByChange = (newGroupBy: 'unit_type' | 'square_feet' | 'unit_label') => {
    setGroupBy(newGroupBy)
  }


  const handleEditRow = (rowId: number) => {
    // Implement row editing logic
    console.log('Edit row:', rowId)
  }

  const handleDeleteRow = async (rowId: number) => {
    if (!confirm('Are you sure you want to delete this unit type?')) return
    
    try {
      const response = await fetch(`/api/deals/${dealId}/unit-mix`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit_mix_id: rowId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete unit mix row')
      }
      
      queryClient.invalidateQueries({ queryKey: ['unit-mix', dealId] })
    } catch (error) {
      console.error('Error deleting unit mix row:', error)
    }
  }


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

  const isLinked = unitMixData?.is_linked_to_nrr || false
  const hasData = unitMixData?.unit_mix && unitMixData.unit_mix.length > 0
  const provenance = unitMixData?.provenance || 'MANUAL'
  

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/deals/${dealSlug}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Deal
        </Link>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Unit Mix</h1>
          <p className="mt-2 text-gray-600">
            Unit mix visualization and analysis
          </p>
        </div>
      </div>

      {/* Combined Unit Mix Visualization */}
      <div className="mb-8">
        <UnitMixVisualization
          dealId={dealId || ''}
          unitMixData={unitMixData?.unit_mix || []}
          totals={unitMixData?.totals || {
            total_units: 0,
            total_occupied: 0,
            total_actual_rent: 0,
            total_market_rent: 0
          }}
          isLinked={isLinked}
          onEditRow={!isLinked ? handleEditRow : undefined}
          onDeleteRow={!isLinked ? handleDeleteRow : undefined}
          groupBy={groupBy}
          onGroupByChange={handleGroupByChange}
        />
      </div>


      {/* Unit Mix Source Section */}
      <div className="mb-8">
        <UnitMixSourceSection
          dealId={dealId || ''}
          provenance={provenance}
          isLinked={isLinked}
          rentRollName={unitMixData?.rent_roll_name}
          lastLinkedAt={unitMixData?.last_derived_at}
          hasRentRollData={isLinked} // Check if rent roll is linked
          rentRollCreatedDate={unitMixData?.last_derived_at}
          rentRollError={undefined}
          onUploadRentRoll={handleUploadRentRoll}
          onReLinkRentRoll={handleReLinkRentRoll}
          onManualInput={handleManualInput}
          availableRentRolls={availableRentRolls}
          onSelectRentRoll={handleSelectRentRoll}
          showRentRollModal={showRentRollModal}
          onCloseRentRollModal={() => setShowRentRollModal(false)}
        />
      </div>

      {/* Rent Roll Data Section - Collapsible */}
      {isLinked && rentRollData && rentRollData.units && rentRollData.units.length > 0 && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Rent Roll Data</h3>
                  <p className="text-sm text-gray-500">
                    Unit-level rent roll data ({rentRollData.total_units} units)
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setShowRentRollTable(!showRentRollTable)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {showRentRollTable ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Show Details
                      </>
                    )}
                  </button>
                  <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Download className="h-4 w-4 mr-1" />
                    Export CSV
                  </button>
                  <button 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['rentroll', dealId] })}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible Rent Roll Table */}
            {showRentRollTable && (
              <div className="border-t border-gray-200">
                <RentRollTable 
                  units={rentRollData.units}
                  showDetails={false}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <ReLinkRentRollModal
        isOpen={showRentRollModal}
        onClose={() => setShowRentRollModal(false)}
        dealId={dealId || ''}
        onLink={handleLinkRentRoll}
      />
      
      <UploadRentRollModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        dealId={dealId || ''}
        onUploadComplete={handleUploadSuccess}
        onUploadSaveOnly={handleUploadSaveOnly}
      />
      
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        dealId={dealId || ''}
        dealName="Deal"
        onUploadSuccess={handleUploadSuccess}
      />
      
      {/* Toast Notifications */}
      <Toast
        message={toastMessage}
        type="success"
        onClose={() => setToastMessage(null)}
      />
    </div>
  )
}