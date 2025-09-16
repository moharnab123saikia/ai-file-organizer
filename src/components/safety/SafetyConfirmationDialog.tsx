import React from 'react';
import { FileOperation } from '../../types/FileOperation';
import { ValidationResult } from '../../types/ValidationResult';

interface SafetyConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  operation: FileOperation;
  validationResult: ValidationResult;
}

export const SafetyConfirmationDialog: React.FC<SafetyConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  operation,
  validationResult,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div role="dialog" aria-labelledby="dialog-title">
      <h2 id="dialog-title">Confirm File Operation</h2>
      <p>
        Are you sure you want to perform the following operation?
      </p>
      <div>
        <strong>Type:</strong> {operation.type}
      </div>
      <div>
        <strong>Source:</strong> {operation.sourcePath}
      </div>
      <div>
        <strong>Destination:</strong> {operation.destinationPath}
      </div>

      {validationResult.errors.length > 0 && (
        <div>
          <h3>Errors:</h3>
          <ul>
            {validationResult.errors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </div>
      )}

      {validationResult.warnings.length > 0 && (
        <div>
          <h3>Warnings:</h3>
          <ul>
            {validationResult.warnings.map((warning, index) => (
              <li key={index}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <button onClick={onCancel}>Cancel</button>
        <button onClick={onConfirm} disabled={!validationResult.isValid}>
          Confirm
        </button>
      </div>
    </div>
  );
};