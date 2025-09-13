import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeToggle } from '../ThemeToggle'
import { ThemeProvider } from '../ThemeProvider'
import { ThemeService } from '../ThemeService'

// Mock ThemeService
vi.mock('../ThemeService', () => ({
  ThemeService: {
    initialize: vi.fn(() => 'light'),
    switchTheme: vi.fn(),
    toggleTheme: vi.fn(() => 'dark'),
    applyTheme: vi.fn(),
    getSystemPreference: vi.fn(() => 'light'),
    onSystemPreferenceChange: vi.fn(() => vi.fn()),
    storeTheme: vi.fn(),
    storeThemeMode: vi.fn(),
    getStoredTheme: vi.fn(),
    getStoredThemeMode: vi.fn(),
    validateThemeName: vi.fn(() => true),
    generateCSSCustomProperties: vi.fn(() => ({}))
  }
}))

const mockThemeService = ThemeService as any

// Test wrapper with ThemeProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider defaultTheme="light" defaultMode="light">
    {children}
  </ThemeProvider>
)

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockThemeService.initialize.mockReturnValue('light')
    mockThemeService.getSystemPreference.mockReturnValue('light')
    mockThemeService.onSystemPreferenceChange.mockReturnValue(vi.fn())
  })

  describe('basic rendering', () => {
    it('should render toggle button', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      )

      expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
    })

    it('should render with custom class', () => {
      render(
        <TestWrapper>
          <ThemeToggle className="custom-class" />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveClass('custom-class')
    })

    it('should render with custom aria-label', () => {
      render(
        <TestWrapper>
          <ThemeToggle ariaLabel="Switch color scheme" />
        </TestWrapper>
      )

      expect(screen.getByRole('button', { name: 'Switch color scheme' })).toBeInTheDocument()
    })
  })

  describe('theme switching', () => {
    it('should call toggleTheme when clicked', async () => {
      const mockToggleTheme = vi.fn()
      mockThemeService.toggleTheme.mockImplementation(mockToggleTheme)

      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockToggleTheme).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle keyboard navigation', async () => {
      const mockToggleTheme = vi.fn()
      mockThemeService.toggleTheme.mockImplementation(mockToggleTheme)

      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      
      // Test Enter key
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
      await waitFor(() => {
        expect(mockToggleTheme).toHaveBeenCalledTimes(1)
      })

      // Test Space key
      fireEvent.keyDown(button, { key: ' ', code: 'Space' })
      await waitFor(() => {
        expect(mockToggleTheme).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('theme state display', () => {
    it('should show correct icon for light theme', () => {
      render(
        <TestWrapper>
          <ThemeToggle showIcon />
        </TestWrapper>
      )

      // Should show moon icon for light theme (to switch to dark)
      expect(screen.getByRole('button')).toHaveTextContent('🌙')
    })

    it('should show correct icon for dark theme', () => {
      mockThemeService.initialize.mockReturnValue('dark')
      
      render(
        <TestWrapper>
          <ThemeToggle showIcon />
        </TestWrapper>
      )

      // Should show sun icon for dark theme (to switch to light)
      expect(screen.getByRole('button')).toHaveTextContent('☀️')
    })

    it('should show text labels when enabled', () => {
      render(
        <TestWrapper>
          <ThemeToggle showText />
        </TestWrapper>
      )

      expect(screen.getByRole('button')).toHaveTextContent(/light/i)
    })

    it('should show both icon and text when both enabled', () => {
      render(
        <TestWrapper>
          <ThemeToggle showIcon showText />
        </TestWrapper>
      )

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('🌙')
      expect(button).toHaveTextContent(/light/i)
    })
  })

  describe('size variants', () => {
    it('should apply small size class', () => {
      render(
        <TestWrapper>
          <ThemeToggle size="small" />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveClass('theme-toggle--small')
    })

    it('should apply medium size class', () => {
      render(
        <TestWrapper>
          <ThemeToggle size="medium" />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveClass('theme-toggle--medium')
    })

    it('should apply large size class', () => {
      render(
        <TestWrapper>
          <ThemeToggle size="large" />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveClass('theme-toggle--large')
    })
  })

  describe('variant styles', () => {
    it('should apply button variant class', () => {
      render(
        <TestWrapper>
          <ThemeToggle variant="button" />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveClass('theme-toggle--button')
    })

    it('should apply icon variant class', () => {
      render(
        <TestWrapper>
          <ThemeToggle variant="icon" />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveClass('theme-toggle--icon')
    })

    it('should apply switch variant class', () => {
      render(
        <TestWrapper>
          <ThemeToggle variant="switch" />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveClass('theme-toggle--switch')
    })
  })

  describe('disabled state', () => {
    it('should disable button when disabled prop is true', () => {
      render(
        <TestWrapper>
          <ThemeToggle disabled />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toBeDisabled()
    })

    it('should not call toggleTheme when disabled and clicked', () => {
      const mockToggleTheme = vi.fn()
      mockThemeService.toggleTheme.mockImplementation(mockToggleTheme)

      render(
        <TestWrapper>
          <ThemeToggle disabled />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      fireEvent.click(button)

      expect(mockToggleTheme).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveAttribute('aria-label')
    })

    it('should indicate current theme state', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('light'))
    })

    it('should be focusable', () => {
      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      button.focus()
      expect(button).toHaveFocus()
    })

    it('should support custom tabIndex', () => {
      render(
        <TestWrapper>
          <ThemeToggle tabIndex={-1} />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('error handling', () => {
    it('should handle theme toggle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockThemeService.toggleTheme.mockImplementation(() => {
        throw new Error('Toggle failed')
      })

      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle theme:', expect.any(Error))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('custom content', () => {
    it('should render custom children when provided', () => {
      render(
        <TestWrapper>
          <ThemeToggle>
            <span>Custom Toggle</span>
          </ThemeToggle>
        </TestWrapper>
      )

      expect(screen.getByText('Custom Toggle')).toBeInTheDocument()
    })

    it('should prioritize children over showIcon and showText', () => {
      render(
        <TestWrapper>
          <ThemeToggle showIcon showText>
            <span>Custom</span>
          </ThemeToggle>
        </TestWrapper>
      )

      expect(screen.getByText('Custom')).toBeInTheDocument()
      expect(screen.queryByText('🌙')).not.toBeInTheDocument()
    })
  })

  describe('animation preferences', () => {
    it('should respect reduced motion preferences', () => {
      // Mock matchMedia for prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(
        <TestWrapper>
          <ThemeToggle />
        </TestWrapper>
      )

      const button = screen.getByRole('button', { name: /toggle theme/i })
      expect(button).toHaveClass('theme-toggle--reduced-motion')
    })
  })
})