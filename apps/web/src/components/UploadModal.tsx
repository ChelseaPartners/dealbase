'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Download, Trash2, X } from 'lucide-react'

interface FileUploadProps {
  type: 't12' | 'rentroll'
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
}

function FileUpload({ type, onUpload, isUploading }: FileUploadProps) {
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
      if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <FileText className="h-6 w-6 text-primary-600" />
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
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
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
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
            <Upload className="h-10 w-10 text-gray-400 mx-auto" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Drop your file here, or{' '}
                <label className="text-primary-600 hover:text-primary-500 cursor-pointer">
                  browse
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500">CSV, XLSX files supported, max 10MB</p>
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

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  dealName: string
}

export function UploadModal({ isOpen, onClose, dealId, dealName }: UploadModalProps) {
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

      // Close modal after successful upload
      setTimeout(() => {
        onClose()
        setUploadStatus({})
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Data</h2>
            <p className="text-sm text-gray-600">
              Upload financial data for <span className="font-medium">{dealName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Upload Status Messages */}
        {Object.entries(uploadStatus).map(([type, status]) => (
          <div
            key={type}
            className={`mx-6 mt-4 p-4 rounded-lg flex items-center ${
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
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FileUpload
              type="t12"
              onUpload={(file) => handleFileUpload('t12', file)}
              isUploading={isUploadingT12}
            />
            
            <FileUpload
              type="rentroll"
              onUpload={(file) => handleFileUpload('rentroll', file)}
              isUploading={isUploadingRentRoll}
            />
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Requirements</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">T-12 Financial Data</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 12 months of trailing data</li>
                  <li>• Gross rent, other income, operating expenses</li>
                  <li>• Net operating income (NOI)</li>
                  <li>• CSV/XLSX format with month/year columns</li>
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

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
