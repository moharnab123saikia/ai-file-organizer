import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ThemeService } from '../ThemeService'
import { lightTheme, darkTheme } from '../themes'
import type { ThemeName, ThemeMode } from '../types'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock window.matchMedia
const matchMediaMock = vi.fn()

// Mock document
const documentMock = {
  documentElement: {
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    style: {
      setProperty: vi.fn(),
      removeProperty: vi.fn()
    }
  }
}

describe('ThemeService', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock global objects
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    Object.defineProperty(window, 'matchMedia', { value: matchMediaMock })
    Object.defineProperty(global, 'document', { value: documentMock })
    
    // Default matchMedia implementation
    matchMediaMock.mockImplementation((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getStoredTheme', () => {
    it('should return stored theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark')
      
      const result = ThemeService.getStoredTheme()
      
      expect(result).toBe('dark')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('ai-file-organizer-theme')
    })

    it('should return null when no theme is stored', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = ThemeService.getStoredTheme()
      
      expect(result).toBeNull()
    })

    it('should return null for invalid theme values', () => {
      localStorageMock.getItem.mockReturnValue('invalid-theme')
      
      const result = ThemeService.getStoredTheme()
      
      expect(result).toBeNull()
    })
  })

  describe('storeTheme', () => {
    it('should store theme in localStorage', () => {
      ThemeService.storeTheme('dark')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai-file-organizer-theme', 'dark')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })
      
      expect(() => ThemeService.storeTheme('dark')).not.toThrow()
    })
  })

  describe('getStoredThemeMode', () => {
    it('should return stored theme mode from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('system')
      
      const result = ThemeService.getStoredThemeMode()
      
      expect(result).toBe('system')
      expect(localStorageMock.getItem).toHaveBeenCalledWith('ai-file-organizer-theme-mode')
    })

    it('should return null when no theme mode is stored', () => {
      localStorageMock.getItem.mockReturnValue(null)
      
      const result = ThemeService.getStoredThemeMode()
      
      expect(result).toBeNull()
    })

    it('should return null for invalid theme mode values', () => {
      localStorageMock.getItem.mockReturnValue('invalid-mode')
      
      const result = ThemeService.getStoredThemeMode()
      
      expect(result).toBeNull()
    })
  })

  describe('storeThemeMode', () => {
    it('should store theme mode in localStorage', () => {
      ThemeService.storeThemeMode('system')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai-file-organizer-theme-mode', 'system')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })
      
      expect(() => ThemeService.storeThemeMode('system')).not.toThrow()
    })
  })

  describe('getSystemPreference', () => {
    it('should return dark when system prefers dark mode', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
      
      const result = ThemeService.getSystemPreference()
      
      expect(result).toBe('dark')
    })

    it('should return light when system prefers light mode', () => {
      matchMediaMock.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
      
      const result = ThemeService.getSystemPreference()
      
      expect(result).toBe('light')
    })

    it('should return light as fallback when matchMedia is not available', () => {
      Object.defineProperty(window, 'matchMedia', { value: undefined })
      
      const result = ThemeService.getSystemPreference()
      
      expect(result).toBe('light')
    })
  })

  describe('applyTheme', () => {
    it('should apply light theme to document', () => {
      ThemeService.applyTheme('light')
      
      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'light')
      expect(documentMock.documentElement.style.setProperty).toHaveBeenCalled()
    })

    it('should apply dark theme to document', () => {
      ThemeService.applyTheme('dark')
      
      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark')
      expect(documentMock.documentElement.style.setProperty).toHaveBeenCalled()
    })

    it('should apply CSS custom properties for light theme', () => {
      ThemeService.applyTheme('light')
      
      expect(documentMock.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-background-primary',
        lightTheme.colors.background.primary
      )
      expect(documentMock.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-text-primary',
        lightTheme.colors.text.primary
      )
    })

    it('should apply CSS custom properties for dark theme', () => {
      ThemeService.applyTheme('dark')
      
      expect(documentMock.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-background-primary',
        darkTheme.colors.background.primary
      )
      expect(documentMock.documentElement.style.setProperty).toHaveBeenCalledWith(
        '--theme-text-primary',
        darkTheme.colors.text.primary
      )
    })

    it('should handle missing document gracefully', () => {
      Object.defineProperty(global, 'document', { value: undefined })
      
      expect(() => ThemeService.applyTheme('light')).not.toThrow()
    })
  })

  describe('onSystemPreferenceChange', () => {
    it('should listen for system preference changes', () => {
      const callback = vi.fn()
      const mockMediaQuery = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }
      
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      const cleanup = ThemeService.onSystemPreferenceChange(callback)
      
      expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)')
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      
      // Test cleanup
      cleanup()
      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should call callback when system preference changes', () => {
      const callback = vi.fn()
      let changeHandler: (event: any) => void
      
      const mockMediaQuery = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event, handler) => {
          changeHandler = handler
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }
      
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      ThemeService.onSystemPreferenceChange(callback)
      
      // Simulate system preference change to dark
      changeHandler!({ matches: true })
      expect(callback).toHaveBeenCalledWith('dark')
      
      // Simulate system preference change to light
      changeHandler!({ matches: false })
      expect(callback).toHaveBeenCalledWith('light')
    })

    it('should handle matchMedia not available', () => {
      Object.defineProperty(window, 'matchMedia', { value: undefined })
      
      const callback = vi.fn()
      const cleanup = ThemeService.onSystemPreferenceChange(callback)
      
      expect(cleanup).toBeInstanceOf(Function)
      expect(() => cleanup()).not.toThrow()
    })
  })

  describe('clearStorage', () => {
    it('should remove all theme-related items from localStorage', () => {
      ThemeService.clearStorage()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ai-file-organizer-theme')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ai-file-organizer-theme-mode')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ai-file-organizer-follow-system')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      expect(() => ThemeService.clearStorage()).not.toThrow()
    })
  })

  describe('getEffectiveTheme', () => {
    it('should return stored theme when mode is not system', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'ai-file-organizer-theme') return 'dark'
        if (key === 'ai-file-organizer-theme-mode') return 'dark'
        return null
      })
      
      const result = ThemeService.getEffectiveTheme()
      
      expect(result).toBe('dark')
    })

    it('should return system preference when mode is system', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'ai-file-organizer-theme-mode') return 'system'
        return null
      })
      
      matchMediaMock.mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
      
      const result = ThemeService.getEffectiveTheme()
      
      expect(result).toBe('dark')
    })

    it('should fallback to light theme when nothing is stored', () => {
      localStorageMock.getItem.mockReturnValue(null)
      matchMediaMock.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
      
      const result = ThemeService.getEffectiveTheme()
      
      expect(result).toBe('light')
    })
  })

  describe('validateTheme', () => {
    it('should return true for valid theme names', () => {
      expect(ThemeService.validateTheme('light')).toBe(true)
      expect(ThemeService.validateTheme('dark')).toBe(true)
    })

    it('should return false for invalid theme names', () => {
      expect(ThemeService.validateTheme('invalid' as ThemeName)).toBe(false)
      expect(ThemeService.validateTheme('' as ThemeName)).toBe(false)
      expect(ThemeService.validateTheme(null as any)).toBe(false)
      expect(ThemeService.validateTheme(undefined as any)).toBe(false)
    })
  })

  describe('validateThemeMode', () => {
    it('should return true for valid theme modes', () => {
      expect(ThemeService.validateThemeMode('light')).toBe(true)
      expect(ThemeService.validateThemeMode('dark')).toBe(true)
      expect(ThemeService.validateThemeMode('system')).toBe(true)
    })

    it('should return false for invalid theme modes', () => {
      expect(ThemeService.validateThemeMode('invalid' as ThemeMode)).toBe(false)
      expect(ThemeService.validateThemeMode('' as ThemeMode)).toBe(false)
      expect(ThemeService.validateThemeMode(null as any)).toBe(false)
      expect(ThemeService.validateThemeMode(undefined as any)).toBe(false)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete theme switching workflow', () => {
      // Start with system preference
      matchMediaMock.mockImplementation((query: string) => ({
        matches: false, // light mode
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
      
      // Get initial theme
      expect(ThemeService.getEffectiveTheme()).toBe('light')
      
      // Switch to dark theme
      ThemeService.storeTheme('dark')
      ThemeService.storeThemeMode('dark')
      ThemeService.applyTheme('dark')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai-file-organizer-theme', 'dark')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai-file-organizer-theme-mode', 'dark')
      expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark')
    })

    it('should handle system preference synchronization', () => {
      const callback = vi.fn()
      let changeHandler: (event: any) => void
      
      const mockMediaQuery = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event, handler) => {
          changeHandler = handler
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }
      
      matchMediaMock.mockReturnValue(mockMediaQuery)
      
      // Set up system mode
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'ai-file-organizer-theme-mode') return 'system'
        return null
      })
      
      // Listen for changes
      ThemeService.onSystemPreferenceChange(callback)
      
      // Simulate system change to dark
      changeHandler!({ matches: true })
      expect(callback).toHaveBeenCalledWith('dark')
      
      // Verify effective theme reflects system preference
      mockMediaQuery.matches = true
      expect(ThemeService.getEffectiveTheme()).toBe('dark')
    })
  })
})