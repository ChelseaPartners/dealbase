'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Clock, CheckCircle, XCircle, AlertCircle, Upload, Eye, Trash2 } from 'lucide-react'

interface Document {
  id: number
  filename: string
  file_type: string
  file_size: number
  processing_status: string
  processing_error?: string
  created_at: string
  updated_at: string
}

interface DocumentsSectionProps {
  dealId: string
  onUploadClick?: () => void
}

export function DocumentsSection({ dealId, onUploadClick }: DocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [dealId])

  const fetchDocuments = async () => {
    if (!dealId || dealId === '') {
      console.error('No deal ID provided for fetching documents')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/deals/${dealId}/documents`)
      if (response.ok) {
        const data = await response.json()
        // Ensure data is an array
        if (Array.isArray(data)) {
          setDocuments(data)
        } else {
          console.error('Documents API returned non-array data:', data)
          setDocuments([])
        }
      } else {
        console.error('Failed to fetch documents, status:', response.status)
        setDocuments([])
        setError('Failed to load documents. Please try again.')
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
      setDocuments([])
      setError('Failed to load documents. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'uploaded':
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Processed'
      case 'failed':
        return 'Failed'
      case 'processing':
        return 'Processing'
      case 'uploaded':
        return 'Uploaded'
      default:
        return 'Pending'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleViewDocument = (docId: number) => {
    // Navigate to document view page or open in modal
    console.log('View document:', docId)
    // This would typically navigate to a document view page
    // window.open(`/deals/${dealId}/documents/${docId}`, '_blank')
  }

  const handleDownloadDocument = (docId: number, filename: string) => {
    // Download the document
    console.log('Download document:', docId, filename)
    // This would typically trigger a download
    // window.open(`/api/deals/${dealId}/documents/${docId}/download`, '_blank')
  }

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      // Delete the document
      const response = await fetch(`/api/deals/${dealId}/documents/${docId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete document')
      }
      
      // Refresh the documents list
      fetchDocuments()
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case 'rent_roll':
        return 'Rent Roll'
      case 't12':
        return 'T-12 Financial'
      default:
        return fileType
    }
  }

  if (!dealId || dealId === '') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Unable to load documents - Deal ID not available</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
        <div className="flex items-center space-x-3">
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </button>
          )}
          <FileText className="h-5 w-5 text-gray-400" />
        </div>
      </div>
      
      {error ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-500">{error}</p>
          <button
            onClick={fetchDocuments}
            className="mt-2 text-sm text-primary-600 hover:text-primary-700"
          >
            Try again
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No documents uploaded yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload rent roll or T-12 files to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.isArray(documents) && documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(doc.processing_status)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.filename}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-gray-500">
                      {getFileTypeLabel(doc.file_type)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(doc.file_size)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                  {doc.processing_error && (
                    <p className="text-xs text-red-600 mt-1">
                      Error: {doc.processing_error}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  doc.processing_status === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : doc.processing_status === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : doc.processing_status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : doc.processing_status === 'uploaded'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusText(doc.processing_status)}
                </span>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleViewDocument(doc.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View document"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
