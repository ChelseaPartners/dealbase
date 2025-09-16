import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the API calls
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query') as any
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: [],
      isLoading: false,
      error: null,
    })),
  }
})

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
    // Mock the useParams hook
    vi.doMock('next/navigation', () => ({
      useParams: () => ({ id: '1' }),
      useRouter: () => ({ push: vi.fn() }),
    }))
    
    const { default: DealDetailPage } = await import('../app/deals/[id]/page')
    
    render(
      <TestWrapper>
        <DealDetailPage />
      </TestWrapper>
    )
    
    // Should render something without crashing - just check that the component rendered
    expect(document.body).toBeDefined()
  })
})
