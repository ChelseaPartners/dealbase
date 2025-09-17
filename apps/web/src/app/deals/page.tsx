import Link from 'next/link'
import { Plus, Building2, Eye } from 'lucide-react'

// Server-side data fetching
async function getDeals() {
  try {
    const response = await fetch('http://localhost:8000/api/deals', {
      cache: 'no-store', // Always fetch fresh data
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching deals:', error)
    return []
  }
}

export default async function DealsPage() {
  const deals = await getDeals()
  const isLoading = false
  const error = null

  // Note: This is now a server component, so we'll use Link components for navigation

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deals Pipeline</h1>
            <p className="mt-2 text-gray-600">Manage your commercial real estate deals</p>
          </div>
        </div>
        <div className="card">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Deals</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Deals Pipeline</h1>
            <p className="text-blue-100 text-lg">Manage your commercial real estate deals</p>
            <div className="mt-4 flex items-center space-x-4">
              <div className="bg-white/20 rounded-lg px-3 py-1">
                <span className="text-sm font-medium">{deals.length} Active Deals</span>
              </div>
              <div className="bg-white/20 rounded-lg px-3 py-1">
                <span className="text-sm font-medium">Multifamily Focus</span>
              </div>
            </div>
          </div>
          <div className="mt-6 sm:mt-0">
            <Link
              href="/deals/new"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Deal
            </Link>
          </div>
        </div>
      </div>

      <div className="card shadow-lg border-0 bg-white rounded-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Deal Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Created On
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">{deal.name}</span>
                        <div className="text-xs text-gray-500 mt-1">ID: {deal.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {deal.address}
                    </div>
                    <div className="text-xs text-gray-500">
                      {deal.city}, {deal.state} {deal.zip_code}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {deal.property_type}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {new Date(deal.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm text-gray-500">System</span>
                  </td>
                      <td className="px-6 py-5 whitespace-nowrap text-center">
                        <Link
                          href={`/deals/${deal.id}`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                          aria-label={`View details for ${deal.name}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}