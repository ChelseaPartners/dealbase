'use client'

import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  trend: 'up' | 'down' | 'neutral' | 'warning'
  subtitle?: string
  change?: string
  changeValue?: number
  format?: 'percentage' | 'currency' | 'number' | 'decimal'
  isLoading?: boolean
  error?: string
}

export function KPICard({ 
  title, 
  value, 
  trend, 
  subtitle, 
  change, 
  changeValue,
  format = 'number',
  isLoading = false,
  error 
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'percentage':
        return `${(val * 100).toFixed(1)}%`
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val)
      case 'decimal':
        return val.toFixed(2)
      default:
        return val.toLocaleString()
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'down':
        return <TrendingDown className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Minus className="h-5 w-5 text-gray-400" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      default:
        return 'text-gray-500'
    }
  }

  if (error) {
    return (
      <div className="kpi-card border-red-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="kpi-label">{title}</p>
            <p className="text-red-600 text-sm">Error loading data</p>
          </div>
          <AlertCircle className="h-5 w-5 text-red-500" />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="kpi-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="kpi-label">{title}</p>
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-20 mt-2"></div>
            </div>
          </div>
          <div className="animate-pulse">
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="kpi-card group hover:shadow-lg transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="kpi-label">{title}</p>
          <p className="kpi-value group-hover:scale-105 transition-transform duration-200">
            {formatValue(value)}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {change && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {change}
              </span>
              {changeValue !== undefined && (
                <span className={`text-xs ml-1 ${getTrendColor()}`}>
                  ({changeValue > 0 ? '+' : ''}{changeValue}%)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-4">
          {getTrendIcon()}
        </div>
      </div>
    </div>
  )
}
