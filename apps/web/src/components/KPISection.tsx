'use client'

import { useQuery } from '@tanstack/react-query'

interface KPIData {
  occupancy_rate: number
  avg_monthly_rent_per_unit: number
  avg_monthly_rent_per_sf: number
  t12_noi: number
  opex_ratio: number
  cap_rate: number
  total_units: number
  total_sf: number
  total_rent: number
  total_expenses: number
}

interface KPISectionProps {
  dealId: string
}

async function fetchKPIData(dealId: string): Promise<KPIData> {
  // For now, we'll create mock data based on available endpoints
  // In a real implementation, this would fetch from a dedicated KPIs endpoint
  const [unitMixResponse, t12Response] = await Promise.all([
    fetch(`/api/deals/${dealId}/unit-mix`).catch(() => null),
    fetch(`/api/deals/${dealId}/rentroll`).catch(() => null)
  ])

  let unitMixData = null
  let t12Data = null

  if (unitMixResponse?.ok) {
    unitMixData = await unitMixResponse.json()
  }

  if (t12Response?.ok) {
    t12Data = await t12Response.json()
  }

  // Calculate KPIs from available data
  const totalUnits = unitMixData?.summary_stats?.total_units || 0
  const totalOccupied = unitMixData?.summary_stats?.total_occupied || 0
  const occupancyRate = totalUnits > 0 ? (totalOccupied / totalUnits) * 100 : 0

  // Calculate average rent from unit mix data
  let avgMonthlyRentPerUnit = 0
  let avgMonthlyRentPerSF = 0
  let totalRent = 0
  let totalSF = 0

  if (unitMixData?.unit_mix) {
    unitMixData.unit_mix.forEach((unit: any) => {
      totalRent += unit.current_avg_rent * unit.total_units
      totalSF += (unit.avg_square_feet || 0) * unit.total_units
    })
    
    avgMonthlyRentPerUnit = totalUnits > 0 ? totalRent / totalUnits : 0
    avgMonthlyRentPerSF = totalSF > 0 ? totalRent / totalSF : 0
  }

  // Calculate T12 NOI and OpEx ratio from T12 data
  let t12NOI = 0
  let opexRatio = 0
  let totalExpenses = 0

  if (t12Data?.t12_data) {
    const monthlyData = t12Data.t12_data
    const totalIncome = monthlyData.reduce((sum: number, month: any) => sum + (month.total_income || 0), 0)
    totalExpenses = monthlyData.reduce((sum: number, month: any) => sum + (month.operating_expenses || 0), 0)
    t12NOI = totalIncome - totalExpenses
    opexRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0
  }

  // Calculate cap rate (simplified - would need purchase price in real implementation)
  const capRate = t12NOI > 0 ? (t12NOI / 10000000) * 100 : 0 // Assuming $10M purchase price for demo

  return {
    occupancy_rate: occupancyRate,
    avg_monthly_rent_per_unit: avgMonthlyRentPerUnit,
    avg_monthly_rent_per_sf: avgMonthlyRentPerSF,
    t12_noi: t12NOI,
    opex_ratio: opexRatio,
    cap_rate: capRate,
    total_units: totalUnits,
    total_sf: totalSF,
    total_rent: totalRent,
    total_expenses: totalExpenses
  }
}

