import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '../ThemeProvider'
import { ThemeService } from '../ThemeService'
import { lightTheme, darkTheme } from '../themes'
import type { ThemeName, ThemeMode } from '../types'

// Mock ThemeService
vi.mock('../ThemeService')

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock window.matchMedia
const matchMediaMock = vi.fn()

// Test component that uses the theme context
const TestComponent = () => {
  const {
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
  } = useTheme()

  return (
    <div>
      <div data-testid="current-theme">{currentTheme}</div>
      <div data-testid="theme-mode">{themeMode}</div>
      <div data-testid="system-preference">{systemPreference}</div>
      <div data-testid="follow-system">{followSystem.toString()}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="theme-name">{theme.name}</div>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button data-testid="set-mode-system" onClick={() => setThemeMode('system')}>
        Set System Mode
      </button>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
      <button data-testid="toggle-follow-system" onClick={() => setFollowSystem(!followSystem)}>
        Toggle Follow System
      </button>
    </div>
  )
}

describe('ThemeProvider', () => {
  const mockThemeService = vi.mocked(ThemeService)

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock global objects
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    Object.defineProperty(window, 'matchMedia', { value: matchMediaMock })
    
    // Default ThemeService mocks
    mockThemeService.getStoredTheme.mockReturnValue('light')
    mockThemeService.getStoredThemeMode.mockReturnValue('light')
    mockThemeService.getSystemPreference.mockReturnValue('light')
    mockThemeService.getEffectiveTheme.mockReturnValue('light')
    mockThemeService.applyTheme.mockImplementation(() => {})
    mockThemeService.storeTheme.mockImplementation(() => {})
    mockThemeService.storeThemeMode.mockImplementation(() => {})
    mockThemeService.onSystemPreferenceChange.mockReturnValue(() => {})
    mockThemeService.initialize.mockReturnValue('light')
    mockThemeService.switchTheme.mockImplementation(() => {})
    mockThemeService.toggleTheme.mockReturnValue('dark')

    // Default localStorage mock
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'ai-file-organizer-follow-system') return 'false'
      return null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default theme', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
      expect(screen.getByTestId('theme-mode')).toHaveTextContent('light')
      expect(screen.getByTestId('theme-name')).toHaveTextContent('light')
      expect(mockThemeService.initialize).toHaveBeenCalled()
    })

    it('should initialize with custom default theme', () => {
      mockThemeService.getEffectiveTheme.mockReturnValue('dark')
      mockThemeService.initialize.mockReturnValue('dark')

      render(
        <ThemeProvider defaultTheme="dark">
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      expect(screen.getByTestId('theme-name')).toHaveTextContent('dark')
    })

    it('should initialize with custom default mode', () => {
      mockThemeService.getStoredThemeMode.mockReturnValue('system')

      render(
        <ThemeProvider defaultMode="system">
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('theme-mode')).toHaveTextContent('system')
    })

    it('should detect system preference correctly', () => {
      mockThemeService.getSystemPreference.mockReturnValue('dark')

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('system-preference')).toHaveTextContent('dark')
    })

    it('should handle follow system preference from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'ai-file-organizer-follow-system') return 'true'
        return null
      })

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('follow-system')).toHaveTextContent('true')
    })
  })

  describe('theme switching', () => {
    it('should switch to light theme', async () => {
      const user = userEvent.setup()

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await user.click(screen.getByTestId('set-light'))

      expect(mockThemeService.switchTheme).toHaveBeenCalledWith('light')
    })

    it('should switch to dark theme', async () => {
      const user = userEvent.setup()

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await user.click(screen.getByTestId('set-dark'))

      expect(mockThemeService.switchTheme).toHaveBeenCalledWith('dark')
    })

    it('should toggle theme', async () => {
      const user = userEvent.setup()

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await user.click(screen.getByTestId('toggle-theme'))

      expect(mockThemeService.toggleTheme).toHaveBeenCalled()
    })

    it('should update state when theme changes', async () => {
      const user = userEvent.setup()
      mockThemeService.toggleTheme.mockReturnValue('dark')

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await user.click(screen.getByTestId('toggle-theme'))

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
      expect(screen.getByTestId('theme-name')).toHaveTextContent('dark')
    })
  })

  describe('theme mode switching', () => {
    it('should switch to system mode', async () => {
      const user = userEvent.setup()

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await user.click(screen.getByTestId('set-mode-system'))

      expect(mockThemeService.storeThemeMode).toHaveBeenCalledWith('system')
    })

    it('should update theme when switching to system mode', async () => {
      const user = userEvent.setup()
      mockThemeService.getSystemPreference.mockReturnValue('dark')

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await user.click(screen.getByTestId('set-mode-system'))

      expect(screen.getByTestId('theme-mode')).toHaveTextContent('system')
    })
  })

  describe('system preference synchronization', () => {
    it('should listen for system preference changes on mount', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(mockThemeService.onSystemPreferenceChange).toHaveBeenCalled()
    })

    it('should update theme when system preference changes', () => {
      let systemChangeCallback: (theme: ThemeName) => void = () => {}
      
      mockThemeService.onSystemPreferenceChange.mockImplementation((callback) => {
        systemChangeCallback = callback
        return () => {}
      })

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      // Simulate system preference change
      act(() => {
        systemChangeCallback('dark')
      })

      expect(screen.getByTestId('system-preference')).toHaveTextContent('dark')
    })

    it('should apply system preference when in system mode', () => {
      let systemChangeCallback: (theme: ThemeName) => void = () => {}
      
      mockThemeService.onSystemPreferenceChange.mockImplementation((callback) => {
        systemChangeCallback = callback
        return () => {}
      })

      // Mock getStoredThemeMode to return 'system' so initialization sets system mode
      mockThemeService.getStoredThemeMode.mockReturnValue('system')

      render(
        <ThemeProvider defaultMode="system">
          <TestComponent />
        </ThemeProvider>
      )

      // Clear any previous calls from initialization
      mockThemeService.applyTheme.mockClear()

      // Simulate system preference change
      act(() => {
        systemChangeCallback('dark')
      })

      expect(mockThemeService.applyTheme).toHaveBeenCalledWith('dark')
    })

    it('should not apply system preference when not in system mode', () => {
      let systemChangeCallback: (theme: ThemeName) => void = () => {}
      
      mockThemeService.onSystemPreferenceChange.mockImplementation((callback) => {
        systemChangeCallback = callback
        return () => {}
      })

      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      )

      // Clear previous calls
      mockThemeService.applyTheme.mockClear()

      // Simulate system preference change
      act(() => {
        systemChangeCallback('dark')
      })

      expect(mockThemeService.applyTheme).not.toHaveBeenCalledWith('dark')
    })
  })

  describe('followSystem preference', () => {
    it('should toggle follow system preference', async () => {
      const user = userEvent.setup()

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await user.click(screen.getByTestId('toggle-follow-system'))

      expect(screen.getByTestId('follow-system')).toHaveTextContent('true')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai-file-organizer-follow-system', 'true')
    })

    it('should apply system theme when enabling follow system', async () => {
      const user = userEvent.setup()
      mockThemeService.getSystemPreference.mockReturnValue('dark')

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await user.click(screen.getByTestId('toggle-follow-system'))

      expect(mockThemeService.storeThemeMode).toHaveBeenCalledWith('system')
      expect(mockThemeService.applyTheme).toHaveBeenCalledWith('dark')
    })

    it('should store follow system preference in localStorage', async () => {
      const user = userEvent.setup()

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await user.click(screen.getByTestId('toggle-follow-system'))

      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai-file-organizer-follow-system', 'true')
    })
  })

  describe('loading state', () => {
    it('should start with loading true and set to false after initialization', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      // Should be false after initialization
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
    })
  })

  describe('theme object provision', () => {
    it('should provide light theme object when light theme is active', () => {
      mockThemeService.getEffectiveTheme.mockReturnValue('light')
      mockThemeService.initialize.mockReturnValue('light')

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('theme-name')).toHaveTextContent('light')
    })

    it('should provide dark theme object when dark theme is active', () => {
      mockThemeService.getEffectiveTheme.mockReturnValue('dark')
      mockThemeService.initialize.mockReturnValue('dark')

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      expect(screen.getByTestId('theme-name')).toHaveTextContent('dark')
    })
  })

  describe('error handling', () => {
    it('should handle ThemeService errors gracefully', () => {
      mockThemeService.initialize.mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(() => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        )
      }).not.toThrow()
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      expect(() => {
        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        )
      }).not.toThrow()
    })
  })

  describe('cleanup', () => {
    it('should cleanup system preference listener on unmount', () => {
      const cleanup = vi.fn()
      mockThemeService.onSystemPreferenceChange.mockReturnValue(cleanup)

      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      unmount()

      expect(cleanup).toHaveBeenCalled()
    })
  })

  describe('useTheme hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      expect(() => {
        renderHook(() => useTheme())
      }).toThrow('useTheme must be used within a ThemeProvider')
    })

    it('should provide context value when used within ThemeProvider', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>
      })

      expect(result.current.theme).toBeDefined()
      expect(result.current.currentTheme).toBeDefined()
      expect(result.current.themeMode).toBeDefined()
      expect(result.current.setTheme).toBeInstanceOf(Function)
      expect(result.current.setThemeMode).toBeInstanceOf(Function)
      expect(result.current.toggleTheme).toBeInstanceOf(Function)
      expect(result.current.systemPreference).toBeDefined()
      expect(result.current.followSystem).toBeDefined()
      expect(result.current.setFollowSystem).toBeInstanceOf(Function)
      expect(typeof result.current.isLoading).toBe('boolean')
    })
  })
})