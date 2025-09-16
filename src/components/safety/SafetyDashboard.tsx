import React from 'react';
import { FileOperation } from '../../types/FileOperation';
import { ValidationResult } from '../../types/ValidationResult';
import { SafetyLevel } from '../../types/SafetyLevel';
import { SafetyLevelIndicator } from './SafetyLevelIndicator';
import { SafetyConfirmationDialog } from './SafetyConfirmationDialog';

interface SafetyDashboardProps {
  operation: FileOperation;
  validationResult: ValidationResult;
  safetyLevel: SafetyLevel;
  isConfirmationOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SafetyDashboard: React.FC<SafetyDashboardProps> = ({
  operation,
  validationResult,
  safetyLevel,
  isConfirmationOpen,
  onConfirm,
  onCancel,
}) => {
  return (
    <div>
      <SafetyLevelIndicator level={safetyLevel} />
      <SafetyConfirmationDialog
        isOpen={isConfirmationOpen}
        onConfirm={onConfirm}
        onCancel={onCancel}
        operation={operation}
        validationResult={validationResult}
      />
    </div>
  );
};