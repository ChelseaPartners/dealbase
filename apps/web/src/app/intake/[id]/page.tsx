'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Upload, FileText, CheckCircle } from 'lucide-react'
import { IntakeResponse } from '@dealbase/shared'

export default function IntakePage() {
  const params = useParams()
  const dealId = params.id as string
  
  const [t12File, setT12File] = useState<File | null>(null)
  const [rentRollFile, setRentRollFile] = useState<File | null>(null)
  const [t12Result, setT12Result] = useState<IntakeResponse | null>(null)
  const [rentRollResult, setRentRollResult] = useState<IntakeResponse | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleT12Upload = async () => {
    if (!t12File) return
    
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', t12File)
      
      const response = await fetch(`/api/intake/t12/${dealId}`, {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      setT12Result(result)
    } catch (error) {
      console.error('Error uploading T-12:', error)
      alert('Failed to upload T-12 file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRentRollUpload = async () => {
    if (!rentRollFile) return
    
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', rentRollFile)
      
      const response = await fetch(`/api/intake/rentroll/${dealId}`, {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      setRentRollResult(result)
    } catch (error) {
      console.error('Error uploading rent roll:', error)
      alert('Failed to upload rent roll file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">DealBase</h1>
            </div>
            <nav className="flex space-x-8">
              <Link href="/deals" className="text-gray-700 hover:text-primary-600">
                Deals
              </Link>
              <Link href="/intake" className="text-primary-600 font-medium">
                Intake
              </Link>
              <Link href="/valuation" className="text-gray-700 hover:text-primary-600">
                Valuation
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/deals/${dealId}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Deal
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Data Intake</h1>
          <p className="mt-2 text-gray-600">Upload and validate your T-12 and Rent Roll data</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* T-12 Upload */}
          <div className="card">
            <div className="flex items-center mb-4">
              <FileText className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">T-12 Data</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload T-12 File (CSV or Excel)
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setT12File(e.target.files?.[0] || null)}
                  className="input"
                />
              </div>
              
              <button
                onClick={handleT12Upload}
                disabled={!t12File || isUploading}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload T-12'}
              </button>
              
              {t12Result && (
                <div className={`p-4 rounded-lg ${
                  t12Result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    <CheckCircle className={`h-5 w-5 mr-2 ${
                      t12Result.success ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className={`font-medium ${
                      t12Result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {t12Result.message}
                    </span>
                  </div>
                  
                  {t12Result.success && t12Result.preview_data.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Preview Data</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {Object.keys(t12Result.preview_data[0]).map((key) => (
                                <th key={key} className="text-left py-2 pr-4">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {t12Result.preview_data.slice(0, 5).map((row, index) => (
                              <tr key={index} className="border-b">
                                {Object.values(row).map((value, i) => (
                                  <td key={i} className="py-2 pr-4">{String(value)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rent Roll Upload */}
          <div className="card">
            <div className="flex items-center mb-4">
              <Upload className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Rent Roll Data</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Rent Roll File (CSV or Excel)
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setRentRollFile(e.target.files?.[0] || null)}
                  className="input"
                />
              </div>
              
              <button
                onClick={handleRentRollUpload}
                disabled={!rentRollFile || isUploading}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Rent Roll'}
              </button>
              
              {rentRollResult && (
                <div className={`p-4 rounded-lg ${
                  rentRollResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center">
                    <CheckCircle className={`h-5 w-5 mr-2 ${
                      rentRollResult.success ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className={`font-medium ${
                      rentRollResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {rentRollResult.message}
                    </span>
                  </div>
                  
                  {rentRollResult.success && rentRollResult.preview_data.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Preview Data</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              {Object.keys(rentRollResult.preview_data[0]).map((key) => (
                                <th key={key} className="text-left py-2 pr-4">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rentRollResult.preview_data.slice(0, 5).map((row, index) => (
                              <tr key={index} className="border-b">
                                {Object.values(row).map((value, i) => (
                                  <td key={i} className="py-2 pr-4">{String(value)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        {(t12Result?.success || rentRollResult?.success) && (
          <div className="mt-8 card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Next Steps</h3>
            <div className="flex space-x-4">
              <Link
                href={`/valuation/${dealId}`}
                className="btn btn-primary"
              >
                Run Valuation
              </Link>
              <Link
                href={`/deals/${dealId}`}
                className="btn btn-secondary"
              >
                View Deal Details
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
