import React, { useCallback, useEffect, useState } from 'react'
import { useTheme } from './ThemeProvider'
import type { ThemeName } from './types'

// Theme toggle props
interface ThemeToggleProps {
  className?: string
  ariaLabel?: string
  showIcon?: boolean
  showText?: boolean
  size?: 'small' | 'medium' | 'large'
  variant?: 'button' | 'icon' | 'switch'
  disabled?: boolean
  tabIndex?: number
  children?: React.ReactNode
}

/**
 * Theme toggle component for switching between light and dark themes
 * Provides accessible theme switching with customizable appearance
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  ariaLabel,
  showIcon = false,
  showText = false,
  size = 'medium',
  variant = 'button',
  disabled = false,
  tabIndex,
  children
}) => {
  const { currentTheme, toggleTheme } = useTheme()
  const [reducedMotion, setReducedMotion] = useState(false)

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setReducedMotion(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        setReducedMotion(e.matches)
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  /**
   * Handle theme toggle with error handling
   */
  const handleToggle = useCallback(() => {
    if (disabled) return

    try {
      toggleTheme()
    } catch (error) {
      console.warn('Failed to toggle theme:', error)
    }
  }, [toggleTheme, disabled])

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }, [handleToggle, disabled])

  /**
   * Get theme icon based on current theme
   */
  const getThemeIcon = (theme: ThemeName): string => {
    // Show the icon for the theme we'll switch TO, not the current theme
    return theme === 'light' ? '🌙' : '☀️'
  }

  /**
   * Get theme text based on current theme
   */
  const getThemeText = (theme: ThemeName): string => {
    return theme === 'light' ? 'Light' : 'Dark'
  }

  /**
   * Generate aria-label for accessibility
   */
  const getAriaLabel = (): string => {
    if (ariaLabel) return ariaLabel
    
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light'
    return `Toggle theme (current: ${currentTheme}, switch to: ${nextTheme})`
  }

  /**
   * Generate CSS classes
   */
  const getClassName = (): string => {
    const classes = [
      'theme-toggle',
      `theme-toggle--${size}`,
      `theme-toggle--${variant}`,
      className
    ]

    if (reducedMotion) {
      classes.push('theme-toggle--reduced-motion')
    }

    if (disabled) {
      classes.push('theme-toggle--disabled')
    }

    return classes.filter(Boolean).join(' ')
  }

  /**
   * Render button content
   */
  const renderContent = () => {
    // If children are provided, use them instead of icon/text
    if (children) {
      return children
    }

    const parts: React.ReactNode[] = []

    if (showIcon) {
      parts.push(
        <span key="icon" className="theme-toggle__icon" aria-hidden="true">
          {getThemeIcon(currentTheme)}
        </span>
      )
    }

    if (showText) {
      parts.push(
        <span key="text" className="theme-toggle__text">
          {getThemeText(currentTheme)}
        </span>
      )
    }

    // If neither icon nor text is shown and no children, show default icon
    if (parts.length === 0) {
      parts.push(
        <span key="default" className="theme-toggle__icon" aria-hidden="true">
          {getThemeIcon(currentTheme)}
        </span>
      )
    }

    return parts
  }

  return (
    <button
      type="button"
      className={getClassName()}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-label={getAriaLabel()}
      tabIndex={tabIndex}
    >
      {renderContent()}
    </button>
  )
}

/**
 * Theme toggle with icon only
 */
export const ThemeToggleIcon: React.FC<Omit<ThemeToggleProps, 'showIcon' | 'variant'>> = (props) => (
  <ThemeToggle {...props} showIcon variant="icon" />
)

/**
 * Theme toggle with text only
 */
export const ThemeToggleText: React.FC<Omit<ThemeToggleProps, 'showText' | 'variant'>> = (props) => (
  <ThemeToggle {...props} showText variant="button" />
)

/**
 * Theme toggle with both icon and text
 */
export const ThemeToggleFull: React.FC<Omit<ThemeToggleProps, 'showIcon' | 'showText'>> = (props) => (
  <ThemeToggle {...props} showIcon showText />
)

/**
 * Switch-style theme toggle
 */
export const ThemeToggleSwitch: React.FC<Omit<ThemeToggleProps, 'variant'>> = (props) => (
  <ThemeToggle {...props} variant="switch" />
)