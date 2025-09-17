'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Upload, Link as LinkIcon, Edit3, FileText } from 'lucide-react'
import { RentRollStatus } from './RentRollStatus'

interface RentRoll {
  id: number
  filename: string
  uploaded_at: string
  is_normalized: boolean
}

interface RentRollRecord {
  id: number
  unit_number: string
  unit_type: string
  square_feet?: number
  bedrooms?: number
  bathrooms?: number
  actual_rent?: number
  market_rent?: number
  lease_start?: string
  lease_expiration?: string
  tenant_name?: string
  lease_status?: string
  is_duplicate: boolean
  is_application: boolean
  data_source: string
  created_at: string
  updated_at: string
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
  normalizedRentRollData?: RentRollRecord[]
  totalRentRollRecords?: number
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
  onCloseRentRollModal,
  normalizedRentRollData = [],
  totalRentRollRecords = 0
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

        {/* Rent Roll Status */}
        <div className="border-t border-gray-200 pt-4">
          <RentRollStatus
            dealId={dealId}
            hasRentRollData={hasRentRollData}
            createdDate={rentRollCreatedDate}
            error={rentRollError}
          />
        </div>

        {/* Normalized Rent Roll Data */}
        {isLinked && normalizedRentRollData.length > 0 && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-md font-semibold text-gray-900">Normalized Rent Roll Data</h4>
                <p className="text-sm text-gray-500">
                  {totalRentRollRecords} units processed from rent roll
                </p>
              </div>
              <Link
                href={`/deals/${dealId}/rentroll`}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Full Rent Roll
              </Link>
            </div>
            
            {/* Sample of rent roll data */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-3">Sample of normalized data (showing first 10 units):</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Unit</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Type</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Sq Ft</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Beds</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Baths</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Rent</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedRentRollData.slice(0, 10).map((record) => (
                      <tr key={record.id} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-900">{record.unit_number}</td>
                        <td className="py-2 px-3 text-gray-700">{record.unit_type}</td>
                        <td className="py-2 px-3 text-gray-700">{record.square_feet || '-'}</td>
                        <td className="py-2 px-3 text-gray-700">{record.bedrooms || '-'}</td>
                        <td className="py-2 px-3 text-gray-700">{record.bathrooms || '-'}</td>
                        <td className="py-2 px-3 text-gray-700">
                          {record.actual_rent ? `$${record.actual_rent.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-gray-700">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            record.lease_status === 'occupied' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {record.lease_status || 'vacant'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalRentRollRecords > 10 && (
                <div className="text-center mt-3">
                  <span className="text-sm text-gray-500">
                    ... and {totalRentRollRecords - 10} more units
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
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
