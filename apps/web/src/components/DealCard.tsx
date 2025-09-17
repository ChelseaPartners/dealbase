'use client'

import Link from 'next/link'
import { MapPin, Calendar, Building2, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { Deal, ValuationRun } from '@dealbase/shared'

interface DealCardProps {
  deal: Deal
  latestValuation?: ValuationRun
  className?: string
}

export function DealCard({ deal, latestValuation, className = '' }: DealCardProps) {
  const getStatusBadge = (status: string) => {
    const baseClasses = 'badge'
    switch (status) {
      case 'active':
        return `${baseClasses} badge-success`
      case 'completed':
        return `${baseClasses} badge-info`
      case 'archived':
        return `${baseClasses} badge-gray`
      default:
        return `${baseClasses} badge-warning`
    }
  }

  const getWorkflowStatus = () => {
    if (latestValuation?.status === 'completed') {
      return { status: 'completed', text: 'Analysis Complete', icon: CheckCircle, color: 'text-green-600' }
    }
    if (latestValuation?.status === 'running') {
      return { status: 'running', text: 'Calculating...', icon: TrendingUp, color: 'text-blue-600' }
    }
    if (latestValuation) {
      return { status: 'pending', text: 'Valuation Pending', icon: AlertCircle, color: 'text-yellow-600' }
    }
    return { status: 'draft', text: 'Setup Required', icon: AlertCircle, color: 'text-gray-600' }
  }

  const workflowStatus = getWorkflowStatus()
  const StatusIcon = workflowStatus.icon

  return (
    <Link
      href={`/deals/${deal.id}`}
      className={`card group hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Building2 className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {deal.name}
            </h3>
          </div>
          <p className="text-sm text-gray-600 mb-2">{deal.property_type}</p>
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <MapPin className="h-4 w-4 mr-1" />
            <span>{deal.city}, {deal.state}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Created {new Date(deal.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={getStatusBadge(deal.status)}>
            {deal.status}
          </span>
          <div className={`flex items-center text-xs ${workflowStatus.color}`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            <span>{workflowStatus.text}</span>
          </div>
        </div>
      </div>

      {/* KPI Preview */}
      {latestValuation?.status === 'completed' && latestValuation.results && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">IRR</p>
              <p className="text-lg font-semibold text-gray-900">
                {(latestValuation.results.irr * 100).toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">DSCR</p>
              <p className="text-lg font-semibold text-gray-900">
                {latestValuation.results.dscr.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {deal.description && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 line-clamp-2">
            {deal.description}
          </p>
        </div>
      )}

      {/* Hover Effect Indicator */}
      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-primary-200 transition-colors duration-200 pointer-events-none"></div>
    </Link>
  )
}
