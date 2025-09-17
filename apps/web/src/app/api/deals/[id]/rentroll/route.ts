import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== RENTROLL API ROUTE CALLED ===')
  console.log('Request URL:', request.url)
  console.log('Params:', params)
  
  const dealId = params.id
  
  try {
    const url = `http://localhost:8000/api/deals/${dealId}/rentroll`
    
    console.log('Fetching rent roll for deal:', dealId)
    console.log('Full URL:', url)
    
    // Get normalized rent roll data
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('Backend response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Backend API error:', response.status, errorText)
      throw new Error(`Backend API error: ${response.status} - ${errorText}`)
    }

    const rentRollData = await response.json()
    console.log('Backend response data keys:', Object.keys(rentRollData))
    console.log('Total units from backend:', rentRollData.total_units)
    console.log('Units count from backend:', rentRollData.units?.length)

    return NextResponse.json(rentRollData)
  } catch (error) {
    console.error('Error fetching rent roll data:', error)
    return NextResponse.json(
      { 
        error: `Failed to fetch rent roll data: ${error instanceof Error ? error.message : String(error)}`,
        debug: {
          dealId,
          url: `http://localhost:8000/api/deals/${dealId}/rentroll`,
          errorType: typeof error,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      },
      { status: 500 }
    )
  }
}


