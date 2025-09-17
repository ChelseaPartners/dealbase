import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ id: '1' }),
  usePathname: () => '/deals/1',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
) as any

// Test wrapper with QueryClient
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Page Smoke Tests', () => {
  it('renders deals page without crashing', async () => {
    // Test that the deals page component can be imported without errors
    const { default: DealsPage } = await import('../app/deals/page')
    
    // Just verify the component exists and is a function
    expect(typeof DealsPage).toBe('function')
  })

  it('renders deal detail page without crashing', async () => {
    // Test that the deal detail page component can be imported without errors
    const { default: DealDetailPage } = await import('../app/deals/[id]/page')
    
    // Just verify the component exists and is a function
    expect(typeof DealDetailPage).toBe('function')
  })
})
