import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id
    console.log('Frontend API: Fetching deal', dealId, 'from', `${API_BASE}/deals/${dealId}`)
    const response = await fetch(`${API_BASE}/deals/${dealId}`)
    console.log('Frontend API: Response status', response.status)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      )
    }
    
    const data = await response.json()
    console.log('Frontend API: Deal data received', data.name)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Frontend API: Error', error)
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id
    console.log('Frontend API: Deleting deal', dealId, 'from', `${API_BASE}/deals/${dealId}`)
    
    const response = await fetch(`${API_BASE}/deals/${dealId}`, {
      method: 'DELETE',
    })
    
    console.log('Frontend API: Delete response status', response.status)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Failed to delete deal' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log('Frontend API: Deal deleted successfully', data)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Frontend API: Delete error', error)
    return NextResponse.json(
      { error: 'Failed to delete deal' },
      { status: 500 }
    )
  }
}