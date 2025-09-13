import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TransactionManager } from '../TransactionManager'
import type {
  Transaction,
  FileOperation,
  TransactionConfig,
  SafetyLevel,
  OperationType,
  TransactionStatus,
  SafetyError
} from '../types'

// Mock dependencies
const mockOperationJournal = {
  logOperation: vi.fn(),
  getOperations: vi.fn(),
  createRollbackScript: vi.fn(),
  executeRollback: vi.fn(),
  cleanupOldRecords: vi.fn()
}

const mockFileSystemMonitor = {
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  detectConflicts: vi.fn(),
  onConflictDetected: vi.fn(),
  getFileState: vi.fn(),
  captureState: vi.fn()
}

const mockSafetyValidator = {
  validateOperation: vi.fn(),
  addValidationRule: vi.fn(),
  removeValidationRule: vi.fn(),
  getValidationRules: vi.fn(),
  validateChecksum: vi.fn(),
  validatePermissions: vi.fn()
}

const mockBackupManager = {
  createBackup: vi.fn(),
  restoreBackup: vi.fn(),
  deleteBackup: vi.fn(),
  validateBackup: vi.fn()
}

describe('TransactionManager', () => {
  let transactionManager: TransactionManager
  
  beforeEach(() => {
    vi.clearAllMocks()
    transactionManager = new TransactionManager({
      journal: mockOperationJournal,
      monitor: mockFileSystemMonitor,
      validator: mockSafetyValidator,
      backupManager: mockBackupManager
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('transaction lifecycle', () => {
    it('should create a new transaction with default config', async () => {
      const transaction = await transactionManager.beginTransaction()

      expect(transaction).toMatchObject({
        id: expect.any(String),
        status: 'pending',
        operations: [],
        createdAt: expect.any(Date),
        safetyLevel: 'enhanced',
        rollbackStrategy: 'hybrid',
        conflictResolution: 'user_choice'
      })
    })

    it('should create a new transaction with custom config', async () => {
      const config: Partial<TransactionConfig> = {
        isolationLevel: 'serializable',
        timeoutMs: 60000,
        enableConflictDetection: false
      }

      const transaction = await transactionManager.beginTransaction(config)

      expect(transaction).toMatchObject({
        status: 'pending',
        operations: []
      })
      expect(transaction.metadata?.config).toMatchObject(config)
    })

    it('should generate unique transaction IDs', async () => {
      const transaction1 = await transactionManager.beginTransaction()
      const transaction2 = await transactionManager.beginTransaction()

      expect(transaction1.id).not.toBe(transaction2.id)
    })

    it('should track active transactions', async () => {
      const transaction = await transactionManager.beginTransaction()
      
      expect(transactionManager.isTransactionActive(transaction.id)).toBe(true)
      
      const activeTransactions = transactionManager.getActiveTransactions()
      expect(activeTransactions).toHaveLength(1)
      expect(activeTransactions[0].id).toBe(transaction.id)
    })
  })

  describe('operation management', () => {
    let transaction: Transaction

    beforeEach(async () => {
      transaction = await transactionManager.beginTransaction()
    })

    it('should add operation to transaction', async () => {
      const operation: FileOperation = {
        id: 'op-1',
        type: 'create',
        sourceePath: '/test/file.txt',
        safetyLevel: 'basic',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      await transactionManager.addOperation(transaction, operation)

      expect(transaction.operations).toHaveLength(1)
      expect(transaction.operations[0]).toEqual(operation)
      expect(mockSafetyValidator.validateOperation).toHaveBeenCalledWith(operation)
    })

    it('should reject invalid operations', async () => {
      const operation: FileOperation = {
        id: 'op-1',
        type: 'delete',
        sourceePath: '/invalid/path',
        safetyLevel: 'maximum',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'INVALID_PATH', message: 'Path does not exist', severity: 'high' }],
        warnings: []
      })

      await expect(transactionManager.addOperation(transaction, operation))
        .rejects.toThrow('Operation validation failed')

      expect(transaction.operations).toHaveLength(0)
    })

    it('should detect conflicts when adding operations', async () => {
      const operation: FileOperation = {
        id: 'op-1',
        type: 'move',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        safetyLevel: 'enhanced',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      mockFileSystemMonitor.detectConflicts.mockResolvedValue([
        {
          id: 'conflict-1',
          type: 'file_exists',
          operation,
          conflictingPath: '/test/target.txt',
          detectedAt: new Date()
        }
      ])

      await expect(transactionManager.addOperation(transaction, operation))
        .rejects.toThrow('Conflicts detected')

      expect(mockFileSystemMonitor.detectConflicts).toHaveBeenCalledWith(operation)
    })

    it('should enforce transaction operation limits', async () => {
      const config: Partial<TransactionConfig> = { batchSize: 2 }
      transaction = await transactionManager.beginTransaction(config)

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      // Add operations up to the limit
      for (let i = 0; i < 2; i++) {
        const operation: FileOperation = {
          id: `op-${i}`,
          type: 'create',
          sourceePath: `/test/file${i}.txt`,
          safetyLevel: 'basic',
          timestamp: new Date()
        }
        await transactionManager.addOperation(transaction, operation)
      }

      // Adding one more should fail
      const extraOperation: FileOperation = {
        id: 'op-extra',
        type: 'create',
        sourceePath: '/test/extra.txt',
        safetyLevel: 'basic',
        timestamp: new Date()
      }

      await expect(transactionManager.addOperation(transaction, extraOperation))
        .rejects.toThrow('Transaction operation limit exceeded')
    })
  })

  describe('transaction commit', () => {
    let transaction: Transaction

    beforeEach(async () => {
      transaction = await transactionManager.beginTransaction()
    })

    it('should commit empty transaction', async () => {
      await transactionManager.commitTransaction(transaction)

      expect(transaction.status).toBe('committed')
      expect(transaction.completedAt).toBeInstanceOf(Date)
      expect(transactionManager.isTransactionActive(transaction.id)).toBe(false)
    })

    it('should commit transaction with operations', async () => {
      const operation: FileOperation = {
        id: 'op-1',
        type: 'create',
        sourceePath: '/test/file.txt',
        safetyLevel: 'basic',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      await transactionManager.addOperation(transaction, operation)
      await transactionManager.commitTransaction(transaction)

      expect(transaction.status).toBe('committed')
      expect(mockOperationJournal.logOperation).toHaveBeenCalled()
    })

    it('should create backup before committing critical operations', async () => {
      const operation: FileOperation = {
        id: 'op-1',
        type: 'delete',
        sourceePath: '/test/important.txt',
        safetyLevel: 'maximum',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      mockBackupManager.createBackup.mockResolvedValue({
        id: 'backup-1',
        transactionId: transaction.id,
        createdAt: new Date(),
        backupPath: '/backups/backup-1',
        originalPaths: ['/test/important.txt'],
        checksum: 'abc123',
        compressed: true,
        encrypted: false
      })

      await transactionManager.addOperation(transaction, operation)
      await transactionManager.commitTransaction(transaction)

      expect(mockBackupManager.createBackup).toHaveBeenCalledWith(['/test/important.txt'])
      expect(transaction.status).toBe('committed')
    })

    it('should handle commit failure gracefully', async () => {
      const operation: FileOperation = {
        id: 'op-1',
        type: 'create',
        sourceePath: '/test/file.txt',
        safetyLevel: 'basic',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      mockOperationJournal.logOperation.mockRejectedValue(new Error('Journal write failed'))

      await transactionManager.addOperation(transaction, operation)
      
      await expect(transactionManager.commitTransaction(transaction))
        .rejects.toThrow('Transaction commit failed')

      expect(transaction.status).toBe('failed')
    })

    it('should prevent committing already committed transaction', async () => {
      await transactionManager.commitTransaction(transaction)
      
      await expect(transactionManager.commitTransaction(transaction))
        .rejects.toThrow('Transaction is not in a committable state')
    })
  })

  describe('transaction rollback', () => {
    let transaction: Transaction

    beforeEach(async () => {
      transaction = await transactionManager.beginTransaction()
    })

    it('should rollback empty transaction', async () => {
      await transactionManager.rollbackTransaction(transaction)

      expect(transaction.status).toBe('rolled_back')
      expect(transaction.completedAt).toBeInstanceOf(Date)
      expect(transactionManager.isTransactionActive(transaction.id)).toBe(false)
    })

    it('should rollback transaction with operations', async () => {
      const operation: FileOperation = {
        id: 'op-1',
        type: 'create',
        sourceePath: '/test/file.txt',
        safetyLevel: 'basic',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      mockOperationJournal.createRollbackScript.mockResolvedValue({
        id: 'rollback-1',
        operations: [{
          type: 'delete_file',
          targetPath: '/test/file.txt'
        }],
        strategy: 'reverse',
        createdAt: new Date()
      })

      await transactionManager.addOperation(transaction, operation)
      await transactionManager.rollbackTransaction(transaction)

      expect(transaction.status).toBe('rolled_back')
      expect(mockOperationJournal.createRollbackScript).toHaveBeenCalledWith(transaction.id)
      expect(mockOperationJournal.executeRollback).toHaveBeenCalled()
    })

    it('should handle rollback script creation failure', async () => {
      const operation: FileOperation = {
        id: 'op-1',
        type: 'create',
        sourceePath: '/test/file.txt',
        safetyLevel: 'basic',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      mockOperationJournal.createRollbackScript.mockRejectedValue(new Error('Rollback script failed'))

      await transactionManager.addOperation(transaction, operation)
      
      await expect(transactionManager.rollbackTransaction(transaction))
        .rejects.toThrow('Transaction rollback failed')

      expect(transaction.status).toBe('failed')
    })

    it('should prevent rolling back committed transaction', async () => {
      await transactionManager.commitTransaction(transaction)
      
      await expect(transactionManager.rollbackTransaction(transaction))
        .rejects.toThrow('Cannot rollback a committed transaction')
    })
  })

  describe('transaction timeout', () => {
    it('should timeout long-running transactions', async () => {
      const config: Partial<TransactionConfig> = { timeoutMs: 100 }
      const transaction = await transactionManager.beginTransaction(config)

      // Simulate long-running operation
      await new Promise(resolve => setTimeout(resolve, 150))

      await expect(transactionManager.commitTransaction(transaction))
        .rejects.toThrow('Transaction timeout')

      expect(transaction.status).toBe('failed')
    })

    it('should not timeout fast transactions', async () => {
      const config: Partial<TransactionConfig> = { timeoutMs: 1000 }
      const transaction = await transactionManager.beginTransaction(config)

      await transactionManager.commitTransaction(transaction)

      expect(transaction.status).toBe('committed')
    })
  })

  describe('concurrent transaction handling', () => {
    it('should handle multiple concurrent transactions', async () => {
      const transactions = await Promise.all([
        transactionManager.beginTransaction(),
        transactionManager.beginTransaction(),
        transactionManager.beginTransaction()
      ])

      expect(transactionManager.getActiveTransactions()).toHaveLength(3)

      await Promise.all(transactions.map(t => transactionManager.commitTransaction(t)))

      expect(transactionManager.getActiveTransactions()).toHaveLength(0)
      transactions.forEach(t => expect(t.status).toBe('committed'))
    })

    it('should detect and handle deadlocks', async () => {
      const config: Partial<TransactionConfig> = { enableDeadlockDetection: true }
      
      const transaction1 = await transactionManager.beginTransaction(config)
      const transaction2 = await transactionManager.beginTransaction(config)

      const operation1: FileOperation = {
        id: 'op-1',
        type: 'move',
        sourceePath: '/test/file1.txt',
        targetPath: '/test/file2.txt',
        safetyLevel: 'enhanced',
        timestamp: new Date()
      }

      const operation2: FileOperation = {
        id: 'op-2',
        type: 'move',
        sourceePath: '/test/file2.txt',
        targetPath: '/test/file1.txt',
        safetyLevel: 'enhanced',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      mockFileSystemMonitor.detectConflicts.mockResolvedValue([])

      await transactionManager.addOperation(transaction1, operation1)
      await transactionManager.addOperation(transaction2, operation2)

      // Simulate deadlock detection
      const commitPromises = [
        transactionManager.commitTransaction(transaction1),
        transactionManager.commitTransaction(transaction2)
      ]

      // One should succeed, one should be rolled back due to deadlock
      const results = await Promise.allSettled(commitPromises)
      
      const successes = results.filter(r => r.status === 'fulfilled')
      const failures = results.filter(r => r.status === 'rejected')

      expect(successes).toHaveLength(1)
      expect(failures).toHaveLength(1)
    })
  })

  describe('error handling and recovery', () => {
    it('should handle validation errors gracefully', async () => {
      const transaction = await transactionManager.beginTransaction()
      const operation: FileOperation = {
        id: 'op-1',
        type: 'delete',
        sourceePath: '/nonexistent/file.txt',
        safetyLevel: 'maximum',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'FILE_NOT_FOUND', message: 'File not found', severity: 'critical' }],
        warnings: []
      })

      await expect(transactionManager.addOperation(transaction, operation))
        .rejects.toThrow('Operation validation failed')

      expect(transaction.operations).toHaveLength(0)
      expect(transaction.status).toBe('pending')
    })

    it('should handle backup creation failures', async () => {
      const transaction = await transactionManager.beginTransaction()
      const operation: FileOperation = {
        id: 'op-1',
        type: 'delete',
        sourceePath: '/test/important.txt',
        safetyLevel: 'maximum',
        timestamp: new Date()
      }

      mockSafetyValidator.validateOperation.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      mockBackupManager.createBackup.mockRejectedValue(new Error('Backup failed'))

      await transactionManager.addOperation(transaction, operation)
      
      await expect(transactionManager.commitTransaction(transaction))
        .rejects.toThrow('Backup creation failed')

      expect(transaction.status).toBe('failed')
    })

    it('should handle system resource exhaustion', async () => {
      const transaction = await transactionManager.beginTransaction()
      
      // Simulate system resource exhaustion
      const mockError = new Error('ENOSPC: no space left on device')
      mockOperationJournal.logOperation.mockRejectedValue(mockError)

      await expect(transactionManager.commitTransaction(transaction))
        .rejects.toThrow('ENOSPC')

      expect(transaction.status).toBe('failed')
    })
  })

  describe('transaction querying', () => {
    it('should retrieve transaction by ID', async () => {
      const transaction = await transactionManager.beginTransaction()
      
      const retrieved = await transactionManager.getTransaction(transaction.id)
      
      expect(retrieved).toEqual(transaction)
    })

    it('should return null for non-existent transaction', async () => {
      const retrieved = await transactionManager.getTransaction('non-existent-id')
      
      expect(retrieved).toBeNull()
    })

    it('should list all active transactions', () => {
      const activeTransactions = transactionManager.getActiveTransactions()
      
      expect(Array.isArray(activeTransactions)).toBe(true)
    })
  })

  describe('cleanup and maintenance', () => {
    it('should clean up completed transactions', async () => {
      const transaction = await transactionManager.beginTransaction()
      await transactionManager.commitTransaction(transaction)

      expect(transactionManager.isTransactionActive(transaction.id)).toBe(false)
    })

    it('should handle cleanup errors gracefully', async () => {
      const transaction = await transactionManager.beginTransaction()
      
      // Mock cleanup failure
      const cleanupSpy = vi.spyOn(transactionManager as any, 'cleanup')
      cleanupSpy.mockRejectedValue(new Error('Cleanup failed'))

      await transactionManager.commitTransaction(transaction)

      // Transaction should still be committed despite cleanup failure
      expect(transaction.status).toBe('committed')
    })
  })
})