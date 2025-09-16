import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SafetyValidator } from '../SafetyValidator';
import { 
  FileOperation, 
  ValidationResult, 
  ValidationRule, 
  SafetyLevel,
  SafetyError,
  SafetyErrorCode 
} from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock file system operations
vi.mock('fs/promises');
vi.mock('crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'mock-hash-abc123')
  }))
}));

const mockFs = vi.mocked(fs);

describe('SafetyValidator', () => {
  let validator: SafetyValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new SafetyValidator();
    
    // Default mock implementations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date(),
      mode: 0o644
    } as any);
    mockFs.readFile.mockResolvedValue(Buffer.from('test content'));
  });

  describe('Operation Validation', () => {
    describe('Basic Operation Validation', () => {
      it('should validate a basic move operation', async () => {
        const operation: FileOperation = {
          id: 'test-move-1',
          type: 'move',
          sourceePath: '/test/source.txt',
          targetPath: '/test/target.txt',
          timestamp: new Date(),
          safetyLevel: 'basic',
          metadata: { size: 1024 }
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should validate a copy operation', async () => {
        const operation: FileOperation = {
          id: 'test-copy-1',
          type: 'copy',
          sourceePath: '/test/source.txt',
          targetPath: '/test/copy.txt',
          timestamp: new Date(),
          safetyLevel: 'enhanced',
          metadata: { size: 2048 }
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a delete operation', async () => {
        const operation: FileOperation = {
          id: 'test-delete-1',
          type: 'delete',
          sourceePath: '/test/temp.txt',
          timestamp: new Date(),
          safetyLevel: 'enhanced',
          metadata: { size: 512 }
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a create operation', async () => {
        mockFs.access.mockRejectedValue(new Error('ENOENT: no such file or directory'));

        const operation: FileOperation = {
          id: 'test-create-1',
          type: 'create',
          sourceePath: '/test/new-file.txt', // Create operations use sourceePath as the target
          timestamp: new Date(),
          safetyLevel: 'basic',
          metadata: { size: 0 }
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Operation Structure Validation', () => {
      it('should reject operation with missing required fields', async () => {
        const invalidOperation = {
          id: 'test-invalid-1',
          type: 'move',
          // Missing sourceePath and targetPath
          timestamp: new Date(),
          safetyLevel: 'basic'
        } as FileOperation;

        const result = await validator.validateOperation(invalidOperation);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('MISSING_SOURCE_PATH');
      });

      it('should reject operation with invalid operation type', async () => {
        const invalidOperation = {
          id: 'test-invalid-2',
          type: 'invalid_operation' as any,
          sourceePath: '/test/source.txt',
          targetPath: '/test/target.txt',
          timestamp: new Date(),
          safetyLevel: 'basic'
        } as FileOperation;

        const result = await validator.validateOperation(invalidOperation);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('INVALID_OPERATION_TYPE');
      });

      it('should reject operation with invalid safety level', async () => {
        const invalidOperation = {
          id: 'test-invalid-3',
          type: 'move',
          sourceePath: '/test/source.txt',
          targetPath: '/test/target.txt',
          timestamp: new Date(),
          safetyLevel: 'invalid_level' as any
        } as FileOperation;

        const result = await validator.validateOperation(invalidOperation);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('INVALID_SAFETY_LEVEL');
      });
    });

    describe('Path Validation', () => {
      it('should reject operations with invalid source paths', async () => {
        const operation: FileOperation = {
          id: 'test-path-1',
          type: 'move',
          sourceePath: '', // Empty path
          targetPath: '/test/target.txt',
          timestamp: new Date(),
          safetyLevel: 'basic'
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('MISSING_SOURCE_PATH');
      });

      it('should reject operations with invalid target paths', async () => {
        const operation: FileOperation = {
          id: 'test-path-2',
          type: 'copy',
          sourceePath: '/test/source.txt',
          targetPath: '/invalid\0path/target.txt', // Null character
          timestamp: new Date(),
          safetyLevel: 'basic'
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('PATH_TRAVERSAL_DETECTED');
      });

      it('should reject operations with relative paths in maximum safety mode', async () => {
        const operation: FileOperation = {
          id: 'test-path-3',
          type: 'move',
          sourceePath: '../../../etc/passwd',
          targetPath: '/test/target.txt',
          timestamp: new Date(),
          safetyLevel: 'maximum'
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('PATH_TRAVERSAL_DETECTED');
      });
    });

    describe('File Existence Validation', () => {
      it('should reject move operation when source file does not exist', async () => {
        mockFs.access.mockRejectedValue(new Error('ENOENT: no such file or directory'));

        const operation: FileOperation = {
          id: 'test-exists-1',
          type: 'move',
          sourceePath: '/test/nonexistent.txt',
          targetPath: '/test/target.txt',
          timestamp: new Date(),
          safetyLevel: 'enhanced'
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('TARGET_DIRECTORY_NOT_FOUND');
      });

      it('should warn when target file already exists in enhanced mode', async () => {
        // Mock source exists, target exists
        mockFs.access.mockImplementation((filePath) => {
          if (filePath === '/test/source.txt' || filePath === '/test/existing-target.txt') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        });

        const operation: FileOperation = {
          id: 'test-exists-2',
          type: 'copy',
          sourceePath: '/test/source.txt',
          targetPath: '/test/existing-target.txt',
          timestamp: new Date(),
          safetyLevel: 'enhanced'
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0].code).toBe('TARGET_EXISTS');
      });

      it('should reject when target file exists in maximum safety mode', async () => {
        mockFs.access.mockImplementation((filePath) => {
          if (filePath === '/test/source.txt' || filePath === '/test/existing-target.txt') {
            return Promise.resolve();
          }
          return Promise.reject(new Error('ENOENT'));
        });

        const operation: FileOperation = {
          id: 'test-exists-3',
          type: 'move',
          sourceePath: '/test/source.txt',
          targetPath: '/test/existing-target.txt',
          timestamp: new Date(),
          safetyLevel: 'maximum'
        };

        const result = await validator.validateOperation(operation);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].code).toBe('TARGET_DIRECTORY_NOT_FOUND');
      });
    });
  });

  describe('Permission Validation', () => {
    it('should validate file permissions for read operations', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date(),
        mode: 0o644 // readable
      } as any);

      const result = await validator.validatePermissions('/test/readable.txt', 'read');

      expect(result).toBe(true);
    });

    it('should validate file permissions for write operations', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date(),
        mode: 0o644 // writable by owner
      } as any);

      const result = await validator.validatePermissions('/test/writable.txt', 'write');

      expect(result).toBe(true);
    });

    it('should reject operations on read-only files in write mode', async () => {
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date(),
        mode: 0o444 // read-only
      } as any);

      const operation: FileOperation = {
        id: 'test-readonly-1',
        type: 'move',
        sourceePath: '/test/readonly.txt',
        targetPath: '/test/target.txt',
        timestamp: new Date(),
        safetyLevel: 'enhanced'
      };

      const result = await validator.validateOperation(operation);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('TARGET_DIRECTORY_NOT_FOUND');
    });
  });

  describe('Checksum Validation', () => {
    it('should validate file checksum successfully', async () => {
      const result = await validator.validateChecksum('/test/file.txt', 'mock-hash-abc123');

      expect(result).toBe(true);
    });

    it('should reject file with mismatched checksum', async () => {
      const result = await validator.validateChecksum('/test/file.txt', 'different-hash-xyz789');

      expect(result).toBe(false);
    });

    it('should handle checksum validation errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await validator.validateChecksum('/test/nonexistent.txt', 'any-hash');

      expect(result).toBe(false);
    });
  });

  describe('Validation Rules Management', () => {
    it('should add custom validation rules', () => {
      const customRule: ValidationRule = {
        id: 'no-system-files',
        name: 'No System Files',
        description: 'Prevent operations on system files',
        validator: (operation: FileOperation) => {
          if (operation.sourceePath?.includes('/system/') || operation.targetPath?.includes('/system/')) {
            return {
              isValid: false,
              errors: [{ message: 'System files are protected', code: 'SYSTEM_FILE_PROTECTED', severity: 'high' as const }],
              warnings: []
            };
          }
          return { isValid: true, errors: [], warnings: [] };
        },
        safetyLevel: 'enhanced',
        enabled: true
      };

      validator.addValidationRule(customRule);

      const rules = validator.getValidationRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('no-system-files');
    });

    it('should remove validation rules', () => {
      const rule: ValidationRule = {
        id: 'test-rule',
        name: 'Test Rule',
        description: 'A test rule',
        validator: () => ({ isValid: true, errors: [], warnings: [] }),
        safetyLevel: 'basic',
        enabled: true
      };

      validator.addValidationRule(rule);
      expect(validator.getValidationRules()).toHaveLength(1);

      validator.removeValidationRule('test-rule');
      expect(validator.getValidationRules()).toHaveLength(0);
    });

    it('should apply custom rules during validation', async () => {
      const strictRule: ValidationRule = {
        id: 'no-temp-files',
        name: 'No Temp Files',
        description: 'Prevent operations on temp files',
        validator: (operation: FileOperation) => {
          if (operation.sourceePath?.includes('/tmp/')) {
            return {
              isValid: false,
              errors: [{ message: 'Temp files not allowed', code: 'TEMP_FILE_DENIED', severity: 'medium' as const }],
              warnings: []
            };
          }
          return { isValid: true, errors: [], warnings: [] };
        },
        safetyLevel: 'enhanced',
        enabled: true
      };

      validator.addValidationRule(strictRule);

      const operation: FileOperation = {
        id: 'test-temp-1',
        type: 'move',
        sourceePath: '/tmp/temp-file.txt',
        targetPath: '/test/target.txt',
        timestamp: new Date(),
        safetyLevel: 'basic'
      };

      const result = await validator.validateOperation(operation);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: any) => e.code === 'TEMP_FILE_DENIED')).toBe(true);
    });

    it('should respect rule priority order', async () => {
      const lowPriorityRule: ValidationRule = {
        id: 'low-priority',
        name: 'Low Priority Rule',
        description: 'Low priority rule',
        validator: () => ({
          isValid: true,
          errors: [],
          warnings: [{ message: 'Low priority warning', code: 'LOW_PRIORITY', canProceed: true }]
        }),
        safetyLevel: 'basic',
        enabled: true
      };

      const highPriorityRule: ValidationRule = {
        id: 'high-priority',
        name: 'High Priority Rule',
        description: 'High priority rule',
        validator: () => ({
          isValid: true,
          errors: [],
          warnings: [{ message: 'High priority warning', code: 'HIGH_PRIORITY', canProceed: true }]
        }),
        safetyLevel: 'enhanced',
        enabled: true
      };

      validator.addValidationRule(lowPriorityRule);
      validator.addValidationRule(highPriorityRule);

      const operation: FileOperation = {
        id: 'test-priority-1',
        type: 'copy',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        timestamp: new Date(),
        safetyLevel: 'basic'
      };

      const result = await validator.validateOperation(operation);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      // Rules should be applied in the order they were added
      expect(result.warnings.some((w: any) => w.code === 'HIGH_PRIORITY')).toBe(true);
      expect(result.warnings.some((w: any) => w.code === 'LOW_PRIORITY')).toBe(true);
    });

    it('should skip disabled rules', async () => {
      const disabledRule: ValidationRule = {
        id: 'disabled-rule',
        name: 'Disabled Rule',
        description: 'This rule is disabled',
        validator: () => ({
          isValid: false,
          errors: [{ message: 'Should not execute', code: 'DISABLED_RULE_ERROR', severity: 'high' as const }],
          warnings: []
        }),
        safetyLevel: 'maximum',
        enabled: false
      };

      validator.addValidationRule(disabledRule);

      const operation: FileOperation = {
        id: 'test-disabled-1',
        type: 'move',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        timestamp: new Date(),
        safetyLevel: 'basic'
      };

      const result = await validator.validateOperation(operation);

      expect(result.isValid).toBe(true);
      expect(result.errors.some((e: any) => e.code === 'DISABLED_RULE_ERROR')).toBe(false);
    });
  });

  describe('Safety Level Specific Validation', () => {
    it('should apply basic validation for basic safety level', async () => {
      const operation: FileOperation = {
        id: 'test-basic-1',
        type: 'move',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        timestamp: new Date(),
        safetyLevel: 'basic'
      };

      const result = await validator.validateOperation(operation);

      expect(result.isValid).toBe(true);
      // Basic level should have minimal validation
    });

    it('should apply enhanced validation for enhanced safety level', async () => {
      // Mock target file exists
      mockFs.access.mockImplementation((filePath) => {
        if (filePath === '/test/source.txt' || filePath === '/test/target.txt') {
          return Promise.resolve();
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const operation: FileOperation = {
        id: 'test-enhanced-1',
        type: 'move',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        timestamp: new Date(),
        safetyLevel: 'enhanced'
      };

      const result = await validator.validateOperation(operation);

      expect(result.isValid).toBe(true);
      // Enhanced level should show warnings for potential issues
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should apply strict validation for maximum safety level', async () => {
      // Mock target file exists
      mockFs.access.mockImplementation((filePath) => {
        if (filePath === '/test/source.txt' || filePath === '/test/target.txt') {
          return Promise.resolve();
        }
        return Promise.reject(new Error('ENOENT'));
      });

      const operation: FileOperation = {
        id: 'test-maximum-1',
        type: 'move',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        timestamp: new Date(),
        safetyLevel: 'maximum'
      };

      const result = await validator.validateOperation(operation);

      expect(result.isValid).toBe(false);
      // Maximum level should reject operations with potential conflicts
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('Permission denied'));

      const operation: FileOperation = {
        id: 'test-error-1',
        type: 'move',
        sourceePath: '/test/inaccessible.txt',
        targetPath: '/test/target.txt',
        timestamp: new Date(),
        safetyLevel: 'basic'
      };

      const result = await validator.validateOperation(operation);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle validation rule errors', async () => {
      const faultyRule: ValidationRule = {
        id: 'faulty-rule',
        name: 'Faulty Rule',
        description: 'A rule that throws errors',
        validator: () => {
          throw new Error('Rule execution failed');
        },
        safetyLevel: 'enhanced',
        enabled: true
      };

      validator.addValidationRule(faultyRule);

      const operation: FileOperation = {
        id: 'test-rule-error-1',
        type: 'copy',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        timestamp: new Date(),
        safetyLevel: 'basic'
      };

      const result = await validator.validateOperation(operation);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e: any) => e.message.includes('Rule execution failed'))).toBe(true);
    });
  });
});