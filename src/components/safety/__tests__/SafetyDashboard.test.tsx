import { render, screen } from '@testing-library/react';
import React from 'react';
import { SafetyDashboard } from '../SafetyDashboard';
import { FileOperation } from '../../../types/FileOperation';
import { ValidationResult } from '../../../types/ValidationResult';
import { SafetyLevel } from '../../../types/SafetyLevel';

const mockOperation: FileOperation = {
  id: 'op-1',
  type: 'move',
  sourcePath: '/test/source.txt',
  destinationPath: '/test/destination.txt',
  status: 'pending',
  sourceePath: '',
};

const mockValidationResult: ValidationResult = {
  isValid: true,
  warnings: [],
  errors: [],
};

const mockSafetyLevel: SafetyLevel = 'enhanced';

describe('SafetyDashboard', () => {
  it('should render the SafetyLevelIndicator with the correct level', () => {
    render(
      <SafetyDashboard
        operation={mockOperation}
        validationResult={mockValidationResult}
        safetyLevel={mockSafetyLevel}
        onConfirm={() => {}}
        onCancel={() => {}}
        isConfirmationOpen={true}
      />
    );
    const indicator = screen.getByText('Enhanced');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('safety-level-indicator--enhanced');
  });

  it('should render the SafetyConfirmationDialog when isConfirmationOpen is true', () => {
    render(
      <SafetyDashboard
        operation={mockOperation}
        validationResult={mockValidationResult}
        safetyLevel={mockSafetyLevel}
        onConfirm={() => {}}
        onCancel={() => {}}
        isConfirmationOpen={true}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render the SafetyConfirmationDialog when isConfirmationOpen is false', () => {
    render(
      <SafetyDashboard
        operation={mockOperation}
        validationResult={mockValidationResult}
        safetyLevel={mockSafetyLevel}
        onConfirm={() => {}}
        onCancel={() => {}}
        isConfirmationOpen={false}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});