'use client'

import { useState } from 'react'
import { Upload, Link as LinkIcon, Edit3, CheckCircle } from 'lucide-react'

interface RentRoll {
  id: number
  filename: string
  uploaded_at: string
  is_normalized: boolean
}

interface UnitMixSourceSectionProps {
  dealId: string
  provenance: string
  isLinked: boolean
  rentRollName?: string
  lastLinkedAt?: string
  hasRentRollData?: boolean
  rentRollCreatedDate?: string
  rentRollError?: string
  onUploadRentRoll: () => void
  onReLinkRentRoll: () => void
  onManualInput: () => void
  availableRentRolls?: RentRoll[]
  onSelectRentRoll?: (rentRollId: number) => void
  showRentRollModal?: boolean
  onCloseRentRollModal?: () => void
}

export function UnitMixSourceSection({
  dealId,
  provenance,
  isLinked,
  rentRollName,
  lastLinkedAt,
  hasRentRollData = false,
  rentRollCreatedDate,
  rentRollError,
  onUploadRentRoll,
  onReLinkRentRoll,
  onManualInput,
  availableRentRolls = [],
  onSelectRentRoll,
  showRentRollModal = false,
  onCloseRentRollModal
}: UnitMixSourceSectionProps) {
  const getSourcePill = () => {
    if (isLinked && rentRollName && lastLinkedAt) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Derived from "{rentRollName}" • Last linked {new Date(lastLinkedAt).toLocaleDateString()}
        </span>
      )
    } else if (provenance === 'MANUAL') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Source: Manual
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Not yet configured
        </span>
      )
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Unit Mix Source</h3>
            <p className="text-sm text-gray-500">Manage data source and linking</p>
          </div>
          <div className="flex items-center space-x-2">
            {getSourcePill()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button
            onClick={onUploadRentRoll}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload New Rent Roll
          </button>
          
          <button
            onClick={onReLinkRentRoll}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Re-link Existing Rent Roll
          </button>
          
          <button
            onClick={onManualInput}
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Manual Input
          </button>
        </div>

        {/* Rent Roll Status - Simplified */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isLinked && rentRollName ? (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Rent Roll linked
                  </span>
                  <span className="text-sm text-gray-600">
                    Derived from "{rentRollName}" • Last linked {lastLinkedAt ? new Date(lastLinkedAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">No rent roll linked</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Re-link Rent Roll Modal */}
      {showRentRollModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Rent Roll to Link</h3>
              
              {availableRentRolls.length > 0 ? (
                <div className="space-y-2">
                  {availableRentRolls.map((rentRoll) => (
                    <button
                      key={rentRoll.id}
                      onClick={() => onSelectRentRoll?.(rentRoll.id)}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="font-medium text-gray-900">{rentRoll.filename}</div>
                      <div className="text-sm text-gray-500">
                        Uploaded {new Date(rentRoll.uploaded_at).toLocaleDateString()}
                        {rentRoll.is_normalized && (
                          <span className="ml-2 text-green-600">• Normalized</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">No rent rolls available</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={onCloseRentRollModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
