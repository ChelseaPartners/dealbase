import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const dealId = params.id
  
  try {
    // Forward query parameters to backend
    const searchParams = request.nextUrl.searchParams
    const queryString = searchParams.toString()
    const url = `http://localhost:8000/api/deals/${dealId}/unit-mix${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in Next.js API route:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch unit mix data', 
        details: error instanceof Error ? error.message : String(error),
        debug: {
          dealId,
          url: `http://localhost:8000/api/deals/${dealId}/unit-mix`,
          errorType: typeof error
        }
      },
      { status: 500 }
    )
  }
}


