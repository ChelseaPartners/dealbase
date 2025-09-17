'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Building2, Calculator, Play, Settings, BarChart3, Save, RotateCcw } from 'lucide-react'
import { Deal, ValuationRun, ValuationRequest } from '@dealbase/shared'

async function fetchDeal(slug: string): Promise<Deal> {
  const response = await fetch(`/api/deals/${slug}`)
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

interface ValuationFormData {
  name: string
  purchase_price: number
  loan_amount: number
  exit_cap_rate: number
  hold_period: number
  interest_rate: number
  vacancy_rate: number
  expense_ratio: number
}

const defaultAssumptions: ValuationFormData = {
  name: 'Base Case',
  purchase_price: 10000000,
  loan_amount: 7000000,
  exit_cap_rate: 0.05,
  hold_period: 10,
  interest_rate: 0.05,
  vacancy_rate: 0.05,
  expense_ratio: 0.35
}

export default function ValuationPage() {
  const params = useParams()
  const router = useRouter()
  const dealSlug = params.id as string // This is actually the slug now

  const { data: deal, isLoading: dealLoading, error: dealError } = useQuery({
    queryKey: ['deal', dealSlug],
    queryFn: () => fetchDeal(dealSlug),
  })

  const { data: valuationRuns, isLoading: runsLoading } = useQuery({
    queryKey: ['valuation-runs', deal?.id],
    queryFn: () => fetchValuationRuns(deal!.id.toString()),
    enabled: !!deal?.id
  })

  const [formData, setFormData] = useState<ValuationFormData>(defaultAssumptions)
  const [isRunning, setIsRunning] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: keyof ValuationFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Valuation name is required'
    }
    
    if (formData.purchase_price <= 0) {
      newErrors.purchase_price = 'Purchase price must be greater than 0'
    }
    
    if (formData.loan_amount < 0 || formData.loan_amount > formData.purchase_price) {
      newErrors.loan_amount = 'Loan amount must be between 0 and purchase price'
    }
    
    if (formData.exit_cap_rate <= 0 || formData.exit_cap_rate > 1) {
      newErrors.exit_cap_rate = 'Exit cap rate must be between 0% and 100%'
    }
    
    if (formData.hold_period <= 0) {
      newErrors.hold_period = 'Hold period must be greater than 0'
    }
    
    if (formData.interest_rate < 0 || formData.interest_rate > 1) {
      newErrors.interest_rate = 'Interest rate must be between 0% and 100%'
    }
    
    if (formData.vacancy_rate < 0 || formData.vacancy_rate > 1) {
      newErrors.vacancy_rate = 'Vacancy rate must be between 0% and 100%'
    }
    
    if (formData.expense_ratio < 0 || formData.expense_ratio > 1) {
      newErrors.expense_ratio = 'Expense ratio must be between 0% and 100%'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRunValuation = async () => {
    if (!validateForm()) {
      return
    }
    
    setIsRunning(true)
    
    try {
      const request: ValuationRequest = {
        name: formData.name,
        assumptions: {
          purchase_price: formData.purchase_price,
          loan_amount: formData.loan_amount,
          exit_cap_rate: formData.exit_cap_rate,
          hold_period: formData.hold_period,
          interest_rate: formData.interest_rate,
          vacancy_rate: formData.vacancy_rate,
          expense_ratio: formData.expense_ratio,
        }
      }

      const response = await fetch(`/api/valuation/run/${deal!.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })
      
      if (!response.ok) {
        throw new Error('Failed to run valuation')
      }
      
      // Redirect to deal detail page to see results
      router.push(`/deals/${dealSlug}`)
    } catch (error) {
      console.error('Error running valuation:', error)
      setErrors({ submit: 'Failed to run valuation. Please try again.' })
    } finally {
      setIsRunning(false)
    }
  }

  const resetToDefaults = () => {
    setFormData(defaultAssumptions)
    setErrors({})
  }

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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/deals/${dealSlug}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Deal
          </Link>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">Run Valuation</h1>
            <p className="mt-2 text-gray-600">
              Configure assumptions and run valuation for <span className="font-medium">{deal.name}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Valuation Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Valuation Assumptions</h2>
                <button
                  onClick={resetToDefaults}
                  className="btn btn-secondary btn-sm"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <label htmlFor="name" className="label">
                    Valuation Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`input ${errors.name ? 'input-error' : ''}`}
                    placeholder="e.g., Base Case, Optimistic, Conservative"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Financial Assumptions */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="purchase_price" className="label">
                      Purchase Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="purchase_price"
                        value={formData.purchase_price}
                        onChange={(e) => handleInputChange('purchase_price', Number(e.target.value))}
                        className={`input pl-8 ${errors.purchase_price ? 'input-error' : ''}`}
                        placeholder="10,000,000"
                      />
                    </div>
                    {errors.purchase_price && (
                      <p className="mt-1 text-sm text-red-600">{errors.purchase_price}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="loan_amount" className="label">
                      Loan Amount *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="loan_amount"
                        value={formData.loan_amount}
                        onChange={(e) => handleInputChange('loan_amount', Number(e.target.value))}
                        className={`input pl-8 ${errors.loan_amount ? 'input-error' : ''}`}
                        placeholder="7,000,000"
                      />
                    </div>
                    {errors.loan_amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.loan_amount}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="exit_cap_rate" className="label">
                      Exit Cap Rate *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="exit_cap_rate"
                        value={formData.exit_cap_rate}
                        onChange={(e) => handleInputChange('exit_cap_rate', Number(e.target.value))}
                        className={`input pr-8 ${errors.exit_cap_rate ? 'input-error' : ''}`}
                        placeholder="0.05"
                        step="0.001"
                        min="0"
                        max="1"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    {errors.exit_cap_rate && (
                      <p className="mt-1 text-sm text-red-600">{errors.exit_cap_rate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="hold_period" className="label">
                      Hold Period (Years) *
                    </label>
                    <input
                      type="number"
                      id="hold_period"
                      value={formData.hold_period}
                      onChange={(e) => handleInputChange('hold_period', Number(e.target.value))}
                      className={`input ${errors.hold_period ? 'input-error' : ''}`}
                      placeholder="10"
                      min="1"
                    />
                    {errors.hold_period && (
                      <p className="mt-1 text-sm text-red-600">{errors.hold_period}</p>
                    )}
                  </div>
                </div>

                {/* Market Assumptions */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label htmlFor="interest_rate" className="label">
                      Interest Rate
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="interest_rate"
                        value={formData.interest_rate}
                        onChange={(e) => handleInputChange('interest_rate', Number(e.target.value))}
                        className={`input pr-8 ${errors.interest_rate ? 'input-error' : ''}`}
                        placeholder="0.05"
                        step="0.001"
                        min="0"
                        max="1"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    {errors.interest_rate && (
                      <p className="mt-1 text-sm text-red-600">{errors.interest_rate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="vacancy_rate" className="label">
                      Vacancy Rate
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="vacancy_rate"
                        value={formData.vacancy_rate}
                        onChange={(e) => handleInputChange('vacancy_rate', Number(e.target.value))}
                        className={`input pr-8 ${errors.vacancy_rate ? 'input-error' : ''}`}
                        placeholder="0.05"
                        step="0.001"
                        min="0"
                        max="1"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    {errors.vacancy_rate && (
                      <p className="mt-1 text-sm text-red-600">{errors.vacancy_rate}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="expense_ratio" className="label">
                      Expense Ratio
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="expense_ratio"
                        value={formData.expense_ratio}
                        onChange={(e) => handleInputChange('expense_ratio', Number(e.target.value))}
                        className={`input pr-8 ${errors.expense_ratio ? 'input-error' : ''}`}
                        placeholder="0.35"
                        step="0.001"
                        min="0"
                        max="1"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    {errors.expense_ratio && (
                      <p className="mt-1 text-sm text-red-600">{errors.expense_ratio}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="card border-red-200 bg-red-50">
                <p className="text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Link
                href={`/deals/${dealSlug}`}
                className="btn btn-secondary"
              >
                Cancel
              </Link>
              <button
                onClick={handleRunValuation}
                disabled={isRunning}
                className="btn btn-primary flex items-center"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Valuation
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Previous Runs */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Runs</h3>
              {runsLoading ? (
                <p className="text-gray-500">Loading...</p>
              ) : valuationRuns && valuationRuns.length > 0 ? (
                <div className="space-y-3">
                  {valuationRuns.slice(0, 3).map((run) => (
                    <div key={run.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">{run.name}</h4>
                          <p className="text-xs text-gray-500">
                            {new Date(run.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`badge ${
                          run.status === 'completed' ? 'badge-success' : 
                          run.status === 'running' ? 'badge-warning' : 
                          'badge-gray'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      {run.status === 'completed' && run.results && (
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">IRR:</span>
                            <span className="font-medium ml-1">
                              {(run.results.irr * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">DSCR:</span>
                            <span className="font-medium ml-1">
                              {run.results.dscr.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No previous runs</p>
              )}
            </div>

            {/* Quick Scenarios */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Scenarios</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, name: 'Optimistic', exit_cap_rate: 0.045, vacancy_rate: 0.03 }))}
                  className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  Optimistic Case
                </button>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, name: 'Conservative', exit_cap_rate: 0.055, vacancy_rate: 0.07 }))}
                  className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  Conservative Case
                </button>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, name: 'Stress Test', exit_cap_rate: 0.06, vacancy_rate: 0.1, expense_ratio: 0.4 }))}
                  className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                >
                  Stress Test
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}