'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Building2, MapPin, Calendar, Download, Upload, Calculator, FileText, BarChart3, TrendingUp, Percent, Users, Building } from 'lucide-react'
import { Deal } from '@/types/deal'
import { UploadModal } from '@/components/UploadModal'
import { DocumentsSection } from '@/components/DocumentsSection'
import { ValuationSection } from '@/components/ValuationSection'

export function DealDetailPageClient({ 
  deal, 
  dealId, 
  isLoading, 
  error 
}: { 
  deal: Deal | null
  dealId: string
  isLoading: boolean
  error: string | null
}) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [unitMixData, setUnitMixData] = useState<any>(null)
  const [unitMixLoading, setUnitMixLoading] = useState(true)

  // Fetch unit mix data
  useEffect(() => {
    const fetchUnitMix = async () => {
      try {
        const response = await fetch(`/api/deals/${dealId}/unit-mix`)
        if (response.ok) {
          const data = await response.json()
          setUnitMixData(data)
        } else {
          setUnitMixData(null)
        }
      } catch (error) {
        console.error('Error fetching unit mix:', error)
        setUnitMixData(null)
      } finally {
        setUnitMixLoading(false)
      }
    }

    if (dealId) {
      fetchUnitMix()
    }
  }, [dealId])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !deal) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Deal Not Found</h1>
          <p className="text-gray-600 mb-8">The deal you're looking for doesn't exist or has been deleted.</p>
          <Link
            href="/deals"
            className="btn btn-primary"
          >
            Back to Deals
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          href="/deals"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Deals
        </Link>
      </div>

      {/* Deal Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{deal.name}</h1>
            <div className="flex items-center mt-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Created {new Date(deal.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex space-x-3">
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

      {/* Deal Dashboard Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Property Value Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Property Value</p>
              <p className="text-2xl font-bold text-gray-900">$12.5M</p>
              <p className="text-sm text-green-600">↑ +2.3%</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* NOI Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Net Operating Income</p>
              <p className="text-2xl font-bold text-gray-900">$847K</p>
              <p className="text-sm text-green-600">↑ +5.1%</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Cap Rate Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Cap Rate</p>
              <p className="text-2xl font-bold text-gray-900">6.8%</p>
              <p className="text-sm text-gray-500">Market avg: 6.2%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Percent className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Occupancy Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Occupancy Rate</p>
              <p className="text-2xl font-bold text-gray-900">94.2%</p>
              <p className="text-sm text-green-600">↑ +1.2%</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid - Optimized for 16:9 Landscape View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Property Information, Valuation, Documents */}
        <div className="space-y-6">
          {/* Property Information Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Property Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500">Address</span>
                <span className="text-xs text-gray-900 text-right">{deal.address}, {deal.city}, {deal.state} {deal.zip_code}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500">Property Type</span>
                <span className="text-xs text-gray-900">{deal.property_type}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500">Year Built</span>
                <span className="text-xs text-gray-900">{deal.year_built || 'Not specified'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500">Units</span>
                <span className="text-xs text-gray-900">{deal.unit_count || 'Not specified'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-medium text-gray-500">Avg Unit SF</span>
                <span className="text-xs text-gray-900">{deal.nsf ? `${deal.nsf.toLocaleString()} sq ft` : 'Not specified'}</span>
              </div>
            </div>
            {deal.deal_tags && deal.deal_tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-500 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {deal.deal_tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Valuation */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Valuation Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-medium text-gray-500">Current Value</span>
                <span className="text-sm font-bold text-gray-900">$12.5M</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-medium text-gray-500">Purchase Price</span>
                <span className="text-xs text-gray-900">$11.2M</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-medium text-gray-500">Appreciation</span>
                <span className="text-xs text-green-600 font-medium">+11.6%</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-medium text-gray-500">Cap Rate</span>
                <span className="text-xs text-gray-900">6.8%</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Link
                href={`/valuation/${deal.id}`}
                className="inline-flex items-center w-full justify-center px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Run New Valuation
              </Link>
            </div>
          </div>

          {/* Documents */}
          <div className="h-80">
            <DocumentsSection 
              dealId={dealId} 
              onUploadClick={() => setIsUploadModalOpen(true)}
            />
          </div>

        </div>

        {/* Middle Column - Cash Flow, Unit Mix, Historical Financials */}
        <div className="space-y-6">
          {/* 5-Year Pro Forma Cash Flow Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">5-Year Pro Forma Cash Flow Summary</h3>
              <div className="flex space-x-1">
                <button className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">1Y</button>
                <button className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700">3Y</button>
                <button className="px-2 py-1 text-xs font-medium text-primary-600 bg-primary-50 rounded">5Y</button>
              </div>
            </div>
            
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500 mb-1">Pro Forma Cash Flow Chart</p>
                <p className="text-xs text-gray-400">5-year projected cash flow analysis will be displayed here</p>
              </div>
            </div>
            
            <div className="mt-3 flex justify-center">
              <Link
                href={`/deals/${deal.slug}/financials`}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors"
              >
                View Full Financials
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>

          {/* Unit Mix */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Unit Mix</h3>
              <Link
                href={`/deals/${deal.slug}/unit-mix`}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                View Details →
              </Link>
            </div>
            
            <div className="flex items-center justify-center">
              {unitMixLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  <p className="text-xs text-gray-500">Loading...</p>
                </div>
              ) : unitMixData && unitMixData.unit_mix && unitMixData.unit_mix.length > 0 ? (
                <div className="w-full space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-lg font-bold text-gray-900">{unitMixData.totals.total_units}</div>
                      <div className="text-xs text-gray-500">Total Units</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-lg font-bold text-gray-900">
                        {unitMixData.totals.total_units > 0 
                          ? ((unitMixData.totals.total_occupied / unitMixData.totals.total_units) * 100).toFixed(0)
                          : 0}%
                      </div>
                      <div className="text-xs text-gray-500">Occupancy</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {unitMixData.unit_mix.length} unit types configured
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <BarChart3 className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 mb-2">No unit mix data</p>
                  <Link
                    href={`/deals/${deal.slug}/unit-mix`}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 transition-colors"
                  >
                    Configure Unit Mix
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Historical Financials */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Historical Financials</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500 mb-1">Historical Financial Data</p>
                <p className="text-xs text-gray-400">T-12 and historical performance data will be displayed here</p>
              </div>
            </div>
            <div className="mt-3 flex justify-center">
              <Link
                href={`/deals/${deal.slug}/financials`}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded hover:bg-primary-100 transition-colors"
              >
                View Full Financials
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>

        </div>

        {/* Right Column - Placeholder sections */}
        <div className="space-y-6">
          {/* Placeholder Section 1 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Market Analysis</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-medium text-gray-500">Market Cap Rate</span>
                <span className="text-xs text-gray-900">6.2%</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-medium text-gray-500">Rent Growth (YoY)</span>
                <span className="text-xs text-green-600 font-medium">+3.2%</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-medium text-gray-500">Vacancy Rate</span>
                <span className="text-xs text-gray-900">5.8%</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs font-medium text-gray-500">Market Rank</span>
                <span className="text-xs text-blue-600 font-medium">Top 25%</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <button className="inline-flex items-center w-full justify-center px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
                View Market Report
              </button>
            </div>
          </div>

          {/* Placeholder Section 2 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Action Items</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200">
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-xs font-medium text-gray-900">Upload rent roll data</span>
                </div>
                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Upload →
                </button>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-xs font-medium text-gray-900">Complete financial analysis</span>
                </div>
                <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Analyze →
                </button>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs font-medium text-gray-900">Run valuation model</span>
                </div>
                <button className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Run →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>




      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        dealId={deal.id.toString()}
        dealName={deal.name}
        onUploadSuccess={() => {
          // Add a small delay to ensure database transaction is committed
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }}
      />
    </div>
  )
}
