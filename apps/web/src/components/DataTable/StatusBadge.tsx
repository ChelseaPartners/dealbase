'use client'

import { cn } from '@/lib/utils'

export interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'critical' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusVariants = {
  default: {
    bg: 'bg-[var(--color-bg-tertiary)]',
    text: 'text-[var(--color-text-secondary)]',
    border: 'border-[var(--color-border-primary)]'
  },
  success: {
    bg: 'bg-[var(--color-success-subtle)]',
    text: 'text-[var(--color-success-primary)]',
    border: 'border-[var(--color-success-primary)]'
  },
  warning: {
    bg: 'bg-[var(--color-warning-subtle)]',
    text: 'text-[var(--color-warning-primary)]',
    border: 'border-[var(--color-warning-primary)]'
  },
  critical: {
    bg: 'bg-[var(--color-critical-subtle)]',
    text: 'text-[var(--color-critical-primary)]',
    border: 'border-[var(--color-critical-primary)]'
  },
  info: {
    bg: 'bg-[var(--color-accent-subtle)]',
    text: 'text-[var(--color-accent-primary)]',
    border: 'border-[var(--color-accent-primary)]'
  }
}

const sizeVariants = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
}

export function StatusBadge({ 
  status, 
  variant = 'default', 
  size = 'md',
  className 
}: StatusBadgeProps) {
  const variantStyles = statusVariants[variant]
  const sizeStyles = sizeVariants[size]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium transition-colors',
        variantStyles.bg,
        variantStyles.text,
        variantStyles.border,
        sizeStyles,
        className
      )}
    >
      {status}
    </span>
  )
}

// Predefined status mappings for common deal statuses
export function DealStatusBadge({ 
  status, 
  size = 'md',
  className 
}: Omit<StatusBadgeProps, 'variant'>) {
  const getVariant = (status: string): StatusBadgeProps['variant'] => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'success':
        return 'success'
      case 'pending':
      case 'draft':
      case 'in-progress':
        return 'info'
      case 'warning':
      case 'needs-attention':
        return 'warning'
      case 'error':
      case 'failed':
      case 'cancelled':
        return 'critical'
      default:
        return 'default'
    }
  }

  return (
    <StatusBadge
      status={status}
      variant={getVariant(status)}
      size={size}
      className={className}
    />
  )
}
