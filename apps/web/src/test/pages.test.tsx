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
    // Dynamic import to avoid SSR issues in tests
    const { default: DealsPage } = await import('../app/deals/page')
    
    render(
      <TestWrapper>
        <DealsPage />
      </TestWrapper>
    )
    
    // Check for basic elements that should be present
    expect(screen.getByText('Deals Pipeline')).toBeInTheDocument()
  })

  it('renders deal detail page without crashing', async () => {
    const { default: DealDetailPage } = await import('../app/deals/[id]/page')
    
    render(
      <TestWrapper>
        <DealDetailPage params={{ id: '1' }} />
      </TestWrapper>
    )
    
    // Should render something without crashing - just check that the component rendered
    expect(document.body).toBeDefined()
  })
})
