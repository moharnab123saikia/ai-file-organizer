import { render, screen } from '@testing-library/react';
import React from 'react';
import { SafetyLevelIndicator } from '../SafetyLevelIndicator';
import { SafetyLevel } from '../../../types/SafetyLevel';

describe('SafetyLevelIndicator', () => {
  it('should render with the correct text and class for "basic" safety level', () => {
    render(<SafetyLevelIndicator level="basic" />);
    const indicator = screen.getByText('Basic');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('safety-level-indicator--basic');
  });

  it('should render with the correct text and class for "enhanced" safety level', () => {
    render(<SafetyLevelIndicator level="enhanced" />);
    const indicator = screen.getByText('Enhanced');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('safety-level-indicator--enhanced');
  });

  it('should render with the correct text and class for "maximum" safety level', () => {
    render(<SafetyLevelIndicator level="maximum" />);
    const indicator = screen.getByText('Maximum');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('safety-level-indicator--maximum');
  });

  it('should handle an unknown safety level gracefully', () => {
    render(<SafetyLevelIndicator level={'unknown' as SafetyLevel} />);
    const indicator = screen.getByText('Unknown');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('safety-level-indicator--unknown');
  });
});