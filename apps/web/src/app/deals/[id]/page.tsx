'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, MapPin, Calendar, Download, Upload, Calculator, Trash2 } from 'lucide-react'
import ConfirmationDialog from '@/components/ConfirmationDialog'
import Toast from '@/components/Toast'

export default function DealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const dealId = params.id as string
  const [deal, setDeal] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Delete functionality state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error'
    isVisible: boolean
  }>({
    message: '',
    type: 'success',
    isVisible: false
  })

  // Fetch deal data from API
  useEffect(() => {
    const fetchDeal = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/deals/${dealId}`)
        if (!response.ok) {
          throw new Error('Deal not found')
        }
        const data = await response.json()
        setDeal(data)
      } catch (err) {
        console.error('Error fetching deal:', err)
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (dealId) {
      fetchDeal()
    }
  }, [dealId])

  // Delete deal function
  const handleDeleteDeal = async () => {
    if (!deal) return

    try {
      setIsDeleting(true)
      console.log('Deleting deal:', deal.id)
      
      const response = await fetch(`/api/deals/${dealId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete deal')
      }

      // Show success toast
      setToast({
        message: 'Deal deleted.',
        type: 'success',
        isVisible: true
      })

      // Navigate back to deals list after a short delay
      setTimeout(() => {
        router.push('/deals')
      }, 1000)

    } catch (err) {
      console.error('Error deleting deal:', err)
      setToast({
        message: "Couldn't delete deal. Try again.",
        type: 'error',
        isVisible: true
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  // Show delete confirmation dialog
  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  // Close delete dialog
  const handleDeleteCancel = () => {
    setShowDeleteDialog(false)
  }

  // Close toast
  const handleToastClose = () => {
    setToast(prev => ({ ...prev, isVisible: false }))
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Deal Not Found</h1>
          <p className="text-gray-600 mb-8">The deal you're looking for doesn't exist or has been deleted.</p>
          <Link
            href="/deals"
            className="btn btn-primary"
          >
            Back to Deals
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          href="/deals"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Deals
        </Link>
      </div>

      {/* Deal Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{deal.name}</h1>
            <p className="mt-2 text-gray-600">{deal.property_type}</p>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4 mr-1" />
              <span>{deal.address}, {deal.city}, {deal.state} {deal.zip_code}</span>
            </div>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Created {new Date(deal.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/intake/${deal.id}`}
              className="btn btn-secondary flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </Link>
            <Link
              href={`/valuation/${deal.id}`}
              className="btn btn-primary flex items-center"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Run Valuation
            </Link>
            <a
              href={`/api/export/xlsx/${deal.id}`}
              className="btn btn-secondary flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </a>
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              aria-label={`Delete deal ${deal.name}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Property Information */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Property Name</label>
              <p className="mt-1 text-sm text-gray-900">{deal.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="mt-1 text-sm text-gray-900">{deal.address}, {deal.city}, {deal.state} {deal.zip_code}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">MSA</label>
              <p className="mt-1 text-sm text-gray-900">{deal.msa || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Year Built</label>
              <p className="mt-1 text-sm text-gray-900">{deal.year_built || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500"># of Units</label>
              <p className="mt-1 text-sm text-gray-900">{deal.unit_count || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Average Unit SF</label>
              <p className="mt-1 text-sm text-gray-900">{deal.nsf ? `${deal.nsf.toLocaleString()} sq ft` : 'Not specified'}</p>
            </div>
          </div>
          {deal.deal_tags && deal.deal_tags.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-medium text-gray-500">Deal Tags</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {deal.deal_tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simple placeholder sections */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">NOI Trend</h3>
          <p className="text-gray-500">No T-12 data available</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">DSCR Trend</h3>
          <p className="text-gray-500">No valuation data available</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Valuation Runs</h3>
        <p className="text-gray-500">No valuation runs yet. Run your first valuation to see results.</p>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteDeal}
        title="Delete deal?"
        message={`This permanently deletes '${deal?.name}'. This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        type="danger"
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={handleToastClose}
      />
    </div>
  )
}