import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SafetyConfirmationDialog } from '../SafetyConfirmationDialog';
import { FileOperation } from '../../../types/FileOperation';
import { ValidationResult } from '../../../types/ValidationResult';

const mockOperation: FileOperation = {
  type: 'move',
  sourcePath: '/test/source.txt',
  destinationPath: '/test/destination.txt',
  id: 'op-1',
  status: 'pending'
};

describe('SafetyConfirmationDialog', () => {
  it('should not render when isOpen is false', () => {
    const validationResult: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
    };
    render(
      <SafetyConfirmationDialog
        isOpen={false}
        onConfirm={() => {}}
        onCancel={() => {}}
        operation={mockOperation}
        validationResult={validationResult}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    const validationResult: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
    };
    render(
      <SafetyConfirmationDialog
        isOpen={true}
        onConfirm={() => {}}
        onCancel={() => {}}
        operation={mockOperation}
        validationResult={validationResult}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm File Operation')).toBeInTheDocument();
  });

  it('should display errors from validationResult', () => {
    const validationResult: ValidationResult = {
      isValid: false,
      warnings: [],
      errors: [{ code: 'FILE_NOT_FOUND', message: 'Source file not found.' }],
    };
    render(
      <SafetyConfirmationDialog
        isOpen={true}
        onConfirm={() => {}}
        onCancel={() => {}}
        operation={mockOperation}
        validationResult={validationResult}
      />
    );
    expect(screen.getByText('Errors:')).toBeInTheDocument();
    expect(screen.getByText('Source file not found.')).toBeInTheDocument();
  });

  it('should display warnings from validationResult', () => {
    const validationResult: ValidationResult = {
      isValid: true,
      warnings: [{ code: 'FILE_OVERWRITE', message: 'Destination file will be overwritten.' }],
      errors: [],
    };
    render(
      <SafetyConfirmationDialog
        isOpen={true}
        onConfirm={() => {}}
        onCancel={() => {}}
        operation={mockOperation}
        validationResult={validationResult}
      />
    );
    expect(screen.getByText('Warnings:')).toBeInTheDocument();
    expect(screen.getByText('Destination file will be overwritten.')).toBeInTheDocument();
  });

  it('should call onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    const validationResult: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
    };
    render(
      <SafetyConfirmationDialog
        isOpen={true}
        onConfirm={onConfirm}
        onCancel={() => {}}
        operation={mockOperation}
        validationResult={validationResult}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    const validationResult: ValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
    };
    render(
      <SafetyConfirmationDialog
        isOpen={true}
        onConfirm={() => {}}
        onCancel={onCancel}
        operation={mockOperation}
        validationResult={validationResult}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('should disable confirm button when validationResult is invalid', () => {
    const validationResult: ValidationResult = {
      isValid: false,
      warnings: [],
      errors: [{ code: 'FILE_NOT_FOUND', message: 'Source file not found.' }],
    };
    render(
      <SafetyConfirmationDialog
        isOpen={true}
        onConfirm={() => {}}
        onCancel={() => {}}
        operation={mockOperation}
        validationResult={validationResult}
      />
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });
});