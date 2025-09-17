'use client'

import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumb?: ReactNode
}

export default function PageHeader({ title, subtitle, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {breadcrumb && (
            <div className="mb-4">
              {breadcrumb}
            </div>
          )}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="mt-2 text-gray-600">{subtitle}</p>
              )}
            </div>
            {actions && (
              <div className="flex space-x-3">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
