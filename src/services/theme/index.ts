/**
 * Theme System - Complete light/dark mode implementation
 * 
 * This module provides a comprehensive theme system with:
 * - WCAG 2.1 AA compliant color schemes
 * - System preference detection and synchronization
 * - React Context API integration
 * - Accessible theme switching components
 * - TypeScript type safety
 * - Performance optimizations with CSS custom properties
 */

// Core theme service
export { ThemeService } from './ThemeService'

// React context provider and hooks
export { 
  ThemeProvider, 
  DefaultThemeProvider,
  useTheme, 
  withTheme 
} from './ThemeProvider'

// Theme toggle components
export { 
  ThemeToggle,
  ThemeToggleIcon,
  ThemeToggleText,
  ThemeToggleFull,
  ThemeToggleSwitch
} from './ThemeToggle'

// Type definitions
export type {
  // Core theme types
  ThemeName,
  ThemeMode,
  Theme,
  ColorPalette,
  
  // Typography and spacing
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Transitions,
  
  // Context and configuration
  ThemeContextValue,
  ThemeConfig,
  
  // Component props
  ThemeProviderProps,
  ThemeToggleProps,
  
  // Service and utilities
  ThemeServiceInterface,
  CSSCustomProperties,
  AccessibilityFeatures,
  ThemeMetrics,
  ThemeEvent,
  ThemeChangeListener
} from './types'

// Predefined themes
export { lightTheme, darkTheme } from './themes'

// Theme utilities and constants
export const THEME_STORAGE_KEYS = {
  THEME: 'ai-file-organizer-theme',
  THEME_MODE: 'ai-file-organizer-theme-mode',
  FOLLOW_SYSTEM: 'ai-file-organizer-follow-system'
} as const

export const THEME_CSS_VARIABLES = {
  PREFIX: '--theme',
  COLOR_PREFIX: '--theme-color',
  TYPOGRAPHY_PREFIX: '--theme-typography',
  SPACING_PREFIX: '--theme-spacing'
} as const

/**
 * Theme system version for compatibility tracking
 */
export const THEME_SYSTEM_VERSION = '1.0.0'

/**
 * Default theme configuration
 */
export const DEFAULT_THEME_CONFIG = {
  defaultTheme: 'light' as const,
  defaultMode: 'system' as const,
  enableTransitions: true,
  storageKey: THEME_STORAGE_KEYS.THEME
} as const