import { NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id
    
    // Get normalized rent roll data
    const response = await fetch(`${API_BASE_URL}/api/deals/${dealId}/rentroll/normalized`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`)
    }

    const nrrData = await response.json()
    
    // Convert to expected format for RentRollTable
    const rentRollData = {
      deal_id: parseInt(dealId),
      units: nrrData.data.map((unit: any) => ({
        id: unit.unit_number, // Use unit_number as ID
        unit_number: unit.unit_number,
        unit_label: unit.unit_label,
        unit_type: 'Unknown', // This would need to be derived or stored
        square_feet: unit.unit_sf,
        bedrooms: null,
        bathrooms: null,
        actual_rent: unit.actual_rent,
        market_rent: unit.market_rent || 0,
        lease_start: unit.lease_start_date,
        move_in_date: unit.move_in_date,
        lease_expiration: unit.lease_expiration_date,
        tenant_name: null,
        lease_status: 'occupied' // Default status
      })),
      total_units: nrrData.total_count
    }

    return NextResponse.json(rentRollData)
  } catch (error) {
    console.error('Error fetching rent roll data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rent roll data' },
      { status: 500 }
    )
  }
}


