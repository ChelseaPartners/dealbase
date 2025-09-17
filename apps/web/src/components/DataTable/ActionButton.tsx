'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface ActionButtonProps {
  icon: ReactNode
  label: string
  variant?: 'default' | 'primary' | 'secondary' | 'critical' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
  'aria-label'?: string
}

const variantStyles = {
  default: {
    base: 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]',
    focus: 'focus:ring-[var(--color-accent-primary)]'
  },
  primary: {
    base: 'text-[var(--color-accent-primary)] hover:text-[var(--color-accent-secondary)] hover:bg-[var(--color-accent-subtle)]',
    focus: 'focus:ring-[var(--color-accent-primary)]'
  },
  secondary: {
    base: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]',
    focus: 'focus:ring-[var(--color-text-primary)]'
  },
  critical: {
    base: 'text-[var(--color-critical-primary)] hover:text-[var(--color-critical-secondary)] hover:bg-[var(--color-critical-subtle)]',
    focus: 'focus:ring-[var(--color-critical-primary)]'
  },
  ghost: {
    base: 'text-[var(--color-text-quaternary)] hover:text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)]',
    focus: 'focus:ring-[var(--color-text-tertiary)]'
  }
}

const sizeStyles = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5'
}

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
}

export function ActionButton({
  icon,
  label,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className,
  'aria-label': ariaLabel,
  ...props
}: ActionButtonProps) {
  const variantStyle = variantStyles[variant]
  const sizeStyle = sizeStyles[size]
  const iconSize = iconSizes[size]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel || label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'disabled:hover:bg-transparent disabled:hover:text-current',
        variantStyle.base,
        variantStyle.focus,
        sizeStyle,
        className
      )}
      {...props}
    >
      {loading ? (
        <div className={cn('animate-spin', iconSize)}>
          <svg
            className="h-full w-full"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : (
        <span className={iconSize}>{icon}</span>
      )}
    </button>
  )
}

// Specialized action buttons for common table actions
export function ViewButton({ 
  onClick, 
  label = 'View details',
  size = 'md',
  className 
}: {
  onClick?: (e: React.MouseEvent) => void
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <ActionButton
      icon={
        <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      }
      label={label}
      variant="primary"
      size={size}
      onClick={onClick}
      className={className}
    />
  )
}

export function DeleteButton({ 
  onClick, 
  label = 'Delete',
  size = 'md',
  className 
}: {
  onClick?: (e: React.MouseEvent) => void
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <ActionButton
      icon={
        <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      }
      label={label}
      variant="critical"
      size={size}
      onClick={onClick}
      className={className}
    />
  )
}

export function EditButton({ 
  onClick, 
  label = 'Edit',
  size = 'md',
  className 
}: {
  onClick?: (e: React.MouseEvent) => void
  label?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <ActionButton
      icon={
        <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      }
      label={label}
      variant="secondary"
      size={size}
      onClick={onClick}
      className={className}
    />
  )
}
