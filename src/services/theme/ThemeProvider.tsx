import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { ThemeService } from './ThemeService'
import { lightTheme, darkTheme } from './themes'
import type { ThemeName, ThemeMode, ThemeContextValue, Theme } from './types'

// Theme context
const ThemeContext = createContext<ThemeContextValue | null>(null)

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: ThemeName
  defaultMode?: ThemeMode
  storageKey?: string
  enableTransitions?: boolean
}

/**
 * Theme provider component that manages application theme state
 * Provides theme context to child components
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme,
  defaultMode,
  storageKey,
  enableTransitions = true
}) => {
  // State for theme management
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('light')
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light')
  const [systemPreference, setSystemPreference] = useState<ThemeName>('light')
  const [followSystem, setFollowSystemState] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Theme objects map
  const themes: Record<ThemeName, Theme> = {
    light: lightTheme,
    dark: darkTheme
  }

  // Get current theme object
  const theme = themes[currentTheme]

  /**
   * Initialize theme system
   */
  const initializeTheme = useCallback(() => {
    try {
      // Get initial system preference
      const initialSystemPreference = ThemeService.getSystemPreference()
      setSystemPreference(initialSystemPreference)

      // Get stored preferences or use defaults
      const storedThemeMode = ThemeService.getStoredThemeMode() || defaultMode
      const storedTheme = ThemeService.getStoredTheme() || defaultTheme

      // Get follow system preference from localStorage
      const storedFollowSystem = getStoredFollowSystem()
      setFollowSystemState(storedFollowSystem)

      // Set theme mode first
      setThemeModeState(storedThemeMode || 'light')

      // Initialize theme
      const effectiveTheme = ThemeService.initialize()
      setCurrentTheme(effectiveTheme)

      setIsLoading(false)
    } catch (error) {
      // Fallback to defaults on error
      console.warn('Theme initialization failed, using defaults:', error)
      setCurrentTheme(defaultTheme || 'light')
      setThemeModeState(defaultMode || 'light')
      setSystemPreference('light')
      setFollowSystemState(false)
      setIsLoading(false)
    }
  }, [defaultTheme, defaultMode])

  /**
   * Get follow system preference from localStorage
   */
  const getStoredFollowSystem = (): boolean => {
    try {
      const stored = localStorage.getItem('ai-file-organizer-follow-system')
      return stored === 'true'
    } catch {
      return false
    }
  }

  /**
   * Store follow system preference in localStorage
   */
  const storeFollowSystem = (follow: boolean): void => {
    try {
      localStorage.setItem('ai-file-organizer-follow-system', follow.toString())
    } catch {
      // Silently fail on storage errors
    }
  }

  /**
   * Set theme and update storage
   */
  const setTheme = useCallback((themeName: ThemeName) => {
    try {
      ThemeService.switchTheme(themeName)
      setCurrentTheme(themeName)
      setThemeModeState(themeName)
    } catch (error) {
      console.warn('Failed to set theme:', error)
    }
  }, [])

  /**
   * Set theme mode and update storage
   */
  const setThemeMode = useCallback((mode: ThemeMode) => {
    try {
      ThemeService.storeThemeMode(mode)
      setThemeModeState(mode)

      // Apply appropriate theme based on mode
      if (mode === 'system') {
        const systemTheme = ThemeService.getSystemPreference()
        ThemeService.applyTheme(systemTheme)
        setCurrentTheme(systemTheme)
      } else {
        ThemeService.applyTheme(mode)
        setCurrentTheme(mode)
      }
    } catch (error) {
      console.warn('Failed to set theme mode:', error)
    }
  }, [])

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = useCallback(() => {
    try {
      const newTheme = ThemeService.toggleTheme()
      setCurrentTheme(newTheme)
      setThemeModeState(newTheme)
    } catch (error) {
      console.warn('Failed to toggle theme:', error)
    }
  }, [])

  /**
   * Set follow system preference
   */
  const setFollowSystem = useCallback((follow: boolean) => {
    try {
      setFollowSystemState(follow)
      storeFollowSystem(follow)

      if (follow) {
        // Switch to system mode and apply system preference
        const systemTheme = ThemeService.getSystemPreference()
        ThemeService.storeThemeMode('system')
        ThemeService.applyTheme(systemTheme)
        setThemeModeState('system')
        setCurrentTheme(systemTheme)
      }
    } catch (error) {
      console.warn('Failed to set follow system:', error)
    }
  }, [])

  /**
   * Handle system preference changes
   */
  const handleSystemPreferenceChange = useCallback((newSystemPreference: ThemeName) => {
    setSystemPreference(newSystemPreference)

    // If in system mode, update current theme
    setThemeModeState(currentMode => {
      if (currentMode === 'system') {
        ThemeService.applyTheme(newSystemPreference)
        setCurrentTheme(newSystemPreference)
      }
      return currentMode
    })
  }, [])

  // Initialize theme on mount
  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])

  // Listen for system preference changes
  useEffect(() => {
    const cleanup = ThemeService.onSystemPreferenceChange(handleSystemPreferenceChange)
    return cleanup
  }, [handleSystemPreferenceChange])

  // Context value
  const contextValue: ThemeContextValue = {
    theme,
    currentTheme,
    themeMode,
    setTheme,
    setThemeMode,
    toggleTheme,
    systemPreference,
    followSystem,
    setFollowSystem,
    isLoading
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to use theme context
 * Must be used within a ThemeProvider
 */
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return context
}

/**
 * HOC to provide theme context to a component
 */
export const withTheme = <P extends object>(
  Component: React.ComponentType<P & { theme: Theme }>
) => {
  const WithThemeComponent = (props: P) => {
    const { theme } = useTheme()
    return <Component {...props} theme={theme} />
  }

  WithThemeComponent.displayName = `withTheme(${Component.displayName || Component.name})`
  
  return WithThemeComponent
}

/**
 * Default theme provider with sensible defaults
 */
export const DefaultThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ThemeProvider defaultTheme="light" defaultMode="system" enableTransitions>
    {children}
  </ThemeProvider>
)