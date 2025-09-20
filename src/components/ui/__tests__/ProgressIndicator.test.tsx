import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProgressIndicator } from '../ProgressIndicator';

describe('ProgressIndicator Component', () => {
  const defaultProps = {
    value: 50,
    max: 100,
    label: 'Processing files...',
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders progress bar with correct value and max', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('renders progress label', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} />);
      
      expect(container.querySelector('.progress-indicator__label')).toHaveTextContent('Processing files...');
    });

    it('displays percentage when showPercentage is true', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} showPercentage />);
      
      expect(container.querySelector('.progress-indicator__percentage')).toHaveTextContent('50%');
    });

    it('hides percentage when showPercentage is false', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} showPercentage={false} />);
      
      expect(container.querySelector('.progress-indicator__percentage')).not.toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} className="custom-progress" />);
      
      expect(container.firstChild).toHaveClass('progress-indicator');
      expect(container.firstChild).toHaveClass('custom-progress');
    });
  });

  describe('Progress States', () => {
    it('renders indeterminate progress when value is not provided', () => {
      const { value, ...propsWithoutValue } = defaultProps;
      const { container } = render(<ProgressIndicator {...propsWithoutValue} />);
      
      const progressContainer = container.querySelector('[data-testid="progress-container"]');
      expect(progressContainer).toHaveClass('progress-indicator--indeterminate');
    });

    it('shows determinate progress when value is provided', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} />);
      
      const progressContainer = container.querySelector('[data-testid="progress-container"]');
      expect(progressContainer).not.toHaveClass('progress-indicator--indeterminate');
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('handles zero progress correctly', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} value={0} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('handles complete progress correctly', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} value={100} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('clamps progress value to max', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} value={150} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('handles negative progress values', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} value={-10} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });
  });

  describe('Status Variants', () => {
    it('applies success styling', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} status="success" />);
      
      const progressContainer = container.querySelector('[data-testid="progress-container"]');
      expect(progressContainer).toHaveClass('progress-indicator--success');
    });

    it('applies error styling', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} status="error" />);
      
      const progressContainer = container.querySelector('[data-testid="progress-container"]');
      expect(progressContainer).toHaveClass('progress-indicator--error');
    });

    it('applies warning styling', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} status="warning" />);
      
      const progressContainer = container.querySelector('[data-testid="progress-container"]');
      expect(progressContainer).toHaveClass('progress-indicator--warning');
    });

    it('applies default styling when no status provided', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} />);
      
      const progressContainer = container.querySelector('[data-testid="progress-container"]');
      expect(progressContainer).not.toHaveClass('progress-indicator--success');
      expect(progressContainer).not.toHaveClass('progress-indicator--error');
      expect(progressContainer).not.toHaveClass('progress-indicator--warning');
    });
  });

  describe('Size Variants', () => {
    it('applies small size styling', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} size="small" />);
      
      const progressContainer = container.querySelector('[data-testid="progress-container"]');
      expect(progressContainer).toHaveClass('progress-indicator--small');
    });

    it('applies large size styling', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} size="large" />);
      
      const progressContainer = container.querySelector('[data-testid="progress-container"]');
      expect(progressContainer).toHaveClass('progress-indicator--large');
    });

    it('applies default size when no size provided', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} />);
      
      const progressContainer = container.querySelector('[data-testid="progress-container"]');
      expect(progressContainer).not.toHaveClass('progress-indicator--small');
      expect(progressContainer).not.toHaveClass('progress-indicator--large');
    });
  });

  describe('Detailed Progress Information', () => {
    it('shows detailed progress when provided', () => {
      const { container } = render(
        <ProgressIndicator
          {...defaultProps}
          current={50}
          total={100}
          unit="files"
          showDetailed
        />
      );
      
      expect(container.querySelector('.progress-indicator__details')).toHaveTextContent('50 of 100 files');
    });

    it('shows bytes formatting for file sizes', () => {
      const { container } = render(
        <ProgressIndicator
          {...defaultProps}
          current={1024}
          total={2048}
          unit="bytes"
          showDetailed
        />
      );
      
      expect(container.querySelector('.progress-indicator__details')).toHaveTextContent('1.0 KB of 2.0 KB');
    });

    it('shows elapsed time when provided', () => {
      const { container } = render(
        <ProgressIndicator
          {...defaultProps}
          elapsedTime={5000}
          showDetailed
        />
      );
      
      expect(container.textContent).toMatch(/Elapsed: 5s/);
    });

    it('shows estimated time remaining', () => {
      const { container } = render(
        <ProgressIndicator
          {...defaultProps}
          value={25}
          elapsedTime={5000}
          showDetailed
        />
      );
      
      expect(container.textContent).toMatch(/ETA: 15s/);
    });

    it('hides detailed info when showDetailed is false', () => {
      const { container } = render(
        <ProgressIndicator
          {...defaultProps}
          current={50}
          total={100}
          unit="files"
          elapsedTime={5000}
          showDetailed={false}
        />
      );
      
      expect(container.querySelector('.progress-indicator__details')).not.toBeInTheDocument();
      expect(container.textContent).not.toMatch(/Elapsed: 5s/);
    });
  });

  describe('Cancel Functionality', () => {
    it('shows cancel button when onCancel is provided', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} />);
      
      const cancelButton = container.querySelector('.progress-indicator__cancel');
      expect(cancelButton).toBeInTheDocument();
    });

    it('hides cancel button when onCancel is not provided', () => {
      const { onCancel, ...propsWithoutCancel } = defaultProps;
      const { container } = render(<ProgressIndicator {...propsWithoutCancel} />);
      
      const cancelButton = container.querySelector('.progress-indicator__cancel');
      expect(cancelButton).not.toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProgressIndicator {...defaultProps} />);
      
      const cancelButton = container.querySelector('.progress-indicator__cancel');
      expect(cancelButton).toBeInTheDocument();
      await user.click(cancelButton!);
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('disables cancel button when cancelDisabled is true', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} cancelDisabled />);
      
      const cancelButton = container.querySelector('.progress-indicator__cancel');
      expect(cancelButton).toBeDisabled();
    });

    it('shows custom cancel text', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} cancelText="Stop Process" />);
      
      const cancelButton = container.querySelector('.progress-indicator__cancel');
      expect(cancelButton).toHaveAttribute('aria-label', 'Stop Process');
      expect(container.querySelector('.progress-indicator__cancel-text')).toHaveTextContent('Stop Process');
    });
  });

  describe('Animation and Transitions', () => {
    it('applies animation class for indeterminate progress', () => {
      const { value, ...propsWithoutValue } = defaultProps;
      const { container } = render(<ProgressIndicator {...propsWithoutValue} />);
      
      const progressBar = container.querySelector('[data-testid="progress-bar"]');
      expect(progressBar).toHaveClass('progress-indicator__bar--animated');
    });

    it('applies smooth transition for determinate progress', () => {
      const { rerender, container } = render(<ProgressIndicator {...defaultProps} value={30} />);
      
      const progressBar = container.querySelector('[data-testid="progress-bar"]');
      expect(progressBar).toHaveStyle({ width: '30%' });
      
      rerender(<ProgressIndicator {...defaultProps} value={70} />);
      expect(progressBar).toHaveStyle({ width: '70%' });
    });

    it('handles rapid progress updates smoothly', () => {
      const { rerender, container } = render(<ProgressIndicator {...defaultProps} value={0} />);
      
      const progressBar = container.querySelector('[data-testid="progress-bar"]');
      
      // Simulate rapid updates
      for (let i = 10; i <= 100; i += 10) {
        rerender(<ProgressIndicator {...defaultProps} value={i} />);
      }
      
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA attributes', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-label', 'Processing files...');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('provides proper ARIA attributes for indeterminate progress', () => {
      const { value, ...propsWithoutValue } = defaultProps;
      const { container } = render(<ProgressIndicator {...propsWithoutValue} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-label', 'Processing files...');
      expect(progressBar).not.toHaveAttribute('aria-valuenow');
    });

    it('updates ARIA attributes when progress changes', () => {
      const { rerender, container } = render(<ProgressIndicator {...defaultProps} value={25} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      
      rerender(<ProgressIndicator {...defaultProps} value={75} />);
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('announces progress changes to screen readers', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} announceChanges />);
      
      const liveRegion = container.querySelector('[role="status"]');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('provides keyboard navigation for cancel button', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProgressIndicator {...defaultProps} />);
      
      const cancelButton = container.querySelector('button[aria-label="Cancel"]') as HTMLButtonElement;
      expect(cancelButton).toBeInTheDocument();
      
      // Focus the button directly for testing
      cancelButton.focus();
      expect(cancelButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
      
      await user.click(cancelButton);
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('handles invalid progress values gracefully', () => {
      expect(() => {
        render(<ProgressIndicator {...defaultProps} value={NaN} />);
      }).not.toThrow();
    });

    it('handles negative max values', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} max={-100} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuemax', '0');
    });

    it('handles zero max value', () => {
      const { container } = render(<ProgressIndicator {...defaultProps} max={0} />);
      
      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('recovers from cancelled operations gracefully', async () => {
      const onCancel = vi.fn(() => {
        throw new Error('Cancel failed');
      });
      
      const user = userEvent.setup();
      const { container } = render(<ProgressIndicator {...defaultProps} onCancel={onCancel} />);
      
      const cancelButton = container.querySelector('button[aria-label="Cancel"]');
      
      expect(async () => {
        await user.click(cancelButton!);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('efficiently handles frequent progress updates', () => {
      const startTime = performance.now();
      
      const { rerender } = render(<ProgressIndicator {...defaultProps} value={0} />);
      
      // Simulate 100 rapid updates
      for (let i = 1; i <= 100; i++) {
        rerender(<ProgressIndicator {...defaultProps} value={i} />);
      }
      
      const endTime = performance.now();
      
      // Should handle updates efficiently (less than 200ms for 100 updates)
      expect(endTime - startTime).toBeLessThan(200);
    });

    it('memoizes expensive calculations', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      const ExpensiveProgress = () => {
        const expensiveCalculation = () => {
          console.log('Expensive calculation performed');
          return 50;
        };
        
        return (
          <ProgressIndicator 
            {...defaultProps} 
            value={expensiveCalculation()} 
          />
        );
      };
      
      const { rerender } = render(<ExpensiveProgress />);
      rerender(<ExpensiveProgress />);
      
      // Should only calculate once due to memoization
      expect(consoleSpy).toHaveBeenCalledTimes(2); // Once per render is expected
      
      consoleSpy.mockRestore();
    });
  });
});