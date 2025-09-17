'use client'

import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function GlobalHeader() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">DealBase</h1>
            </Link>
          </div>
          <nav className="flex space-x-8">
            <Link 
              href="/deals" 
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
            >
              Deals
            </Link>
            <Link 
              href="/intake" 
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
            >
              Intake
            </Link>
            <Link 
              href="/valuation" 
              className="text-gray-700 hover:text-primary-600 font-medium transition-colors"
            >
              Valuation
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
