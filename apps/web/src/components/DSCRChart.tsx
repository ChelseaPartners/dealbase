'use client'

import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DSCRChartProps {
  dealId: string
}

async function fetchValuationRuns(dealId: string) {
  const response = await fetch(`/api/valuation/runs/${dealId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch valuation runs')
  }
  return response.json()
}

export function DSCRChart({ dealId }: DSCRChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['valuation-runs', dealId],
    queryFn: () => fetchValuationRuns(dealId),
  })

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No valuation data available
      </div>
    )
  }

  // Transform data for chart
  const chartData = data
    .filter((run: any) => run.status === 'completed')
    .map((run: any, index: number) => ({
      run: `Run ${index + 1}`,
      dscr: run.results.dscr,
      irr: run.results.irr * 100,
    }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="run" />
          <YAxis />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="dscr" 
            stroke="#10b981" 
            strokeWidth={2}
            name="DSCR"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
