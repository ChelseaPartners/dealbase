import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id
    
    const response = await fetch(`${API_BASE_URL}/api/deals/${dealId}/rentroll-assumptions`, {
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
    console.error('Error fetching rent roll assumptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rent roll assumptions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id
    const body = await request.json()
    
    const response = await fetch(`${API_BASE_URL}/api/deals/${dealId}/rentroll-assumptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating rent roll assumptions:', error)
    return NextResponse.json(
      { error: 'Failed to update rent roll assumptions' },
      { status: 500 }
    )
  }
}


