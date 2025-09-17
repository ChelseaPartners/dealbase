'use client'

import { useState, useEffect } from 'react'
import { X, FileText, CheckCircle, XCircle, Clock, AlertCircle, Link as LinkIcon } from 'lucide-react'

interface Document {
  id: number
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  processing_status: string
  processing_error?: string
  created_at: string
  updated_at: string
}

interface ReLinkRentRollModalProps {
  isOpen: boolean
  onClose: () => void
  dealId: string
  onLink: (rrId: number) => Promise<void>
}

export function ReLinkRentRollModal({ isOpen, onClose, dealId, onLink }: ReLinkRentRollModalProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
    }
  }, [isOpen, dealId])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/deals/${dealId}/documents`)
      if (response.ok) {
        const data = await response.json()
        // Filter for rent roll documents only
        const rentRollDocs = data.filter((doc: Document) => doc.file_type === 'rent_roll')
        setDocuments(rentRollDocs)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
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

  const handleLink = async () => {
    if (!selectedDocId) return

    setLinking(true)
    try {
      await onLink(selectedDocId)
      onClose()
    } catch (error) {
      console.error('Failed to link rent roll:', error)
    } finally {
      setLinking(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-0 border w-4/5 max-w-4xl shadow-lg rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Re-link Existing Rent Roll</h3>
            <p className="text-sm text-gray-500">Select a rent roll document to link to Unit Mix</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Rent Roll Documents</h4>
              <p className="text-gray-500">Upload a rent roll file first to link it to Unit Mix</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedDocId === doc.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedDocId(doc.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(doc.processing_status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.original_filename}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatFileSize(doc.file_size)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(doc.created_at)}
                        </span>
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
                      </div>
                      {doc.processing_error && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {doc.processing_error}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedDocId === doc.id && (
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-primary-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedDocId ? 'Ready to link selected document' : 'Select a document to continue'}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedDocId || linking}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {linking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Linking...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link to Unit Mix
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
