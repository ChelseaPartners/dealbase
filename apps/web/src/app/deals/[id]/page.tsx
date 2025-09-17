import Link from 'next/link'
import { ArrowLeft, Building2, MapPin, Calendar, Download, Upload, Calculator, FileText, BarChart3 } from 'lucide-react'
import { Deal } from '@/types/deal'
import { DealDetailPageClient } from './DealDetailPageClient'

// Server-side data fetching
async function getDeal(slug: string): Promise<Deal | null> {
  try {
    const response = await fetch(`http://localhost:8000/api/deals/${slug}`, {
      cache: 'no-store', // Always fetch fresh data
    })
    
    if (!response.ok) {
      return null
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching deal:', error)
    return null
  }
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const dealSlug = params.id // This is actually the slug now
  const deal = await getDeal(dealSlug)
  const isLoading = false
  const error = deal ? null : 'Deal not found'

  return <DealDetailPageClient deal={deal} dealId={deal?.id?.toString() || ''} isLoading={isLoading} error={error} />
}