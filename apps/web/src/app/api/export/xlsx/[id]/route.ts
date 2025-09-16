import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const response = await fetch(`${API_BASE}/export/xlsx/${params.id}`)
    
    if (!response.ok) {
      throw new Error('Failed to export deal')
    }
    
    const buffer = await response.arrayBuffer()
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=deal_${params.id}_export.xlsx`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export deal' },
      { status: 500 }
    )
  }
}
