'use client'

import Link from 'next/link'
import { FileText, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

interface RentRollStatusProps {
  dealId: string
  hasRentRollData?: boolean
  createdDate?: string
  error?: string
}

export function RentRollStatus({ dealId, hasRentRollData = false, createdDate, error }: RentRollStatusProps) {
  const getStatusInfo = () => {
    if (hasRentRollData) {
      return null // No status pill when rent roll exists - we'll show the button instead
    } else {
      return {
        icon: <XCircle className="h-4 w-4 text-red-600" />,
        text: 'No rent roll linked',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800'
      }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
          <FileText className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Rent Roll Data</h3>
          <p className="text-xs text-gray-500">Unit-level rent information</p>
          {error && (
            <p className="text-xs text-red-600 mt-1">Error: {error}</p>
          )}
          {createdDate && (
            <p className="text-xs text-gray-400 mt-1">Updated: {new Date(createdDate).toLocaleDateString()}</p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {statusInfo && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
            {statusInfo.icon}
            <span className="ml-1">{statusInfo.text}</span>
          </span>
        )}
        {hasRentRollData && (
          <Link
            href={`/deals/${dealId}/rentroll`}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
          >
            Open Rent Roll Dataset
          </Link>
        )}
      </div>
    </div>
  )
}
