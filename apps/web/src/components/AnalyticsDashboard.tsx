'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, DollarSign, Users, Building } from 'lucide-react'
import { KPIs, Scenario, MarketAnalysis } from '@dealbase/shared'
import { KPICard } from './KPICard'

interface AnalyticsDashboardProps {
  kpis: KPIs
  scenarios?: Scenario[]
  marketAnalysis?: MarketAnalysis
  dealId: string
}

export function AnalyticsDashboard({ kpis, scenarios = [], marketAnalysis, dealId }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'scenarios' | 'market' | 'risk'>('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'scenarios', label: 'Scenarios', icon: TrendingUp },
    { id: 'market', label: 'Market', icon: Building },
    { id: 'risk', label: 'Risk', icon: AlertTriangle },
  ]

  const getRiskLevel = (dscr: number, ltv: number): 'low' | 'medium' | 'high' => {
    if (dscr >= 1.5 && ltv <= 0.7) return 'low'
    if (dscr >= 1.2 && ltv <= 0.8) return 'medium'
    return 'high'
  }

  const riskLevel = getRiskLevel(kpis.dscr, kpis.ltv)

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="IRR"
              value={kpis.irr}
              trend="up"
              format="percentage"
              subtitle="Internal Rate of Return"
            />
            <KPICard
              title="Equity Multiple"
              value={kpis.equity_multiple}
              trend="up"
              format="decimal"
              subtitle="Total Return Multiple"
            />
            <KPICard
              title="DSCR"
              value={kpis.dscr}
              trend="up"
              format="decimal"
              subtitle="Debt Service Coverage"
            />
            <KPICard
              title="Cap Rate"
              value={kpis.cap_rate}
              trend="down"
              format="percentage"
              subtitle="Capitalization Rate"
            />
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KPICard
              title="Cash on Cash"
              value={kpis.cash_on_cash}
              trend="up"
              format="percentage"
              subtitle="Annual Cash Return"
            />
            <KPICard
              title="LTV"
              value={kpis.ltv}
              trend="down"
              format="percentage"
              subtitle="Loan to Value"
            />
            <KPICard
              title="Occupancy"
              value={kpis.occupancy_rate}
              trend="up"
              format="percentage"
              subtitle="Current Occupancy"
            />
          </div>

          {/* Risk Assessment */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${
                riskLevel === 'low' ? 'bg-green-100' :
                riskLevel === 'medium' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                {riskLevel === 'low' ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : riskLevel === 'medium' ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div>
                <h4 className={`font-medium ${
                  riskLevel === 'low' ? 'text-green-800' :
                  riskLevel === 'medium' ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {riskLevel === 'low' ? 'Low Risk' :
                   riskLevel === 'medium' ? 'Medium Risk' : 'High Risk'}
                </h4>
                <p className="text-sm text-gray-600">
                  Based on DSCR of {kpis.dscr.toFixed(2)} and LTV of {(kpis.ltv * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          {scenarios.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="card">
                  <h4 className="font-semibold text-gray-900 mb-2">{scenario.name}</h4>
                  {scenario.description && (
                    <p className="text-sm text-gray-600 mb-4">{scenario.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">IRR:</span>
                      <span className="font-medium">{(scenario.results.irr * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">DSCR:</span>
                      <span className="font-medium">{scenario.results.dscr.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Equity Multiple:</span>
                      <span className="font-medium">{scenario.results.equity_multiple.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Scenarios Yet</h3>
              <p className="mt-2 text-gray-500">Run multiple valuation scenarios to compare different assumptions.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'market' && (
        <div className="space-y-6">
          {marketAnalysis ? (
            <>
              {/* Market Trends */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Trends</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {marketAnalysis.market_trends.map((trend) => (
                    <div key={trend.metric} className="text-center">
                      <p className="text-sm text-gray-500">{trend.metric}</p>
                      <p className="text-2xl font-bold text-gray-900">{trend.current_value}</p>
                      <div className="flex items-center justify-center mt-1">
                        {trend.trend_direction === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : trend.trend_direction === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : (
                          <div className="h-4 w-4 bg-gray-400 rounded-full" />
                        )}
                        <span className="ml-1 text-xs text-gray-500">
                          vs {trend.historical_average}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rent Roll Analysis */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rent Roll Analysis</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Total Units</p>
                    <p className="text-2xl font-bold text-gray-900">{marketAnalysis.rent_roll_analysis.total_units}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Occupied</p>
                    <p className="text-2xl font-bold text-green-600">{marketAnalysis.rent_roll_analysis.occupied_units}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Average Rent</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${marketAnalysis.rent_roll_analysis.average_rent.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Rent Premium</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(marketAnalysis.rent_roll_analysis.rent_premium * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Market Analysis</h3>
              <p className="mt-2 text-gray-500">Market analysis will be available after data upload.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="space-y-6">
          {/* Risk Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KPICard
              title="Minimum DSCR"
              value={kpis.dscr_minimum}
              trend={kpis.dscr_minimum >= 1.2 ? 'up' : 'warning'}
              format="decimal"
              subtitle="Worst Case Coverage"
            />
            <KPICard
              title="Maximum LTV"
              value={kpis.ltv_maximum}
              trend={kpis.ltv_maximum <= 0.8 ? 'down' : 'warning'}
              format="percentage"
              subtitle="Peak Leverage"
            />
            <KPICard
              title="Break Even Occupancy"
              value={kpis.break_even_occupancy}
              trend="down"
              format="percentage"
              subtitle="Minimum Viable Occupancy"
            />
          </div>

          {/* Risk Factors */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Factors</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Interest Rate Risk</span>
                <span className={`badge ${
                  kpis.interest_rate < 0.05 ? 'badge-success' : 
                  kpis.interest_rate < 0.07 ? 'badge-warning' : 'badge-danger'
                }`}>
                  {(kpis.interest_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Vacancy Risk</span>
                <span className={`badge ${
                  kpis.vacancy_rate < 0.05 ? 'badge-success' : 
                  kpis.vacancy_rate < 0.1 ? 'badge-warning' : 'badge-danger'
                }`}>
                  {(kpis.vacancy_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">Leverage Risk</span>
                <span className={`badge ${
                  kpis.ltv < 0.7 ? 'badge-success' : 
                  kpis.ltv < 0.8 ? 'badge-warning' : 'badge-danger'
                }`}>
                  {(kpis.ltv * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
