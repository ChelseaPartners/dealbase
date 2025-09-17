'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import { SensitivityFactor } from '@dealbase/shared'

interface SensitivityAnalysisProps {
  factors: SensitivityFactor[]
  baseKpis: {
    irr: number
    dscr: number
  }
}

export function SensitivityAnalysis({ factors, baseKpis }: SensitivityAnalysisProps) {
  const [selectedFactor, setSelectedFactor] = useState<SensitivityFactor | null>(
    factors.length > 0 ? factors[0] : null
  )
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    if (selectedFactor) {
      const data = selectedFactor.impact_on_irr.map((irr, index) => {
        const value = selectedFactor.sensitivity_range.min + (index * selectedFactor.sensitivity_range.step)
        return {
          value: value,
          irr: irr * 100, // Convert to percentage
          dscr: selectedFactor.impact_on_dscr[index],
          irrChange: ((irr - baseKpis.irr) / baseKpis.irr) * 100,
          dscrChange: ((selectedFactor.impact_on_dscr[index] - baseKpis.dscr) / baseKpis.dscr) * 100,
        }
      })
      setChartData(data)
    }
  }, [selectedFactor, baseKpis])

  if (factors.length === 0) {
    return (
      <div className="card text-center py-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Sensitivity Data</h3>
        <p className="text-gray-500">Sensitivity analysis will be available after running multiple scenarios.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Factor Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sensitivity Analysis</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {factors.map((factor) => (
            <button
              key={factor.variable}
              onClick={() => setSelectedFactor(factor)}
              className={`p-3 text-left rounded-lg border transition-colors ${
                selectedFactor?.variable === factor.variable
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900 capitalize">
                {factor.variable.replace(/_/g, ' ')}
              </div>
              <div className="text-sm text-gray-500">
                Base: {factor.base_value}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      {selectedFactor && chartData.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* IRR Sensitivity */}
          <div className="chart-container">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              IRR Sensitivity - {selectedFactor.variable.replace(/_/g, ' ').toUpperCase()}
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="value" 
                    tickFormatter={(value) => {
                      if (selectedFactor.variable.includes('rate') || selectedFactor.variable.includes('ratio')) {
                        return `${(value * 100).toFixed(1)}%`
                      }
                      return value.toLocaleString()
                    }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'irr' ? `${value.toFixed(2)}%` : value,
                      name === 'irr' ? 'IRR' : 'IRR Change'
                    ]}
                    labelFormatter={(value) => {
                      if (selectedFactor.variable.includes('rate') || selectedFactor.variable.includes('ratio')) {
                        return `Value: ${(value * 100).toFixed(1)}%`
                      }
                      return `Value: ${value.toLocaleString()}`
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="irr" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DSCR Sensitivity */}
          <div className="chart-container">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              DSCR Sensitivity - {selectedFactor.variable.replace(/_/g, ' ').toUpperCase()}
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="value" 
                    tickFormatter={(value) => {
                      if (selectedFactor.variable.includes('rate') || selectedFactor.variable.includes('ratio')) {
                        return `${(value * 100).toFixed(1)}%`
                      }
                      return value.toLocaleString()
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      name === 'dscr' ? value.toFixed(2) : value,
                      name === 'dscr' ? 'DSCR' : 'DSCR Change'
                    ]}
                    labelFormatter={(value) => {
                      if (selectedFactor.variable.includes('rate') || selectedFactor.variable.includes('ratio')) {
                        return `Value: ${(value * 100).toFixed(1)}%`
                      }
                      return `Value: ${value.toLocaleString()}`
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="dscr" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Summary Table */}
      {selectedFactor && chartData.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Impact Summary</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IRR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IRR Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DSCR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DSCR Change
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chartData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {selectedFactor.variable.includes('rate') || selectedFactor.variable.includes('ratio')
                        ? `${(row.value * 100).toFixed(1)}%`
                        : row.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.irr.toFixed(2)}%
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      row.irrChange > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {row.irrChange > 0 ? '+' : ''}{row.irrChange.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.dscr.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      row.dscrChange > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {row.dscrChange > 0 ? '+' : ''}{row.dscrChange.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
