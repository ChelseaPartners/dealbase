'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2 } from 'lucide-react'
import { DealCreate } from '@dealbase/shared'

export default function NewDealPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<DealCreate>({
    name: '',
    property_type: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    description: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to create deal')
      }

      const deal = await response.json()
      router.push(`/deals/${deal.id}`)
    } catch (error) {
      console.error('Error creating deal:', error)
      alert('Failed to create deal. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/deals"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Deals
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Create New Deal</h1>
          <p className="mt-2 text-gray-600">Enter the basic information for your commercial real estate deal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Deal Information</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Deal Name *
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="input mt-1"
                  placeholder="e.g., Downtown Office Tower"
                />
              </div>

              <div>
                <label htmlFor="property_type" className="block text-sm font-medium text-gray-700">
                  Property Type *
                </label>
                <select
                  name="property_type"
                  id="property_type"
                  required
                  value={formData.property_type}
                  onChange={handleChange}
                  className="input mt-1"
                >
                  <option value="">Select property type</option>
                  <option value="Office">Office</option>
                  <option value="Retail">Retail</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Multifamily">Multifamily</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Mixed Use">Mixed Use</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address *
              </label>
              <input
                type="text"
                name="address"
                id="address"
                required
                value={formData.address}
                onChange={handleChange}
                className="input mt-1"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mt-6">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  id="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="input mt-1"
                  placeholder="New York"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  id="state"
                  required
                  value={formData.state}
                  onChange={handleChange}
                  className="input mt-1"
                  placeholder="NY"
                />
              </div>

              <div>
                <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  name="zip_code"
                  id="zip_code"
                  required
                  value={formData.zip_code}
                  onChange={handleChange}
                  className="input mt-1"
                  placeholder="10001"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="input mt-1"
                placeholder="Additional details about the deal..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/deals"
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
