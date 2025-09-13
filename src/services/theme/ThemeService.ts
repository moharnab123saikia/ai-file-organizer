import { lightTheme, darkTheme } from './themes'
import type { ThemeName, ThemeMode, Theme } from './types'

/**
 * Service for managing application theme state and persistence
 * Handles theme switching, system preference detection, and CSS application
 */
export class ThemeService {
  private static readonly THEME_STORAGE_KEY = 'ai-file-organizer-theme'
  private static readonly THEME_MODE_STORAGE_KEY = 'ai-file-organizer-theme-mode'
  private static readonly FOLLOW_SYSTEM_STORAGE_KEY = 'ai-file-organizer-follow-system'

  private static readonly themes: Record<ThemeName, Theme> = {
    light: lightTheme,
    dark: darkTheme
  }

  /**
   * Get the stored theme preference from localStorage
   * @returns The stored theme name or null if not found/invalid
   */
  static getStoredTheme(): ThemeName | null {
    try {
      const stored = localStorage.getItem(this.THEME_STORAGE_KEY)
      return this.validateTheme(stored as ThemeName) ? (stored as ThemeName) : null
    } catch {
      return null
    }
  }

  /**
   * Store theme preference in localStorage
   * @param theme - The theme name to store
   */
  static storeTheme(theme: ThemeName): void {
    try {
      localStorage.setItem(this.THEME_STORAGE_KEY, theme)
    } catch {
      // Silently fail on storage errors
    }
  }

  /**
   * Get the stored theme mode preference from localStorage
   * @returns The stored theme mode or null if not found/invalid
   */
  static getStoredThemeMode(): ThemeMode | null {
    try {
      const stored = localStorage.getItem(this.THEME_MODE_STORAGE_KEY)
      return this.validateThemeMode(stored as ThemeMode) ? (stored as ThemeMode) : null
    } catch {
      return null
    }
  }

  /**
   * Store theme mode preference in localStorage
   * @param mode - The theme mode to store
   */
  static storeThemeMode(mode: ThemeMode): void {
    try {
      localStorage.setItem(this.THEME_MODE_STORAGE_KEY, mode)
    } catch {
      // Silently fail on storage errors
    }
  }

  /**
   * Detect system color scheme preference
   * @returns The system's preferred theme
   */
  static getSystemPreference(): ThemeName {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'light'
    }

    try {
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
      return darkQuery.matches ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  }

  /**
   * Apply theme to the document by setting CSS custom properties
   * @param themeName - The theme to apply
   */
  static applyTheme(themeName: ThemeName): void {
    if (typeof document === 'undefined') {
      return
    }

    const theme = this.themes[themeName]
    if (!theme) {
      return
    }

    try {
      // Set theme data attribute
      document.documentElement.setAttribute('data-theme', themeName)

      // Apply CSS custom properties
      this.applyCSSCustomProperties(theme)
    } catch {
      // Silently fail on document manipulation errors
    }
  }

