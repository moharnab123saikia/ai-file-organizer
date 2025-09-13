/**
 * Theme System Type Definitions
 * 
 * Comprehensive type system for the theme functionality including
 * theme definitions, context types, and service interfaces.
 */

// Core theme types
export type ThemeName = 'light' | 'dark'
export type ThemeMode = 'light' | 'dark' | 'system'

// Color palette structure
export interface ColorPalette {
  background: {
    primary: string      // Main background
    secondary: string    // Card/panel backgrounds
    tertiary: string     // Hover states
    elevated: string     // Modal/dropdown backgrounds
  }
  
  text: {
    primary: string      // Main text
    secondary: string    // Secondary text
    muted: string        // Disabled/placeholder text
    inverse: string      // Text on colored backgrounds
  }
  
  semantic: {
    success: string
    warning: string
    error: string
    info: string
  }
  
  interactive: {
    primary: string      // Primary buttons/links
    primaryHover: string
    secondary: string    // Secondary buttons
    secondaryHover: string
    border: string       // Default borders
    borderHover: string  // Interactive borders
    focus: string        // Focus indicators
  }
  
  components: {
    treeView: {
      selectedBackground: string
      hoverBackground: string
      expandIcon: string
    }
    organizationPanel: {
      headerBackground: string
      suggestionBackground: string
      progressBackground: string
    }
    progressIndicator: {
      background: string
      fill: string
      text: string
    }
  }
}

// Typography definitions
export interface Typography {
  fontFamily: {
    primary: string
    monospace: string
  }
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
  }
  fontWeight: {
    normal: number
    medium: number
    semibold: number
    bold: number
  }
  lineHeight: {
    tight: number
    normal: number
    relaxed: number
  }
}

// Spacing scale
export interface Spacing {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
  '3xl': string
}

// Border radius definitions
export interface BorderRadius {
  none: string
  sm: string
  md: string
  lg: string
  full: string
}

// Shadow definitions
export interface Shadows {
  sm: string
  md: string
  lg: string
  xl: string
}

// Transition definitions
export interface Transitions {
  fast: string
  normal: string
  slow: string
}

// Complete theme definition
export interface Theme {
  name: ThemeName
  colors: ColorPalette
  typography: Typography
  spacing: Spacing
  borderRadius: BorderRadius
  shadows: Shadows
  transitions: Transitions
}

// Theme context value
export interface ThemeContextValue {
  theme: Theme
  currentTheme: ThemeName
  themeMode: ThemeMode
  setTheme: (theme: ThemeName) => void
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
  systemPreference: ThemeName
  followSystem: boolean
  setFollowSystem: (follow: boolean) => void
  isLoading: boolean
}

// Theme service interface
export interface ThemeServiceInterface {
  getStoredTheme(): ThemeName | null
  storeTheme(theme: ThemeName): void
  getStoredThemeMode(): ThemeMode | null
  storeThemeMode(mode: ThemeMode): void
  getSystemPreference(): ThemeName
  applyTheme(theme: ThemeName): void
  onSystemPreferenceChange(callback: (theme: ThemeName) => void): () => void
  clearStorage(): void
}

// Theme toggle component props
export interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  variant?: 'button' | 'switch'
  className?: string
  disabled?: boolean
  ariaLabel?: string
}

// Theme provider props
export interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: ThemeName
  defaultMode?: ThemeMode
  storageKey?: string
  enableTransitions?: boolean
}

// Theme configuration
export interface ThemeConfig {
  enableSystemSync: boolean
  enableTransitions: boolean
  transitionDuration: number
  storageKey: string
  followSystemKey: string
  enableHighContrast: boolean
  enableReducedMotion: boolean
}

// CSS custom property names
export interface CSSCustomProperties {
  // Background colors
  backgroundPrimary: string
  backgroundSecondary: string
  backgroundTertiary: string
  backgroundElevated: string
  
  // Text colors
  textPrimary: string
  textSecondary: string
  textMuted: string
  textInverse: string
  
  // Semantic colors
  semanticSuccess: string
  semanticWarning: string
  semanticError: string
  semanticInfo: string
  
  // Interactive colors
  interactivePrimary: string
  interactivePrimaryHover: string
  interactiveSecondary: string
  interactiveSecondaryHover: string
  interactiveBorder: string
  interactiveBorderHover: string
  interactiveFocus: string
  
  // Component colors
  treeViewSelectedBackground: string
  treeViewHoverBackground: string
  treeViewExpandIcon: string
  organizationPanelHeaderBackground: string
  organizationPanelSuggestionBackground: string
  organizationPanelProgressBackground: string
  progressIndicatorBackground: string
  progressIndicatorFill: string
  progressIndicatorText: string
}

// Theme validation result
export interface ThemeValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Accessibility features
export interface AccessibilityFeatures {
  highContrast: boolean
  reducedMotion: boolean
  contrastRatio: number
  focusVisible: boolean
}

// Theme metrics for analytics
export interface ThemeMetrics {
  currentTheme: ThemeName
  themeMode: ThemeMode
  systemPreference: ThemeName
  lastChanged: Date
  changeCount: number
  followSystem: boolean
}

// Theme event types
export type ThemeEventType = 'theme-changed' | 'mode-changed' | 'system-preference-changed'

export interface ThemeEvent {
  type: ThemeEventType
  theme: ThemeName
  mode: ThemeMode
  timestamp: Date
  source: 'user' | 'system' | 'auto'
}

// Theme change listener
export type ThemeChangeListener = (event: ThemeEvent) => void

// Theme error types
export class ThemeError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ThemeError'
  }
}

// Predefined theme names for type safety
export const THEME_NAMES = ['light', 'dark'] as const
export const THEME_MODES = ['light', 'dark', 'system'] as const

// CSS custom property prefix
export const CSS_CUSTOM_PROPERTY_PREFIX = '--theme'

// Storage keys
export const STORAGE_KEYS = {
  THEME: 'ai-file-organizer-theme',
  THEME_MODE: 'ai-file-organizer-theme-mode',
  FOLLOW_SYSTEM: 'ai-file-organizer-follow-system'
} as const

// Default configuration
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  enableSystemSync: true,
  enableTransitions: true,
  transitionDuration: 200,
  storageKey: STORAGE_KEYS.THEME,
  followSystemKey: STORAGE_KEYS.FOLLOW_SYSTEM,
  enableHighContrast: true,
  enableReducedMotion: true
}

// Media query strings
export const MEDIA_QUERIES = {
  PREFERS_DARK: '(prefers-color-scheme: dark)',
  PREFERS_LIGHT: '(prefers-color-scheme: light)',
  PREFERS_REDUCED_MOTION: '(prefers-reduced-motion: reduce)',
  PREFERS_HIGH_CONTRAST: '(prefers-contrast: high)'
} as const