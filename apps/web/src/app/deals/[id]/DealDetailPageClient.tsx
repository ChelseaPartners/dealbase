'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, MapPin, Calendar, Download, Upload, Calculator, FileText, BarChart3 } from 'lucide-react'
import { Deal } from '@/types/deal'
import { UploadModal } from '@/components/UploadModal'

export function DealDetailPageClient({ 
  deal, 
  dealId, 
  isLoading, 
  error 
}: { 
  deal: Deal | null
  dealId: string
  isLoading: boolean
  error: string | null
}) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

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
            <button
              onClick={() => {
                console.log('Upload Data button clicked!')
                setIsUploadModalOpen(true)
              }}
              className="btn btn-secondary flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </button>
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
                {deal.deal_tags.map((tag: string, index: number) => (
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

      {/* Core Data */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Core Data</h2>
          <p className="text-sm text-gray-500 mb-6">Access and analyze key property data</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href={`/deals/${deal.id}/rentroll`}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-semibold text-gray-900">Rent Roll</h3>
                <p className="text-sm text-gray-500">View detailed unit-level rent roll data</p>
              </div>
            </Link>
            <Link
              href={`/deals/${deal.id}/unit-mix`}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-semibold text-gray-900">Unit Mix Analysis</h3>
                <p className="text-sm text-gray-500">Analyze unit types and performance</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Data Status */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Status</h2>
          <p className="text-sm text-gray-500 mb-6">Current status of uploaded data files</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Rent Roll Data</h3>
                  <p className="text-xs text-gray-500">Unit-level rent information</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Check Status
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <BarChart3 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">T-12 Financial Data</h3>
                  <p className="text-xs text-gray-500">12-month trailing financials</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Check Status
              </span>
            </div>
          </div>
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

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        dealId={deal.id.toString()}
        dealName={deal.name}
      />
    </div>
  )
}
