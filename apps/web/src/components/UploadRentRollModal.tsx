'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

interface UploadRentRollModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  onUploadComplete: (rrId: number) => Promise<void>
  onUploadSaveOnly?: () => Promise<void>
}

export function UploadRentRollModal({ isOpen, onClose, dealId, onUploadComplete, onUploadSaveOnly }: UploadRentRollModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedDoc, setUploadedDoc] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a CSV, XLS, or XLSX file')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setError(null)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('file_type', 'rent_roll')

      // Create an AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

      const response = await fetch(`/api/intake/rentroll/${dealId}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setUploadedDoc(result)
        setError(null)
        
        // Show retry info if there were retries
        if (result.retry_info && (result.retry_info.processing_retries > 0 || result.retry_info.persistence_retries > 0)) {
          console.log('Upload completed with retries:', result.retry_info)
        }
      } else {
        throw new Error(result.message || 'Upload failed')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Upload timed out. Please try again with a smaller file or check your connection.')
      } else if (err.message.includes('Failed to detect')) {
        setError('Could not process this file. Please ensure it contains rent roll data with unit numbers and rent amounts.')
      } else if (err.message.includes('No valid unit rows found')) {
        setError('No valid rent roll data found in this file. Please check the format and try again.')
      } else {
        setError(`Upload failed: ${err.message || 'Please try again.'}`)
      }
      console.error('Upload error:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleSaveAndLink = async () => {
    if (!uploadedDoc) return

    try {
      await onUploadComplete(uploadedDoc.id)
      onClose()
    } catch (err) {
      setError('Failed to save and link to Unit Mix. Please try again.')
      console.error('Save and link error:', err)
    }
  }

  const handleSaveOnly = async () => {
    if (!uploadedDoc) return

    try {
      if (onUploadSaveOnly) {
        await onUploadSaveOnly()
      }
      onClose()
    } catch (err) {
      setError('Failed to save document. Please try again.')
      console.error('Save only error:', err)
    }
  }

  const handleClose = () => {
    setUploadedDoc(null)
    setError(null)
    setUploading(false)
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-0 border w-4/5 max-w-2xl shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upload New Rent Roll</h3>
            <p className="text-sm text-gray-500">Upload a rent roll file and link it to Unit Mix</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!uploadedDoc ? (
            <div>
              {/* Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-gray-600">Uploading file...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop your rent roll file here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      or click to browse files
                    </p>
                    <p className="text-xs text-gray-400">
                      Supports CSV, XLS, XLSX files up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          ) : (
            /* Upload Success */
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload & Processing Complete!</h4>
              <p className="text-gray-600 mb-4">
                <strong>{uploadedDoc.filename}</strong> has been uploaded, processed, and linked to Unit Mix.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">File size:</span>
                  <span className="font-medium">{formatFileSize(uploadedDoc.file_size)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Records processed:</span>
                  <span className="font-medium">{uploadedDoc.records_processed || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium text-green-600">Processed & Linked</span>
                </div>
                {uploadedDoc.issues_found > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-600">Issues found:</span>
                    <span className="font-medium text-yellow-600">{uploadedDoc.issues_found}</span>
                  </div>
                )}
              </div>
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <h5 className="text-sm font-medium text-green-900 mb-2">Ready to Use!</h5>
                <p className="text-sm text-green-700">
                  Your rent roll data has been automatically processed and is now available in Unit Mix. 
                  You can view the data and make adjustments as needed.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {uploadedDoc ? 'Processing complete - ready to view Unit Mix' : 'Upload a file to continue'}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {uploadedDoc ? 'Close' : 'Close'}
            </button>
            {uploadedDoc && (
              <button
                onClick={() => {
                  handleClose()
                  // Trigger refresh of parent component to show new data
                  if (onUploadComplete) {
                    onUploadComplete(uploadedDoc.document_id)
                  }
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Unit Mix
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
