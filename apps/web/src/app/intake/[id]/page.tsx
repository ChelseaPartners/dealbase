'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Building2, Upload, FileText, CheckCircle, AlertCircle, Download, Trash2 } from 'lucide-react'
import { Deal } from '@dealbase/shared'

async function fetchDeal(id: string): Promise<Deal> {
  const response = await fetch(`/api/deals/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch deal')
  }
  return response.json()
}

interface FileUploadProps {
  type: 't12' | 'rentroll'
  dealId: string
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
}

function FileUpload({ type, dealId, onUpload, isUploading }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file)
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile)
      setSelectedFile(null)
    }
  }

  const isT12 = type === 't12'
  const title = isT12 ? 'T-12 Financial Data' : 'Rent Roll Data'
  const description = isT12 
    ? 'Upload 12 months of trailing financial data (income, expenses, NOI)'
    : 'Upload unit-level rent roll data (units, rents, lease terms)'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <FileText className="h-6 w-6 text-primary-600" />
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-primary-400 bg-primary-50'
            : selectedFile
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setSelectedFile(null)}
                className="btn btn-secondary btn-sm"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="btn btn-primary btn-sm"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Drop your CSV file here, or{' '}
                <label className="text-primary-600 hover:text-primary-500 cursor-pointer">
                  browse
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500">CSV files only, max 10MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Sample Data Link */}
      <div className="mt-4 text-center">
        <a
          href={`/api/sample/${type}`}
          className="text-sm text-primary-600 hover:text-primary-500 flex items-center justify-center"
        >
          <Download className="h-4 w-4 mr-1" />
          Download sample {isT12 ? 'T-12' : 'Rent Roll'} template
        </a>
      </div>
    </div>
  )
}

export default function IntakePage() {
  const params = useParams()
  const router = useRouter()
  const dealId = params.id as string

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => fetchDeal(dealId),
  })

  const [isUploadingT12, setIsUploadingT12] = useState(false)
  const [isUploadingRentRoll, setIsUploadingRentRoll] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<Record<string, { success: boolean; message: string }>>({})

  const handleFileUpload = async (type: 't12' | 'rentroll', file: File) => {
    const setIsUploading = type === 't12' ? setIsUploadingT12 : setIsUploadingRentRoll
    
    setIsUploading(true)
    setUploadStatus(prev => ({ ...prev, [type]: { success: false, message: 'Uploading...' } }))

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/intake/${type}/${dealId}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      setUploadStatus(prev => ({ 
        ...prev, 
        [type]: { success: true, message: 'Upload successful!' } 
      }))

      // Redirect to deal detail page after successful upload
      setTimeout(() => {
        router.push(`/deals/${dealId}`)
      }, 1500)

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus(prev => ({ 
        ...prev, 
        [type]: { success: false, message: 'Upload failed. Please try again.' } 
      }))
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deal...</p>
        </div>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading deal: {error?.message}</p>
          <Link href="/deals" className="mt-4 btn btn-primary">
            Back to Deals
          </Link>
        </div>
      </div>
    )
  }

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
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Data Intake</h1>
            <p className="mt-2 text-gray-600">
              Upload financial data for <span className="font-medium">{deal.name}</span>
            </p>
          </div>
        </div>

        {/* Upload Status Messages */}
        {Object.entries(uploadStatus).map(([type, status]) => (
          <div
            key={type}
            className={`mb-4 p-4 rounded-lg flex items-center ${
              status.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {status.success ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className={`text-sm font-medium ${
              status.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {status.message}
            </span>
          </div>
        ))}

        {/* Upload Sections */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <FileUpload
            type="t12"
            dealId={dealId}
            onUpload={(file) => handleFileUpload('t12', file)}
            isUploading={isUploadingT12}
          />
          
          <FileUpload
            type="rentroll"
            dealId={dealId}
            onUpload={(file) => handleFileUpload('rentroll', file)}
            isUploading={isUploadingRentRoll}
          />
        </div>

        {/* Instructions */}
        <div className="mt-8 card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Requirements</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">T-12 Financial Data</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 12 months of trailing data</li>
                <li>• Gross rent, other income, operating expenses</li>
                <li>• Net operating income (NOI)</li>
                <li>• CSV format with month/year columns</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Rent Roll Data</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Unit-level rent information</li>
                <li>• Unit numbers, types, square footage</li>
                <li>• Current rent and market rent</li>
                <li>• Lease start/end dates</li>
              </ul>
            </div>
          </div>
        </div>
    </div>
  )
}