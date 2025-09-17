'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, CheckCircle, AlertCircle, Download, Trash2, X, BarChart3, Calculator, Building2 } from 'lucide-react'

// Function to detect document type based on filename and content
const detectDocumentType = async (file: File): Promise<'t12' | 'rentroll' | 'om' | 'unknown'> => {
  const filename = file.name.toLowerCase()
  
  // Check filename patterns first
  if (filename.includes('t12') || filename.includes('t-12') || filename.includes('trailing') || filename.includes('financial')) {
    return 't12'
  }
  
  if (filename.includes('rent') || filename.includes('roll') || filename.includes('unit') || filename.includes('lease')) {
    return 'rentroll'
  }
  
  if (filename.includes('om') || filename.includes('offering') || filename.includes('memorandum')) {
    return 'om'
  }
  
  // If filename doesn't give clear indication, try to analyze content
  try {
    const text = await file.text()
    const content = text.toLowerCase()
    
    // Check for T12 indicators
    if (content.includes('gross rent') || content.includes('operating expenses') || content.includes('net operating income') || 
        content.includes('month') || content.includes('year') || content.includes('noi')) {
      return 't12'
    }
    
    // Check for rent roll indicators
    if (content.includes('unit number') || content.includes('unit type') || content.includes('actual rent') || 
        content.includes('market rent') || content.includes('lease start') || content.includes('tenant')) {
      return 'rentroll'
    }
    
    // Check for OM indicators
    if (content.includes('offering memorandum') || content.includes('property description') || 
        content.includes('investment summary') || content.includes('executive summary')) {
      return 'om'
    }
  } catch (error) {
    console.warn('Could not read file content for type detection:', error)
  }
  
  return 'unknown'
}

const getDocumentTypeInfo = (type: string) => {
  switch (type) {
    case 't12':
      return {
        title: 'T-12 Financial Data',
        description: '12 months of trailing financial data (income, expenses, NOI)',
        icon: Calculator,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      }
    case 'rentroll':
      return {
        title: 'Rent Roll Data',
        description: 'Unit-level rent roll data (units, rents, lease terms)',
        icon: Building2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      }
    case 'om':
      return {
        title: 'Offering Memorandum',
        description: 'Property offering memorandum and investment details',
        icon: FileText,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      }
    default:
      return {
        title: 'Financial Document',
        description: 'Upload any financial document (T-12, Rent Roll, or OM)',
        icon: BarChart3,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100'
      }
  }
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  dealName: string
  onUploadSuccess?: () => void
}

export function UploadModal({ isOpen, onClose, dealId, dealName, onUploadSuccess }: UploadModalProps) {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [detectedType, setDetectedType] = useState<string>('unknown')
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null)

  // Clear all state when modal is closed
  const handleClose = () => {
    setUploadStatus(null)
    setIsUploading(false)
    setSelectedFile(null)
    setDetectedType('unknown')
    onClose()
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.pdf')) {
        setSelectedFile(file)
        const type = await detectDocumentType(file)
        setDetectedType(type)
      }
    }
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.pdf')) {
        setSelectedFile(file)
        const type = await detectDocumentType(file)
        setDetectedType(type)
      } else {
        setUploadStatus({ success: false, message: 'Unsupported file type. Please upload CSV, Excel, or PDF files.' })
      }
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadStatus({ success: false, message: 'Uploading...' })

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      // Determine the correct API endpoint based on detected type
      let endpoint = '/api/intake/rentroll' // default fallback
      if (detectedType === 't12') {
        endpoint = '/api/intake/t12'
      } else if (detectedType === 'rentroll') {
        endpoint = '/api/intake/rentroll'
      } else if (detectedType === 'om') {
        endpoint = '/api/intake/om' // You may need to create this endpoint
      }

      const response = await fetch(`${endpoint}/${dealId}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      if (result.success) {
        setUploadStatus({ success: true, message: result.message || 'Upload successful!' })

        // Close modal after successful upload and refresh page
        setTimeout(() => {
          handleClose()
          if (onUploadSuccess) {
            onUploadSuccess()
          } else {
            router.refresh()
          }
        }, 1500)
      } else {
        setUploadStatus({ 
          success: false, 
          message: result.message || result.error || 'Upload failed. Please try again.' 
        })
      }

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus({ 
        success: false, 
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  const typeInfo = getDocumentTypeInfo(detectedType)
  const IconComponent = typeInfo.icon

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Data</h2>
            <p className="text-sm text-gray-600">
              Upload financial data for <span className="font-medium">{dealName}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Upload Status Message */}
        {uploadStatus && (
          <div
            className={`mx-6 mt-4 p-4 rounded-lg flex items-center ${
              uploadStatus.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {uploadStatus.success ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className={`text-sm font-medium ${
              uploadStatus.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {uploadStatus.message}
            </span>
          </div>
        )}

        {/* Upload Section */}
        <div className="p-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{typeInfo.title}</h3>
                <p className="text-sm text-gray-600">{typeInfo.description}</p>
              </div>
              <div className={`w-12 h-12 ${typeInfo.bgColor} rounded-lg flex items-center justify-center`}>
                <IconComponent className={`h-6 w-6 ${typeInfo.color}`} />
              </div>
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
                      {(selectedFile.size / 1024).toFixed(1)} KB • Detected as {typeInfo.title}
                    </p>
                  </div>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={() => {
                        setSelectedFile(null)
                        setDetectedType('unknown')
                        setUploadStatus(null)
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </button>
                    <button
                      onClick={handleFileUpload}
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
                      Drop your file here, or{' '}
                      <label className="text-primary-600 hover:text-primary-500 cursor-pointer">
                        browse
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls,.pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </p>
                    <p className="text-sm text-gray-500">CSV, XLSX, PDF files supported, max 10MB</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Supports T-12 financials, rent rolls, and offering memorandums
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
