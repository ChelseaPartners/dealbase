'use client'

import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface NOIChartProps {
  dealId: string
}

async function fetchT12Data(dealId: string) {
  const response = await fetch(`/api/intake/t12/${dealId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch T-12 data')
  }
  return response.json()
}

export function NOIChart({ dealId }: NOIChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['t12-data', dealId],
    queryFn: () => fetchT12Data(dealId),
  })

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No T-12 data available
      </div>
    )
  }

  // Transform data for chart
  const chartData = data.map((item: any) => ({
    month: `${item.year}-${item.month.toString().padStart(2, '0')}`,
    noi: item.net_operating_income,
    grossRent: item.gross_rent,
    expenses: item.operating_expenses,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="noi" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="NOI"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