export function KPISection({ dealId }: KPISectionProps) {
  const { data: kpiData, isLoading, error } = useQuery({
    queryKey: ['kpis', dealId],
    queryFn: () => fetchKPIData(dealId),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-2 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !kpiData) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
          <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">KPI data will be available after uploading financial data</p>
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
    return `${value.toFixed(1)}%`
  }

  const formatRentPerSF = (value: number) => {
    return `$${value.toFixed(2)}/SF`
  }

  const getStatusColor = (value: number, type: string) => {
    switch (type) {
      case 'occupancy':
        if (value >= 95) return 'text-green-600'
        if (value >= 90) return 'text-yellow-600'
        return 'text-red-600'
      case 'opex':
        if (value <= 35) return 'text-green-600'
        if (value <= 45) return 'text-yellow-600'
        return 'text-red-600'
      case 'noi':
        return value > 0 ? 'text-green-600' : 'text-red-600'
      default:
        return 'text-gray-900'
    }
  }

  const getStatusIndicator = (value: number, type: string) => {
    switch (type) {
      case 'occupancy':
        if (value >= 95) return 'bg-green-500'
        if (value >= 90) return 'bg-yellow-500'
        return 'bg-red-500'
      case 'opex':
        if (value <= 35) return 'bg-green-500'
        if (value <= 45) return 'bg-yellow-500'
        return 'bg-red-500'
      case 'noi':
        return value > 0 ? 'bg-green-500' : 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Main KPIs Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Occupancy Rate */}
        <div className="relative group">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 h-32">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Occupancy Rate</div>
              <div className={`w-3 h-3 rounded-full ${getStatusIndicator(kpiData.occupancy_rate, 'occupancy')} shadow-sm`}></div>
            </div>
            <div className={`text-3xl font-bold ${getStatusColor(kpiData.occupancy_rate, 'occupancy')} mb-3`}>
              {formatPercentage(kpiData.occupancy_rate)}
            </div>
            <div className="relative">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-700 ${
                    kpiData.occupancy_rate >= 95 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                    kpiData.occupancy_rate >= 90 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                    'bg-gradient-to-r from-red-400 to-red-500'
                  }`}
                  style={{ width: `${Math.min(kpiData.occupancy_rate, 100)}%` }}
                ></div>
              </div>
              <div className="absolute -top-1 right-0 w-1 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>

        {/* Avg Monthly Rent/Unit */}
        <div className="relative group">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 h-32">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Avg Monthly Rent/Unit</div>
            <div className="text-3xl font-bold text-gray-900 mb-3">
              {formatCurrency(kpiData.avg_monthly_rent_per_unit)}
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Avg Monthly Rent/SF */}
        <div className="relative group">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 h-32">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Avg Monthly Rent/SF</div>
            <div className="text-3xl font-bold text-gray-900 mb-3">
              {formatRentPerSF(kpiData.avg_monthly_rent_per_sf)}
            </div>
            <div className="flex space-x-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-1 bg-gray-200 rounded-full" style={{ height: `${12 + (i * 2)}px` }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* T12 NOI */}
        <div className="relative group">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 h-32">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">T12 NOI</div>
              <div className={`w-3 h-3 rounded-full ${getStatusIndicator(kpiData.t12_noi, 'noi')} shadow-sm`}></div>
            </div>
            <div className={`text-3xl font-bold ${getStatusColor(kpiData.t12_noi, 'noi')} mb-3`}>
              {formatCurrency(kpiData.t12_noi)}
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-1 h-4 bg-gray-200 rounded-full"></div>
              <div className="w-1 h-6 bg-gray-300 rounded-full"></div>
              <div className="w-1 h-8 bg-gray-400 rounded-full"></div>
              <div className="w-1 h-10 bg-gray-500 rounded-full"></div>
              <div className="w-1 h-12 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* OpEx Ratio */}
        <div className="relative group col-span-2">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 h-32">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Operating Expense Ratio</div>
              <div className={`w-3 h-3 rounded-full ${getStatusIndicator(kpiData.opex_ratio, 'opex')} shadow-sm`}></div>
            </div>
            <div className="flex items-center justify-between">
              <div className={`text-3xl font-bold ${getStatusColor(kpiData.opex_ratio, 'opex')}`}>
                {formatPercentage(kpiData.opex_ratio)}
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Target: 35%</div>
                  <div className="w-32 bg-gray-100 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-700 ${
                        kpiData.opex_ratio <= 35 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                        kpiData.opex_ratio <= 45 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                        'bg-gradient-to-r from-red-400 to-red-500'
                      }`}
                      style={{ width: `${Math.min(kpiData.opex_ratio, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Property Summary */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{kpiData.total_units}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Units</div>
            <div className="mt-3 flex justify-center space-x-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1 h-3 bg-gray-200 rounded-full"></div>
              ))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">{kpiData.total_sf.toLocaleString()}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Square Feet</div>
            <div className="mt-3 flex justify-center space-x-1">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-1 bg-gray-200 rounded-full" style={{ height: `${8 + (i * 2)}px` }}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
