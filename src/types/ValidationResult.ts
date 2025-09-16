export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity?: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}