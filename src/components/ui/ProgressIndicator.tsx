import React, { useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import './ProgressIndicator.css';

export interface ProgressIndicatorProps {
  /** Current progress value (0 to max) */
  value?: number;
  /** Maximum progress value */
  max?: number;
  /** Progress label/description */
  label: string;
  /** Whether to show percentage */
  showPercentage?: boolean;
  /** Status variant for styling */
  status?: 'success' | 'error' | 'warning';
  /** Size variant */
  size?: 'small' | 'large';
  /** Current count for detailed progress */
  current?: number;
  /** Total count for detailed progress */
  total?: number;
  /** Unit for detailed progress (e.g., 'files', 'bytes') */
  unit?: string;
  /** Elapsed time in milliseconds */
  elapsedTime?: number;
  /** Whether to show detailed progress information */
  showDetailed?: boolean;
  /** Cancel callback */
  onCancel?: () => void;
  /** Whether cancel button is disabled */
  cancelDisabled?: boolean;
  /** Custom cancel button text */
  cancelText?: string;
  /** Whether to announce changes to screen readers */
  announceChanges?: boolean;
  /** Additional CSS class */
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  status,
  size,
  current,
  total,
  unit,
  elapsedTime,
  showDetailed = false,
  onCancel,
  cancelDisabled = false,
  cancelText = 'Cancel',
  announceChanges = false,
  className = ''
}) => {
  // Normalize values
  const normalizedMax = max < 0 ? 0 : (max === 0 ? 100 : max);
  const isIndeterminate = value === undefined;
  
  const normalizedValue = useMemo(() => {
    if (isIndeterminate) return undefined;
    if (isNaN(value!)) return 0;
    return Math.max(0, Math.min(value!, normalizedMax));
  }, [value, normalizedMax, isIndeterminate]);

  // Calculate percentage
  const percentage = useMemo(() => {
    if (normalizedValue === undefined) return undefined;
    return Math.round((normalizedValue / normalizedMax) * 100);
  }, [normalizedValue, normalizedMax]);

  // Format file size
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const base = 1024;
    const digitIndex = Math.floor(Math.log(bytes) / Math.log(base));
    const unitIndex = Math.min(digitIndex, units.length - 1);
    
    return `${(bytes / Math.pow(base, unitIndex)).toFixed(1)} ${units[unitIndex]}`;
  }, []);

  // Format time
  const formatTime = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }, []);

  // Calculate ETA
  const estimatedTimeRemaining = useMemo(() => {
    if (!elapsedTime || !percentage || percentage === 0) return undefined;
    
    const remainingPercentage = 100 - percentage;
    const timePerPercent = elapsedTime / percentage;
    return Math.round(timePerPercent * remainingPercentage);
  }, [elapsedTime, percentage]);

  // Detailed progress text
  const detailedProgressText = useMemo(() => {
    if (!showDetailed) return null;
    
    const parts: string[] = [];
    
    if (current !== undefined && total !== undefined && unit) {
      if (unit === 'bytes') {
        parts.push(`${formatBytes(current)} of ${formatBytes(total)}`);
      } else {
        parts.push(`${current} of ${total} ${unit}`);
      }
    }
    
    if (elapsedTime !== undefined) {
      parts.push(`Elapsed: ${formatTime(elapsedTime)}`);
    }
    
    if (estimatedTimeRemaining !== undefined) {
      parts.push(`ETA: ${formatTime(estimatedTimeRemaining)}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
  }, [showDetailed, current, total, unit, elapsedTime, estimatedTimeRemaining, formatBytes, formatTime]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    try {
      onCancel?.();
    } catch (error) {
      console.warn('Error during cancel operation:', error);
    }
  }, [onCancel]);

  // CSS classes
  const containerClasses = [
    'progress-indicator',
    status && `progress-indicator--${status}`,
    size && `progress-indicator--${size}`,
    isIndeterminate && 'progress-indicator--indeterminate',
    className
  ].filter(Boolean).join(' ');

  const barClasses = [
    'progress-indicator__bar',
    isIndeterminate && 'progress-indicator__bar--animated'
  ].filter(Boolean).join(' ');

  // Progress bar style
  const progressBarStyle = useMemo(() => {
    if (isIndeterminate) return {};
    return { width: `${percentage}%` };
  }, [isIndeterminate, percentage]);

  return (
    <div className={containerClasses} data-testid="progress-container">
      <div className="progress-indicator__header">
        <div className="progress-indicator__label-container">
          <span className="progress-indicator__label">{label}</span>
          {showPercentage && percentage !== undefined && (
            <span className="progress-indicator__percentage">{percentage}%</span>
          )}
        </div>
        
        {onCancel && (
          <button
            type="button"
            className="progress-indicator__cancel"
            onClick={handleCancel}
            disabled={cancelDisabled}
            aria-label={cancelText}
          >
            <X size={16} />
            <span className="progress-indicator__cancel-text">{cancelText}</span>
          </button>
        )}
      </div>

      <div className="progress-indicator__track">
        <div
          className={barClasses}
          style={progressBarStyle}
          data-testid="progress-bar"
          role="progressbar"
          aria-label={label}
          aria-valuenow={normalizedValue}
          aria-valuemin={0}
          aria-valuemax={normalizedMax}
        />
      </div>

      {detailedProgressText && (
        <div className="progress-indicator__details">
          {detailedProgressText}
        </div>
      )}

      {announceChanges && (
        <div 
          role="status" 
          aria-live="polite" 
          className="progress-indicator__sr-only"
        >
          {percentage !== undefined && `Progress: ${percentage}%`}
        </div>
      )}
    </div>
  );
};

ProgressIndicator.displayName = 'ProgressIndicator';