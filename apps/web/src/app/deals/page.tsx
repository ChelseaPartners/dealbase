'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Building2, MapPin, Calendar } from 'lucide-react'
import { Deal } from '@dealbase/shared'

async function fetchDeals(): Promise<Deal[]> {
  const response = await fetch('/api/deals')
  if (!response.ok) {
    throw new Error('Failed to fetch deals')
  }
  return response.json()
}

export default function DealsPage() {
  const { data: deals, isLoading, error } = useQuery({
    queryKey: ['deals'],
    queryFn: fetchDeals,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deals...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading deals: {error.message}</p>
        </div>
      </div>
    )
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
              <Link href="/deals" className="text-primary-600 font-medium">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Deals Pipeline</h1>
            <p className="mt-2 text-gray-600">Manage your commercial real estate deals</p>
          </div>
          <Link
            href="/deals/new"
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Deal
          </Link>
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {deals?.map((deal) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{deal.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{deal.property_type}</p>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{deal.city}, {deal.state}</span>
                  </div>
                  <div className="flex items-center mt-1 text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{new Date(deal.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  deal.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : deal.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {deal.status}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {deals?.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No deals yet</h3>
            <p className="mt-2 text-gray-500">Get started by creating your first deal.</p>
            <Link
              href="/deals/new"
              className="mt-4 btn btn-primary inline-flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Deal
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
