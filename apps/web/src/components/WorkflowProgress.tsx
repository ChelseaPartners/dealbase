'use client'

import { Check, FileText, Calculator, BarChart3, Download } from 'lucide-react'

interface WorkflowStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  status: 'completed' | 'active' | 'pending' | 'disabled'
  href?: string
}

interface WorkflowProgressProps {
  currentStep: string
  dealId: string
  hasData?: boolean
  hasValuation?: boolean
  hasResults?: boolean
}

export function WorkflowProgress({ 
  currentStep, 
  dealId, 
  hasData = false, 
  hasValuation = false, 
  hasResults = false 
}: WorkflowProgressProps) {
  const steps: WorkflowStep[] = [
    {
      id: 'create',
      title: 'Create Deal',
      description: 'Set up basic deal information',
      icon: FileText,
      status: currentStep === 'create' ? 'active' : 'completed',
      href: `/deals/${dealId}`
    },
    {
      id: 'data',
      title: 'Upload Data',
      description: 'Add T-12 and Rent Roll data',
      icon: FileText,
      status: currentStep === 'data' ? 'active' : hasData ? 'completed' : 'pending',
      href: `/intake/${dealId}`
    },
    {
      id: 'valuation',
      title: 'Run Valuation',
      description: 'Configure assumptions and calculate',
      icon: Calculator,
      status: currentStep === 'valuation' ? 'active' : hasValuation ? 'completed' : hasData ? 'pending' : 'disabled',
      href: `/valuation/${dealId}`
    },
    {
      id: 'analysis',
      title: 'Analyze Results',
      description: 'Review KPIs and charts',
      icon: BarChart3,
      status: currentStep === 'analysis' ? 'active' : hasResults ? 'completed' : hasValuation ? 'pending' : 'disabled',
      href: `/deals/${dealId}`
    },
    {
      id: 'export',
      title: 'Export Report',
      description: 'Generate investor-ready reports',
      icon: Download,
      status: currentStep === 'export' ? 'active' : hasResults ? 'pending' : 'disabled',
      href: `/api/export/xlsx/${dealId}`
    }
  ]

  const getStepClasses = (step: WorkflowStep) => {
    const baseClasses = 'workflow-step'
    switch (step.status) {
      case 'completed':
        return `${baseClasses} workflow-step-completed`
      case 'active':
        return `${baseClasses} workflow-step-active`
      case 'pending':
        return `${baseClasses} workflow-step-pending`
      default:
        return `${baseClasses} workflow-step-pending opacity-50`
    }
  }

  const getLineClasses = (index: number) => {
    const baseClasses = 'workflow-line'
    const isCompleted = steps[index].status === 'completed' || steps[index].status === 'active'
    return isCompleted ? `${baseClasses} workflow-line-completed` : baseClasses
  }

  return (
    <div className="card-elevated">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Deal Workflow</h3>
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center relative">
              {/* Step Circle */}
              <div className={getStepClasses(step)}>
                {step.status === 'completed' ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </div>
              
              {/* Step Info */}
              <div className="mt-3 text-center max-w-24">
                <h4 className={`text-sm font-medium ${
                  step.status === 'active' ? 'text-primary-600' : 
                  step.status === 'completed' ? 'text-green-600' : 
                  'text-gray-500'
                }`}>
                  {step.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {step.description}
                </p>
              </div>
              
              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className={getLineClasses(index)}></div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Progress Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {steps.filter(s => s.status === 'completed').length} of {steps.length} steps completed
          </span>
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
                }}
              ></div>
            </div>
            <span className="text-gray-500 font-medium">
              {Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
