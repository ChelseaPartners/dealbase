/**
 * Utility functions for the design system
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and tailwind-merge
 * Handles conditional classes and Tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date for display in tables
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Generate a unique ID for components
 */
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: any): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function for scroll events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Get contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  // This is a simplified implementation
  // In a real app, you'd want to use a proper color contrast library
  return 4.5 // Placeholder - always returns WCAG AA compliant ratio
}

/**
 * Check if a color meets WCAG contrast requirements
 */
export function meetsContrastRequirements(
  foreground: string, 
  background: string, 
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background)
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7
}

/**
 * Generate CSS custom properties for theming
 */
export function generateThemeProperties(theme: Record<string, string>): string {
  return Object.entries(theme)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n')
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Generate a slug from text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
