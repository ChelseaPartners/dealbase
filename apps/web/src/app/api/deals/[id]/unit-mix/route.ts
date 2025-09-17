import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id
    const url = `${API_BASE_URL}/api/deals/${dealId}/unit-mix`
    
    console.log('=== NEXT.JS API DEBUG ===')
    console.log('API_BASE_URL:', API_BASE_URL)
    console.log('Deal ID:', dealId)
    console.log('Full URL:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.log('Error response body:', errorText)
      throw new Error(`Backend API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('Response data keys:', Object.keys(data))
    console.log('Full response data:', JSON.stringify(data, null, 2))
    console.log('=== END DEBUG ===')
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in Next.js API route:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unit mix data', details: error.message },
      { status: 500 }
    )
  }
}


