'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Calculator, TrendingUp, DollarSign, Percent, Calendar, ArrowRight } from 'lucide-react'

interface ValuationData {
  latest_run: {
    id: number
    name: string
    created_at: string
    purchase_price: number
    loan_amount: number
    exit_cap_rate: number
    hold_period: number
    interest_rate: number
    vacancy_rate: number
    expense_ratio: number
    kpis: {
      irr: number
      npv: number
      dscr: number
      ltv: number
      cap_rate: number
      cash_on_cash: number
    }
  } | null
  total_runs: number
}

interface ValuationSectionProps {
  dealId: string
}

async function fetchValuationData(dealId: string): Promise<ValuationData> {
  const response = await fetch(`/api/valuation/runs/${dealId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch valuation data')
  }
  const runs = await response.json()
  
  return {
    latest_run: runs.length > 0 ? runs[0] : null,
    total_runs: runs.length
  }
}

export function ValuationSection({ dealId }: ValuationSectionProps) {
  const { data: valuationData, isLoading, error } = useQuery({
    queryKey: ['valuation-data', dealId],
    queryFn: () => fetchValuationData(dealId),
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !valuationData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Valuations Yet</h3>
          <p className="text-sm text-gray-500 mb-4">Run your first valuation to see metrics here</p>
          <Link
            href={`/valuation/${dealId}`}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Start Valuation
          </Link>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const latestRun = valuationData.latest_run

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Valuation Summary</h2>
        <p className="text-sm text-gray-500">Latest valuation metrics and results</p>
      </div>

      {latestRun ? (
        <div className="space-y-6">
          {/* Valuation Header */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-primary-900">{latestRun.name}</h3>
                <div className="flex items-center text-sm text-primary-700 mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Last run: {new Date(latestRun.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-900">
                  {formatCurrency(latestRun.purchase_price)}
                </div>
                <div className="text-sm text-primary-700">Purchase Price</div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">IRR</div>
                <TrendingUp className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(latestRun.kpis.irr)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">NPV</div>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(latestRun.kpis.npv)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">DSCR</div>
                <Percent className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {latestRun.kpis.dscr.toFixed(2)}x
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">LTV</div>
                <Percent className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(latestRun.kpis.ltv)}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm font-semibold text-gray-900">{latestRun.hold_period} years</div>
                <div className="text-xs text-gray-500">Hold Period</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{formatPercentage(latestRun.exit_cap_rate)}</div>
                <div className="text-xs text-gray-500">Exit Cap Rate</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <Link
              href={`/valuation/${dealId}`}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <Calculator className="h-5 w-5 mr-2" />
              Valuation
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Valuations Yet</h3>
          <p className="text-sm text-gray-500 mb-4">Run your first valuation to see metrics here</p>
          <Link
            href={`/valuation/${dealId}`}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Start Valuation
          </Link>
        </div>
      )}
    </div>
  )
}
