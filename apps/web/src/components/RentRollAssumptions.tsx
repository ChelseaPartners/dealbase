'use client'

import { useState, useEffect } from 'react'
import { Save, RefreshCw, TrendingUp, Building, DollarSign, Calendar } from 'lucide-react'

interface RentRollAssumptionsData {
  pro_forma_rents: Record<string, number>
  market_rent_growth: number
  vacancy_rate: number
  turnover_rate: number
  avg_lease_term: number
  lease_renewal_rate: number
  marketing_cost_per_unit: number
  turnover_cost_per_unit: number
}

interface UnitType {
  unit_type: string
  avg_market_rent: number
  total_units: number
}

interface RentRollAssumptionsProps {
  dealId: string
  unitTypes: UnitType[]
  initialAssumptions?: RentRollAssumptionsData
  onSave: (assumptions: RentRollAssumptionsData) => Promise<void>
}

export function RentRollAssumptions({ 
  dealId, 
  unitTypes, 
  initialAssumptions,
  onSave 
}: RentRollAssumptionsProps) {
  const [assumptions, setAssumptions] = useState<RentRollAssumptionsData>({
    pro_forma_rents: {},
    market_rent_growth: 0.03,
    vacancy_rate: 0.05,
    turnover_rate: 0.20,
    avg_lease_term: 12,
    lease_renewal_rate: 0.70,
    marketing_cost_per_unit: 500,
    turnover_cost_per_unit: 2000,
    ...initialAssumptions
  })

  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (initialAssumptions) {
      setAssumptions(initialAssumptions)
    }
  }, [initialAssumptions])

  useEffect(() => {
    // Initialize pro forma rents from market rents if not set
    const updatedProFormaRents = { ...assumptions.pro_forma_rents }
    let hasUpdates = false

    unitTypes.forEach(unitType => {
      if (!(unitType.unit_type in updatedProFormaRents)) {
        updatedProFormaRents[unitType.unit_type] = unitType.avg_market_rent
        hasUpdates = true
      }
    })

    if (hasUpdates) {
      setAssumptions(prev => ({
        ...prev,
        pro_forma_rents: updatedProFormaRents
      }))
    }
  }, [unitTypes, assumptions.pro_forma_rents])

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

  const handleProFormaRentChange = (unitType: string, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      pro_forma_rents: {
        ...prev.pro_forma_rents,
        [unitType]: value
      }
    }))
    setHasChanges(true)
  }

  const handleAssumptionChange = (field: keyof RentRollAssumptionsData, value: number) => {
    setAssumptions(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(assumptions)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving assumptions:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const resetToDefaults = () => {
    setAssumptions({
      pro_forma_rents: unitTypes.reduce((acc, unit) => {
        acc[unit.unit_type] = unit.avg_market_rent
        return acc
      }, {} as Record<string, number>),
      market_rent_growth: 0.03,
      vacancy_rate: 0.05,
      turnover_rate: 0.20,
      avg_lease_term: 12,
      lease_renewal_rate: 0.70,
      marketing_cost_per_unit: 500,
      turnover_cost_per_unit: 2000
    })
    setHasChanges(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Rent Roll Assumptions</h3>
            <p className="text-sm text-gray-500">Set pro forma rents and market assumptions for valuation modeling</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={resetToDefaults}
              className="btn btn-secondary btn-sm"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="btn btn-primary btn-sm"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Assumptions
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pro Forma Rents */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Pro Forma Rents by Unit Type
          </h4>
          <p className="text-sm text-gray-500 mt-1">Set target rents for each unit type</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unitTypes.map((unitType) => (
              <div key={unitType.unit_type} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {unitType.unit_type}
                  <span className="text-gray-500 ml-1">({unitType.total_units} units)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={assumptions.pro_forma_rents[unitType.unit_type] || ''}
                    onChange={(e) => handleProFormaRentChange(unitType.unit_type, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="0"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">$</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Market: {formatCurrency(unitType.avg_market_rent)}</span>
                  {assumptions.pro_forma_rents[unitType.unit_type] && (
                    <span className={`${
                      assumptions.pro_forma_rents[unitType.unit_type] > unitType.avg_market_rent
                        ? 'text-green-600'
                        : assumptions.pro_forma_rents[unitType.unit_type] < unitType.avg_market_rent
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}>
                      {assumptions.pro_forma_rents[unitType.unit_type] > unitType.avg_market_rent ? '+' : ''}
                      {(((assumptions.pro_forma_rents[unitType.unit_type] - unitType.avg_market_rent) / unitType.avg_market_rent) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Market Assumptions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Market Assumptions
          </h4>
          <p className="text-sm text-gray-500 mt-1">Set market growth and vacancy assumptions</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Market Rent Growth (Annual)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="0.2"
                  value={assumptions.market_rent_growth}
                  onChange={(e) => handleAssumptionChange('market_rent_growth', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Current: {formatPercentage(assumptions.market_rent_growth)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Vacancy Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="0.3"
                  value={assumptions.vacancy_rate}
                  onChange={(e) => handleAssumptionChange('vacancy_rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Current: {formatPercentage(assumptions.vacancy_rate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lease Assumptions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-purple-600" />
            Lease Assumptions
          </h4>
          <p className="text-sm text-gray-500 mt-1">Set lease terms and turnover assumptions</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Average Lease Term
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={assumptions.avg_lease_term}
                  onChange={(e) => handleAssumptionChange('avg_lease_term', parseInt(e.target.value) || 12)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">months</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Turnover Rate (Annual)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={assumptions.turnover_rate}
                  onChange={(e) => handleAssumptionChange('turnover_rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Current: {formatPercentage(assumptions.turnover_rate)}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Lease Renewal Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={assumptions.lease_renewal_rate}
                  onChange={(e) => handleAssumptionChange('lease_renewal_rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Current: {formatPercentage(assumptions.lease_renewal_rate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Operating Assumptions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 flex items-center">
            <Building className="h-5 w-5 mr-2 text-orange-600" />
            Operating Assumptions
          </h4>
          <p className="text-sm text-gray-500 mt-1">Set costs for marketing and turnover</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Marketing Cost per Unit
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={assumptions.marketing_cost_per_unit}
                  onChange={(e) => handleAssumptionChange('marketing_cost_per_unit', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">$</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Turnover Cost per Unit
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={assumptions.turnover_cost_per_unit}
                  onChange={(e) => handleAssumptionChange('turnover_cost_per_unit', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">$</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 text-xs">!</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                You have unsaved changes to your rent roll assumptions. Click "Save Assumptions" to apply them.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


