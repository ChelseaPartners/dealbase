import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KPICard } from '@/components/KPICard'

describe('KPICard', () => {
  it('renders KPI card with correct data', () => {
    render(
      <KPICard
        title="IRR"
        value="15.2%"
        trend="up"
        subtitle="Internal Rate of Return"
      />
    )
    
    expect(screen.getByText('IRR')).toBeInTheDocument()
    expect(screen.getByText('15.2%')).toBeInTheDocument()
    expect(screen.getByText('Internal Rate of Return')).toBeInTheDocument()
  })

  it('renders with neutral trend', () => {
    render(
      <KPICard
        title="Cap Rate"
        value="5.5%"
        trend="neutral"
      />
    )
    
    expect(screen.getByText('Cap Rate')).toBeInTheDocument()
    expect(screen.getByText('5.5%')).toBeInTheDocument()
  })
})
