'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, MapPin, Calendar, Download, Upload, Calculator } from 'lucide-react'
import { Deal, ValuationRun, KPIs } from '@dealbase/shared'
import { KPICard } from '@/components/KPICard'
import { NOIChart } from '@/components/NOIChart'
import { DSCRChart } from '@/components/DSCRChart'

async function fetchDeal(id: string): Promise<Deal> {
  const response = await fetch(`/api/deals/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch deal')
  }
  return response.json()
}

async function fetchValuationRuns(dealId: string): Promise<ValuationRun[]> {
  const response = await fetch(`/api/valuation/runs/${dealId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch valuation runs')
  }
  return response.json()
}

export default function DealDetailPage() {
  const params = useParams()
  const dealId = params.id as string

  const { data: deal, isLoading: dealLoading, error: dealError } = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => fetchDeal(dealId),
  })

  const { data: valuationRuns, isLoading: runsLoading } = useQuery({
    queryKey: ['valuation-runs', dealId],
    queryFn: () => fetchValuationRuns(dealId),
  })

  if (dealLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deal...</p>
        </div>
      </div>
    )
  }

  if (dealError || !deal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading deal: {dealError?.message}</p>
          <Link href="/deals" className="mt-4 btn btn-primary">
            Back to Deals
          </Link>
        </div>
      </div>
    )
  }

  const latestRun = valuationRuns?.[0]

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
              <Link href="/intake" className="text-gray-700 hover:text-primary-600">
                Intake
              </Link>
              <Link href="/valuation" className="text-gray-700 hover:text-primary-600">
                Valuation
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/deals"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Deals
          </Link>
          <div className="mt-4 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{deal.name}</h1>
              <p className="mt-2 text-gray-600">{deal.property_type}</p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{deal.address}, {deal.city}, {deal.state} {deal.zip_code}</span>
              </div>
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Created {new Date(deal.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/intake/${deal.id}`}
                className="btn btn-secondary flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Data
              </Link>
              <Link
                href={`/valuation/${deal.id}`}
                className="btn btn-primary flex items-center"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Run Valuation
              </Link>
              <a
                href={`/api/export/xlsx/${deal.id}`}
                className="btn btn-secondary flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </a>
            </div>
          </div>
        </div>

        {/* KPI Rail */}
        {latestRun && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Key Performance Indicators</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard
                title="IRR"
                value={`${(latestRun.results.irr * 100).toFixed(1)}%`}
                trend="up"
              />
              <KPICard
                title="Equity Multiple"
                value={latestRun.results.equity_multiple.toFixed(2)}
                trend="up"
              />
              <KPICard
                title="DSCR"
                value={latestRun.results.dscr.toFixed(2)}
                trend="up"
              />
              <KPICard
                title="Cap Rate"
                value={`${(latestRun.results.cap_rate * 100).toFixed(1)}%`}
                trend="down"
              />
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-8">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">NOI Trend</h3>
            <NOIChart dealId={dealId} />
          </div>
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">DSCR Trend</h3>
            <DSCRChart dealId={dealId} />
          </div>
        </div>

        {/* Valuation Runs */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Valuation Runs</h3>
          {runsLoading ? (
            <p className="text-gray-500">Loading valuation runs...</p>
          ) : valuationRuns && valuationRuns.length > 0 ? (
            <div className="space-y-4">
              {valuationRuns.map((run) => (
                <div key={run.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{run.name}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(run.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      run.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : run.status === 'running'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                  {run.status === 'completed' && (
                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">IRR</p>
                        <p className="font-medium">{(run.results.irr * 100).toFixed(1)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Equity Multiple</p>
                        <p className="font-medium">{run.results.equity_multiple.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">DSCR</p>
                        <p className="font-medium">{run.results.dscr.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Cap Rate</p>
                        <p className="font-medium">{(run.results.cap_rate * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No valuation runs yet. Run your first valuation to see results.</p>
          )}
        </div>
      </main>
    </div>
  )
}
