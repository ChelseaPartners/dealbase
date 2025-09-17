'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Building2, Save, X, CheckCircle } from 'lucide-react'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'

interface DealFormData {
  name: string
  property_type: string
  address: string
  city: string
  state: string
  zip_code: string
  description: string
}

const propertyTypes = [
  'Multifamily'
]

const states = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function NewDealPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())
  
  const [formData, setFormData] = useState<DealFormData>({
    name: '',
    property_type: 'Multifamily',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    description: ''
  })

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (dealData: DealFormData) => {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create deal')
      }
      
      return response.json()
    },
    onSuccess: (deal) => {
      // Invalidate and refetch the deals query to update the list
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      
      // Show success feedback before redirect
      setErrors({ submit: 'Deal created successfully! Redirecting...' })
      
      // Small delay to show success message
      setTimeout(() => {
        router.push(`/deals/${deal.id}`)
      }, 1000)
    },
    onError: (error) => {
      console.error('Error creating deal:', error)
      setErrors({ submit: error.message })
    }
  })

  const handleInputChange = (field: keyof DealFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleAddressSelect = (suggestion: { address: string; city: string; state: string; zip_code: string }) => {
    setFormData(prev => ({
      ...prev,
      address: suggestion.address,
      city: suggestion.city,
      state: suggestion.state,
      zip_code: suggestion.zip_code
    }))
    // Mark fields as auto-filled
    setAutoFilledFields(new Set(['city', 'state', 'zip_code']))
    // Clear any location-related errors
    setErrors(prev => ({
      ...prev,
      address: '',
      city: '',
      state: '',
      zip_code: ''
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Deal name is required'
    }
    
    // Property type is always Multifamily, no validation needed
    
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }
    
    if (!formData.state) {
      newErrors.state = 'State is required'
    }
    
    if (!formData.zip_code.trim()) {
      newErrors.zip_code = 'ZIP code is required'
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zip_code)) {
      newErrors.zip_code = 'Please enter a valid ZIP code'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      // Scroll to first error
      const firstError = Object.keys(errors)[0]
      if (firstError) {
        const element = document.getElementById(firstError)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element?.focus()
      }
      return
    }
    
    setErrors({}) // Clear any previous errors
    
    // Use the mutation to create the deal
    createDealMutation.mutate(formData)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          href="/deals"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Deals
        </Link>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Create New Deal</h1>
          <p className="mt-2 text-gray-600">Set up a new commercial real estate deal for analysis</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          {/* Basic Information */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="label">
                  Deal Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`input ${errors.name ? 'input-error' : ''}`}
                  placeholder="e.g., Downtown Office Tower"
                  autoComplete="off"
                  autoFocus
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="property_type" className="label">
                  Property Type
                </label>
                <select
                  id="property_type"
                  value={formData.property_type}
                  disabled
                  className="input bg-gray-100 cursor-not-allowed"
                >
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">Currently focused on multifamily properties</p>
              </div>

            </div>
          </div>

          {/* Location Information */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Location Information</h2>
            <div className="space-y-6">
              <div>
                <label htmlFor="address" className="label">
                  Street Address *
                </label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(value) => handleInputChange('address', value)}
                  onAddressSelect={handleAddressSelect}
                  error={errors.address}
                  placeholder="123 Main Street"
                  id="address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <label htmlFor="city" className="label">
                    City *
                    {autoFilledFields.has('city') && (
                      <span className="ml-2 text-xs text-green-600 font-normal">(auto-filled)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => {
                      handleInputChange('city', e.target.value)
                      // Remove from auto-filled when user manually changes
                      if (autoFilledFields.has('city')) {
                        setAutoFilledFields(prev => {
                          const newSet = new Set(prev)
                          newSet.delete('city')
                          return newSet
                        })
                      }
                    }}
                    className={`input ${errors.city ? 'input-error' : ''} ${
                      autoFilledFields.has('city') ? 'bg-green-50 border-green-300' : ''
                    }`}
                    placeholder="New York"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="state" className="label">
                    State *
                    {autoFilledFields.has('state') && (
                      <span className="ml-2 text-xs text-green-600 font-normal">(auto-filled)</span>
                    )}
                  </label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => {
                      handleInputChange('state', e.target.value)
                      // Remove from auto-filled when user manually changes
                      if (autoFilledFields.has('state')) {
                        setAutoFilledFields(prev => {
                          const newSet = new Set(prev)
                          newSet.delete('state')
                          return newSet
                        })
                      }
                    }}
                    className={`input ${errors.state ? 'input-error' : ''} ${
                      autoFilledFields.has('state') ? 'bg-green-50 border-green-300' : ''
                    }`}
                  >
                    <option value="">Select state</option>
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="zip_code" className="label">
                    ZIP Code *
                    {autoFilledFields.has('zip_code') && (
                      <span className="ml-2 text-xs text-green-600 font-normal">(auto-filled)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => {
                      handleInputChange('zip_code', e.target.value)
                      // Remove from auto-filled when user manually changes
                      if (autoFilledFields.has('zip_code')) {
                        setAutoFilledFields(prev => {
                          const newSet = new Set(prev)
                          newSet.delete('zip_code')
                          return newSet
                        })
                      }
                    }}
                    className={`input ${errors.zip_code ? 'input-error' : ''} ${
                      autoFilledFields.has('zip_code') ? 'bg-green-50 border-green-300' : ''
                    }`}
                    placeholder="12345"
                  />
                  {errors.zip_code && (
                    <p className="mt-1 text-sm text-red-600">{errors.zip_code}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Additional Information</h2>
            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="input"
                placeholder="Optional description of the deal, key features, or notes..."
              />
            </div>
          </div>

          {/* Submit Status */}
          {errors.submit && (
            <div className={`card ${
              errors.submit.includes('successfully') 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center">
                {errors.submit.includes('successfully') ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                ) : (
                  <X className="h-5 w-5 text-red-500 mr-2" />
                )}
                <p className={errors.submit.includes('successfully') ? 'text-green-600' : 'text-red-600'}>
                  {errors.submit}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/deals"
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createDealMutation.isPending}
              className={`btn btn-primary flex items-center transition-all duration-200 ${
                createDealMutation.isPending 
                  ? 'opacity-75 cursor-not-allowed' 
                  : 'hover:scale-105 active:scale-95'
              }`}
            >
              {createDealMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Deal...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Deal
                </>
              )}
            </button>
          </div>
      </form>
    </div>
  )
}