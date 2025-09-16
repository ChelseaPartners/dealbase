'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Calculator, Play, History } from 'lucide-react'
import { ValuationRequest, ValuationRun } from '@dealbase/shared'
import { useQuery } from '@tanstack/react-query'

async function fetchValuationRuns(dealId: string): Promise<ValuationRun[]> {
  const response = await fetch(`/api/valuation/runs/${dealId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch valuation runs')
  }
  return response.json()
}

export default function ValuationPage() {
  const params = useParams()
  const dealId = params.id as string
  
  const [formData, setFormData] = useState<ValuationRequest>({
    name: '',
    assumptions: {
      purchase_price: 1000000,
      loan_amount: 800000,
      exit_cap_rate: 0.05,
      hold_period: 5,
      interest_rate: 0.05,
      vacancy_rate: 0.05,
      expense_ratio: 0.35,
    }
  })
  const [isRunning, setIsRunning] = useState(false)

  const { data: valuationRuns, refetch } = useQuery({
    queryKey: ['valuation-runs', dealId],
    queryFn: () => fetchValuationRuns(dealId),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRunning(true)

    try {
      const response = await fetch(`/api/valuation/run/${dealId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to run valuation')
      }

      // Refresh the valuation runs
      await refetch()
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        name: '',
      }))
    } catch (error) {
      console.error('Error running valuation:', error)
      alert('Failed to run valuation. Please try again.')
    } finally {
      setIsRunning(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'name') {
      setFormData(prev => ({ ...prev, [name]: value }))
    } else {
      setFormData(prev => ({
        ...prev,
        assumptions: {
          ...prev.assumptions,
          [name]: parseFloat(value) || 0,
        }
      }))
    }
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
              <Link href="/valuation" className="text-primary-600 font-medium">
                Valuation
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/deals/${dealId}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Deal
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Run Valuation</h1>
          <p className="mt-2 text-gray-600">Configure assumptions and run valuation analysis</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Valuation Form */}
          <div className="card">
            <div className="flex items-center mb-4">
              <Calculator className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Valuation Assumptions</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Valuation Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="input mt-1"
                  placeholder="e.g., Base Case Scenario"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700">
                    Purchase Price ($)
                  </label>
                  <input
                    type="number"
                    name="purchase_price"
                    id="purchase_price"
                    value={formData.assumptions.purchase_price}
                    onChange={handleChange}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="loan_amount" className="block text-sm font-medium text-gray-700">
                    Loan Amount ($)
                  </label>
                  <input
                    type="number"
                    name="loan_amount"
                    id="loan_amount"
                    value={formData.assumptions.loan_amount}
                    onChange={handleChange}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="exit_cap_rate" className="block text-sm font-medium text-gray-700">
                    Exit Cap Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="exit_cap_rate"
                    id="exit_cap_rate"
                    value={formData.assumptions.exit_cap_rate * 100}
                    onChange={(e) => handleChange({
                      ...e,
                      target: { ...e.target, value: (parseFloat(e.target.value) / 100).toString() }
                    })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="hold_period" className="block text-sm font-medium text-gray-700">
                    Hold Period (Years)
                  </label>
                  <input
                    type="number"
                    name="hold_period"
                    id="hold_period"
                    value={formData.assumptions.hold_period}
                    onChange={handleChange}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="interest_rate" className="block text-sm font-medium text-gray-700">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="interest_rate"
                    id="interest_rate"
                    value={(formData.assumptions.interest_rate || 0) * 100}
                    onChange={(e) => handleChange({
                      ...e,
                      target: { ...e.target, value: (parseFloat(e.target.value) / 100).toString() }
                    })}
                    className="input mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="vacancy_rate" className="block text-sm font-medium text-gray-700">
                    Vacancy Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    name="vacancy_rate"
                    id="vacancy_rate"
                    value={(formData.assumptions.vacancy_rate || 0) * 100}
                    onChange={(e) => handleChange({
                      ...e,
                      target: { ...e.target, value: (parseFloat(e.target.value) / 100).toString() }
                    })}
                    className="input mt-1"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isRunning}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running Valuation...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Valuation
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Valuation History */}
          <div className="card">
            <div className="flex items-center mb-4">
              <History className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Valuation History</h2>
            </div>
            
            {valuationRuns && valuationRuns.length > 0 ? (
              <div className="space-y-4">
                {valuationRuns.map((run) => (
                  <div key={run.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{run.name}</h3>
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
                    <p className="text-sm text-gray-500 mb-3">
                      {new Date(run.created_at).toLocaleString()}
                    </p>
                    
                    {run.status === 'completed' && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">IRR:</span>
                          <span className="ml-2 font-medium">{(run.results.irr * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Equity Multiple:</span>
                          <span className="ml-2 font-medium">{run.results.equity_multiple.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">DSCR:</span>
                          <span className="ml-2 font-medium">{run.results.dscr.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Cap Rate:</span>
                          <span className="ml-2 font-medium">{(run.results.cap_rate * 100).toFixed(1)}%</span>
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
        </div>
      </main>
    </div>
  )
}