  /**
   * Apply CSS custom properties from theme to document
   * @param theme - The theme object containing CSS properties
   */
  private static applyCSSCustomProperties(theme: Theme): void {
    const root = document.documentElement
    
    // Apply background color properties
    Object.entries(theme.colors.background).forEach(([key, value]) => {
      root.style.setProperty(`--theme-background-${key}`, value)
    })

    // Apply text color properties
    Object.entries(theme.colors.text).forEach(([key, value]) => {
      root.style.setProperty(`--theme-text-${key}`, value)
    })

    // Apply semantic color properties
    Object.entries(theme.colors.semantic).forEach(([key, value]) => {
      root.style.setProperty(`--theme-semantic-${key}`, value)
    })

    // Apply interactive color properties
    Object.entries(theme.colors.interactive).forEach(([key, value]) => {
      root.style.setProperty(`--theme-interactive-${key}`, value)
    })

    // Apply component color properties
    Object.entries(theme.colors.components.treeView).forEach(([key, value]) => {
      root.style.setProperty(`--theme-tree-view-${key}`, value)
    })

    Object.entries(theme.colors.components.organizationPanel).forEach(([key, value]) => {
      root.style.setProperty(`--theme-organization-panel-${key}`, value)
    })

    Object.entries(theme.colors.components.progressIndicator).forEach(([key, value]) => {
      root.style.setProperty(`--theme-progress-indicator-${key}`, value)
    })

    // Apply typography properties
    Object.entries(theme.typography.fontFamily).forEach(([key, value]) => {
      root.style.setProperty(`--theme-font-${key}`, value)
    })

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--theme-font-size-${key}`, value)
    })

    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      root.style.setProperty(`--theme-font-weight-${key}`, value.toString())
    })

    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      root.style.setProperty(`--theme-line-height-${key}`, value.toString())
    })

    // Apply spacing properties
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--theme-spacing-${key}`, value)
    })

    // Apply shadow properties
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--theme-shadow-${key}`, value)
    })

    // Apply border radius properties
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--theme-border-radius-${key}`, value)
    })

    // Apply transition properties
    Object.entries(theme.transitions).forEach(([key, value]) => {
      root.style.setProperty(`--theme-transition-${key}`, value)
    })
  }

  /**
   * Listen for system preference changes
   * @param callback - Function to call when system preference changes
   * @returns Cleanup function to remove the listener
   */
  static onSystemPreferenceChange(callback: (theme: ThemeName) => void): () => void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return () => {}
    }

    try {
      const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (event: MediaQueryListEvent) => {
        callback(event.matches ? 'dark' : 'light')
      }

      darkQuery.addEventListener('change', handleChange)

      return () => {
        darkQuery.removeEventListener('change', handleChange)
      }
    } catch {
      return () => {}
    }
  }

  /**
   * Clear all theme-related data from localStorage
   */
  static clearStorage(): void {
    try {
      localStorage.removeItem(this.THEME_STORAGE_KEY)
      localStorage.removeItem(this.THEME_MODE_STORAGE_KEY)
      localStorage.removeItem(this.FOLLOW_SYSTEM_STORAGE_KEY)
    } catch {
      // Silently fail on storage errors
    }
  }

  /**
   * Get the effective theme that should be applied
   * Takes into account stored preferences and system settings
   * @returns The theme that should be currently active
   */
  static getEffectiveTheme(): ThemeName {
    const storedMode = this.getStoredThemeMode()
    
    if (storedMode === 'system') {
      return this.getSystemPreference()
    }

    if (storedMode === 'light' || storedMode === 'dark') {
      return storedMode
    }

    const storedTheme = this.getStoredTheme()
    if (storedTheme) {
      return storedTheme
    }

    return this.getSystemPreference()
  }

  /**
   * Validate if a string is a valid theme name
   * @param theme - The theme name to validate
   * @returns True if valid theme name
   */
  static validateTheme(theme: any): theme is ThemeName {
    return typeof theme === 'string' && theme in this.themes
  }

  /**
   * Validate if a string is a valid theme mode
   * @param mode - The theme mode to validate
   * @returns True if valid theme mode
   */
  static validateThemeMode(mode: any): mode is ThemeMode {
    return typeof mode === 'string' && ['light', 'dark', 'system'].includes(mode)
  }

  /**
   * Get theme object by name
   * @param themeName - The theme name
   * @returns The theme object or undefined if not found
   */
  static getTheme(themeName: ThemeName): Theme | undefined {
    return this.themes[themeName]
  }

  /**
   * Get all available theme names
   * @returns Array of available theme names
   */
  static getAvailableThemes(): ThemeName[] {
    return Object.keys(this.themes) as ThemeName[]
  }

  /**
   * Initialize theme system with stored preferences
   * @returns The theme that was applied
   */
  static initialize(): ThemeName {
    const effectiveTheme = this.getEffectiveTheme()
    this.applyTheme(effectiveTheme)
    return effectiveTheme
  }

  /**
   * Switch to a specific theme and store the preference
   * @param theme - The theme to switch to
   * @param mode - The theme mode to set (optional, defaults to the theme name)
   */
  static switchTheme(theme: ThemeName, mode?: ThemeMode): void {
    this.storeTheme(theme)
    this.storeThemeMode(mode || theme)
    this.applyTheme(theme)
  }

  /**
   * Toggle between light and dark themes
   * @returns The new theme that was applied
   */
  static toggleTheme(): ThemeName {
    const current = this.getEffectiveTheme()
    const newTheme: ThemeName = current === 'light' ? 'dark' : 'light'
    this.switchTheme(newTheme)
    return newTheme
  }
}