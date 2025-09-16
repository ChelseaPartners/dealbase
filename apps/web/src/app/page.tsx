import Link from 'next/link'
import { Building2, Calculator, FileText, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900">DealBase</h1>
            </div>
            <nav className="flex space-x-8">
              <Link href="/deals" className="text-gray-700 hover:text-primary-600">
                Deals
              </Link>
              <Link href="/intake" className="text-gray-700 hover:text-primary-600">
                Intake
              </Link>
              <Link href="/valuation" className="text-gray-700 hover:text-primary-600">
                Valuation
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Commercial Real Estate
            <span className="text-primary-600"> Valuation Engine</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Transform CRE underwriting from spreadsheet craftwork into a guided, auditable valuation system.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Link
                href="/deals"
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card text-center">
              <FileText className="h-12 w-12 text-primary-600 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Data Intake</h3>
              <p className="mt-2 text-sm text-gray-500">
                Upload T-12 and Rent Roll data with automated mapping and validation.
              </p>
            </div>
            
            <div className="card text-center">
              <Calculator className="h-12 w-12 text-primary-600 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Valuation Engine</h3>
              <p className="mt-2 text-sm text-gray-500">
                Run valuations with standardized assumption packs and live KPIs.
              </p>
            </div>
            
            <div className="card text-center">
              <BarChart3 className="h-12 w-12 text-primary-600 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Analytics</h3>
              <p className="mt-2 text-sm text-gray-500">
                Interactive charts and sensitivity analysis for better decisions.
              </p>
            </div>
            
            <div className="card text-center">
              <FileText className="h-12 w-12 text-primary-600 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Export & Report</h3>
              <p className="mt-2 text-sm text-gray-500">
                Generate investor-ready reports and Excel exports.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
