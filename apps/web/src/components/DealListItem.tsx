'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, Building2, MoreVertical, Trash2, Edit, Eye } from 'lucide-react'
import { Deal, ValuationRun } from '@/types/deal'
import ConfirmationDialog from './ConfirmationDialog'

interface DealListItemProps {
  deal: Deal
  latestValuation?: ValuationRun
  onDelete: (dealId: number) => void
  isDeleting?: boolean
}

export function DealListItem({ deal, latestValuation, onDelete, isDeleting = false }: DealListItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const getStatusBadge = (status: string) => {
    const baseClasses = 'badge'
    switch (status) {
      case 'active':
        return `${baseClasses} badge-success`
      case 'completed':
        return `${baseClasses} badge-info`
      case 'archived':
        return `${baseClasses} badge-gray`
      default:
        return `${baseClasses} badge-warning`
    }
  }

  const getWorkflowStatus = () => {
    if (latestValuation?.status === 'completed') {
      return { status: 'completed', text: 'Analysis Complete', color: 'text-green-600' }
    }
    if (latestValuation?.status === 'running') {
      return { status: 'running', text: 'Calculating...', color: 'text-blue-600' }
    }
    if (latestValuation) {
      return { status: 'pending', text: 'Valuation Pending', color: 'text-yellow-600' }
    }
    return { status: 'draft', text: 'Setup Required', color: 'text-gray-600' }
  }

  const workflowStatus = getWorkflowStatus()

  const handleDelete = () => {
    onDelete(deal.id)
    setShowDeleteDialog(false)
    setShowActions(false)
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <Building2 className="h-5 w-5 text-primary-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {deal.name}
                </h3>
                <p className="text-sm text-gray-600">{deal.property_type}</p>
              </div>
            </div>
            
            <div className="mt-3 flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{deal.city}, {deal.state}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Created {new Date(deal.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {deal.description && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {deal.description}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Status Badges */}
            <div className="flex flex-col items-end space-y-2">
              <span className={getStatusBadge(deal.status)}>
                {deal.status}
              </span>
              <span className={`text-xs font-medium ${workflowStatus.color}`}>
                {workflowStatus.text}
              </span>
            </div>

            {/* KPI Preview */}
            {latestValuation?.status === 'completed' && latestValuation.results && (
              <div className="hidden sm:flex items-center space-x-4 text-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-500">IRR</p>
                  <p className="font-semibold text-gray-900">
                    {(latestValuation.results.irr * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">DSCR</p>
                  <p className="font-semibold text-gray-900">
                    {latestValuation.results.dscr.toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                disabled={isDeleting}
              >
                <MoreVertical className="h-5 w-5" />
              </button>

              {showActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowActions(false)}
                    >
                      <Eye className="h-4 w-4 mr-3" />
                      View Details
                    </Link>
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 mr-3" />
                      Delete Deal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Deal"
        message={`Are you sure you want to delete "${deal.name}"? This deal will be moved to the deleted deals folder and permanently removed after 7 days.`}
        confirmText="Delete Deal"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </>
  )
}
