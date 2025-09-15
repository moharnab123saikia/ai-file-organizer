/**
 * OperationJournal Tests
 * 
 * Comprehensive test suite for the OperationJournal service covering:
 * - Operation logging and storage
 * - Rollback script generation and execution
 * - Journal management and cleanup
 * - Performance and error scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OperationJournal } from '../OperationJournal'
import {
  OperationRecord,
  FileOperation,
  RollbackScript,
  RollbackOperation,
  SafetyError,
  SafetyErrorCode,
  FileSystemState,
  FileStateInfo
} from '../types'
import * as fs from 'fs/promises'
import * as path from 'path'

// Mock filesystem operations
vi.mock('fs/promises')
vi.mock('path')

describe('OperationJournal', () => {
  let journal: OperationJournal
  let mockJournalPath: string
  let mockFs: any

  beforeEach(() => {
    mockJournalPath = '/mock/journal/path'
    mockFs = vi.mocked(fs)
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup default mock implementations
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.readFile.mockResolvedValue('[]')
    mockFs.access.mockResolvedValue(undefined)
    mockFs.stat.mockResolvedValue({ 
      isDirectory: () => true,
      size: 1024,
      mtime: new Date()
    } as any)

    journal = new OperationJournal(mockJournalPath)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Constructor and Initialization', () => {
    it('should create journal with specified path', () => {
      expect(journal).toBeInstanceOf(OperationJournal)
    })

    it('should initialize journal directory if it does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('Directory not found'))
      
      await journal.initialize()
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(mockJournalPath, { recursive: true })
    })

    it('should not create directory if it already exists', async () => {
      mockFs.access.mockResolvedValueOnce(undefined)
      
      await journal.initialize()
      
      expect(mockFs.mkdir).not.toHaveBeenCalled()
    })

    it('should load existing journal entries on initialization', async () => {
      const existingRecords = [
        createMockOperationRecord('record1', 'transaction1'),
        createMockOperationRecord('record2', 'transaction1')
      ]
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(existingRecords))
      
      await journal.initialize()
      
      const records = await journal.getOperations('transaction1')
      expect(records).toHaveLength(2)
      expect(records[0].id).toBe('record1')
    })
  })

  describe('Operation Logging', () => {
    beforeEach(async () => {
      await journal.initialize()
    })

    it('should log a single operation successfully', async () => {
      const record = createMockOperationRecord('op1', 'tx1')
      
      await journal.logOperation(record)
      
      expect(mockFs.writeFile).toHaveBeenCalled()
      const writeCall = mockFs.writeFile.mock.calls[0]
      const writtenData = JSON.parse(writeCall[1])
      
      // Create expected record with serialized dates (as they appear in JSON)
      const expectedRecord = {
        ...record,
        timestamp: record.timestamp.toISOString(),
        operation: {
          ...record.operation,
          timestamp: record.operation.timestamp.toISOString()
        },
        rollbackScript: record.rollbackScript ? {
          ...record.rollbackScript,
          createdAt: record.rollbackScript.createdAt.toISOString()
        } : record.rollbackScript
      }
      
      expect(writtenData).toContainEqual(expectedRecord)
    })

    it('should log multiple operations for same transaction', async () => {
      const record1 = createMockOperationRecord('op1', 'tx1')
      const record2 = createMockOperationRecord('op2', 'tx1')
      
      await journal.logOperation(record1)
      await journal.logOperation(record2)
      
      const operations = await journal.getOperations('tx1')
      expect(operations).toHaveLength(2)
      expect(operations.find((op: OperationRecord) => op.id === 'op1')).toBeDefined()
      expect(operations.find((op: OperationRecord) => op.id === 'op2')).toBeDefined()
    })

    it('should handle operations from different transactions', async () => {
      const record1 = createMockOperationRecord('op1', 'tx1')
      const record2 = createMockOperationRecord('op2', 'tx2')
      
      await journal.logOperation(record1)
      await journal.logOperation(record2)
      
      const tx1Operations = await journal.getOperations('tx1')
      const tx2Operations = await journal.getOperations('tx2')
      
      expect(tx1Operations).toHaveLength(1)
      expect(tx2Operations).toHaveLength(1)
      expect(tx1Operations[0].id).toBe('op1')
      expect(tx2Operations[0].id).toBe('op2')
    })

    it('should preserve operation metadata and timestamps', async () => {
      const timestamp = new Date('2024-01-01T10:00:00Z')
      const record = createMockOperationRecord('op1', 'tx1', {
        timestamp,
        operation: {
          id: 'op1-operation',
          type: 'create',
          sourceePath: '/mock/path/op1.txt',
          safetyLevel: 'enhanced',
          timestamp: new Date(),
          metadata: { custom: 'data', important: true }
        }
      })
      
      await journal.logOperation(record)
      
      const operations = await journal.getOperations('tx1')
      expect(operations[0].timestamp).toEqual(timestamp)
      expect(operations[0].operation.metadata).toEqual({ custom: 'data', important: true })
    })

    it('should handle failed operation logging', async () => {
      const record = createMockOperationRecord('op1', 'tx1')
      record.success = false
      record.error = new SafetyError('Operation failed', SafetyErrorCode.OPERATION_FAILED)
      
      await journal.logOperation(record)
      
      const operations = await journal.getOperations('tx1')
      expect(operations[0].success).toBe(false)
      expect(operations[0].error?.code).toBe(SafetyErrorCode.OPERATION_FAILED)
    })

    it('should throw error when journal write fails', async () => {
      const record = createMockOperationRecord('op1', 'tx1')
      mockFs.writeFile.mockRejectedValueOnce(new Error('Disk full'))
      
      await expect(journal.logOperation(record)).rejects.toThrow('Failed to log operation')
    })
  })

  describe('Operation Retrieval', () => {
    beforeEach(async () => {
      await journal.initialize()
      
      // Setup test data
      const records = [
        createMockOperationRecord('op1', 'tx1', { timestamp: new Date('2024-01-01T10:00:00Z') }),
        createMockOperationRecord('op2', 'tx1', { timestamp: new Date('2024-01-01T11:00:00Z') }),
        createMockOperationRecord('op3', 'tx2', { timestamp: new Date('2024-01-01T12:00:00Z') }),
        createMockOperationRecord('op4', 'tx1', { timestamp: new Date('2024-01-01T13:00:00Z') })
      ]
      
      for (const record of records) {
        await journal.logOperation(record)
      }
    })

    it('should retrieve operations for specific transaction', async () => {
      const operations = await journal.getOperations('tx1')
      
      expect(operations).toHaveLength(3)
      expect(operations.every((op: OperationRecord) => op.transactionId === 'tx1')).toBe(true)
    })

    it('should return operations in chronological order', async () => {
      const operations = await journal.getOperations('tx1')
      
      expect(operations[0].id).toBe('op1')
      expect(operations[1].id).toBe('op2')
      expect(operations[2].id).toBe('op4')
    })

    it('should return empty array for non-existent transaction', async () => {
      const operations = await journal.getOperations('nonexistent')
      
      expect(operations).toHaveLength(0)
    })

    it('should retrieve operation history with limit', async () => {
      const history = await journal.getOperationHistory(2)
      
      expect(history).toHaveLength(2)
      expect(history[0].id).toBe('op4') // Most recent first
      expect(history[1].id).toBe('op3')
    })

    it('should retrieve all history when no limit specified', async () => {
      const history = await journal.getOperationHistory()
      
      expect(history).toHaveLength(4)
      expect(history[0].id).toBe('op4') // Most recent first
    })
  })

  describe('Rollback Script Generation', () => {
    beforeEach(async () => {
      await journal.initialize()
    })

    it('should generate rollback script for transaction with create operations', async () => {
      const createRecord = createMockOperationRecord('op1', 'tx1', {
        operation: {
          type: 'create',
          sourceePath: '/path/to/newfile.txt',
          targetPath: '/path/to/newfile.txt',
          id: 'op1-operation',
          safetyLevel: 'enhanced',
          timestamp: new Date()
        }
      })
      
      await journal.logOperation(createRecord)
      
      const script = await journal.createRollbackScript('tx1')
      
      expect(script.operations).toHaveLength(1)
      expect(script.operations[0].type).toBe('delete_file')
      expect(script.operations[0].targetPath).toBe('/path/to/newfile.txt')
    })

    it('should generate rollback script for transaction with delete operations', async () => {
      const deleteRecord = createMockOperationRecord('op1', 'tx1', {
        operation: {
          type: 'delete',
          sourceePath: '/path/to/file.txt',
          id: 'op1-operation',
          safetyLevel: 'enhanced',
          timestamp: new Date()
        },
        rollbackScript: {
          id: 'rollback-op1',
          strategy: 'restore',
          createdAt: new Date(),
          operations: [{
            type: 'restore_file',
            targetPath: '/path/to/file.txt',
            backupPath: '/backup/file.txt'
          }]
        }
      })
      
      await journal.logOperation(deleteRecord)
      
      const script = await journal.createRollbackScript('tx1')
      
      expect(script.operations).toHaveLength(1)
      expect(script.operations[0].type).toBe('restore_file')
      expect(script.operations[0].backupPath).toBe('/backup/file.txt')
    })

    it('should generate rollback script for transaction with move operations', async () => {
      const moveRecord = createMockOperationRecord('op1', 'tx1', {
        operation: {
          type: 'move',
          sourceePath: '/old/path/file.txt',
          targetPath: '/new/path/file.txt',
          id: 'op1-operation',
          safetyLevel: 'enhanced',
          timestamp: new Date()
        }
      })
      
      await journal.logOperation(moveRecord)
      
      const script = await journal.createRollbackScript('tx1')
      
      expect(script.operations).toHaveLength(1)
      expect(script.operations[0].type).toBe('move_file')
      expect(script.operations[0].sourcePath).toBe('/new/path/file.txt')
      expect(script.operations[0].targetPath).toBe('/old/path/file.txt')
    })

    it('should generate rollback script with operations in reverse order', async () => {
      const records = [
        createMockOperationRecord('op1', 'tx1', {
          operation: {
            type: 'create',
            sourceePath: '/file1.txt',
            id: 'op1-operation',
            safetyLevel: 'enhanced',
            timestamp: new Date('2024-01-01T10:00:00Z')
          },
          timestamp: new Date('2024-01-01T10:00:00Z')
        }),
        createMockOperationRecord('op2', 'tx1', {
          operation: {
            type: 'create',
            sourceePath: '/file2.txt',
            id: 'op2-operation',
            safetyLevel: 'enhanced',
            timestamp: new Date('2024-01-01T11:00:00Z')
          },
          timestamp: new Date('2024-01-01T11:00:00Z')
        })
      ]
      
      for (const record of records) {
        await journal.logOperation(record)
      }
      
      const script = await journal.createRollbackScript('tx1')
      
      expect(script.operations).toHaveLength(2)
      expect(script.operations[0].targetPath).toBe('/file2.txt') // Most recent operation first
      expect(script.operations[1].targetPath).toBe('/file1.txt')
    })

    it('should handle complex transaction rollback script', async () => {
      const records = [
        createMockOperationRecord('op1', 'tx1', {
          operation: {
            type: 'create',
            sourceePath: '/new/file.txt',
            id: 'op1-operation',
            safetyLevel: 'enhanced',
            timestamp: new Date()
          }
        }),
        createMockOperationRecord('op2', 'tx1', {
          operation: {
            type: 'move',
            sourceePath: '/old/location.txt',
            targetPath: '/new/location.txt',
            id: 'op2-operation',
            safetyLevel: 'enhanced',
            timestamp: new Date()
          }
        }),
        createMockOperationRecord('op3', 'tx1', {
          operation: {
            type: 'delete',
            sourceePath: '/temp/file.txt',
            id: 'op3-operation',
            safetyLevel: 'enhanced',
            timestamp: new Date()
          },
          rollbackScript: {
            id: 'rollback-op3',
            strategy: 'restore',
            createdAt: new Date(),
            operations: [{
              type: 'restore_file',
              targetPath: '/temp/file.txt',
              backupPath: '/backup/temp_file.txt'
            }]
          }
        })
      ]
      
      for (const record of records) {
        await journal.logOperation(record)
      }
      
      const script = await journal.createRollbackScript('tx1')
      
      expect(script.operations).toHaveLength(3)
      expect(script.operations[0].type).toBe('restore_file') // Delete rollback
      expect(script.operations[1].type).toBe('move_file') // Move rollback
      expect(script.operations[2].type).toBe('delete_file') // Create rollback
    })

    it('should throw error for non-existent transaction', async () => {
      await expect(journal.createRollbackScript('nonexistent'))
        .rejects.toThrow('No operations found for transaction')
    })

    it('should skip failed operations in rollback script', async () => {
      const successRecord = createMockOperationRecord('op1', 'tx1', {
        operation: {
          type: 'create',
          sourceePath: '/success.txt',
          id: 'success-operation',
          safetyLevel: 'enhanced',
          timestamp: new Date()
        },
        success: true
      })
      const failedRecord = createMockOperationRecord('op2', 'tx1', {
        operation: {
          type: 'create',
          sourceePath: '/failed.txt',
          id: 'failed-operation',
          safetyLevel: 'enhanced',
          timestamp: new Date()
        },
        success: false
      })
      
      await journal.logOperation(successRecord)
      await journal.logOperation(failedRecord)
      
      const script = await journal.createRollbackScript('tx1')
      
      expect(script.operations).toHaveLength(1)
      expect(script.operations[0].targetPath).toBe('/success.txt')
    })
  })

  describe('Rollback Script Execution', () => {
    beforeEach(async () => {
      await journal.initialize()
      
      // Mock file system operations for rollback execution
      mockFs.rename.mockResolvedValue(undefined)
      mockFs.unlink.mockResolvedValue(undefined)
      mockFs.copyFile.mockResolvedValue(undefined)
    })

    it('should execute delete file rollback operation', async () => {
      const script: RollbackScript = {
        id: 'rollback-1',
        operations: [{
          type: 'delete_file',
          targetPath: '/path/to/delete.txt'
        }],
        strategy: 'reverse',
        createdAt: new Date()
      }
      
      await journal.executeRollback(script)
      
      expect(mockFs.unlink).toHaveBeenCalledWith('/path/to/delete.txt')
    })

    it('should execute restore file rollback operation', async () => {
      const script: RollbackScript = {
        id: 'rollback-1',
        operations: [{
          type: 'restore_file',
          targetPath: '/path/to/restore.txt',
          backupPath: '/backup/restore.txt'
        }],
        strategy: 'restore',
        createdAt: new Date()
      }
      
      await journal.executeRollback(script)
      
      expect(mockFs.copyFile).toHaveBeenCalledWith('/backup/restore.txt', '/path/to/restore.txt')
    })

    it('should execute move file rollback operation', async () => {
      const script: RollbackScript = {
        id: 'rollback-1',
        operations: [{
          type: 'move_file',
          sourcePath: '/current/location.txt',
          targetPath: '/original/location.txt'
        }],
        strategy: 'reverse',
        createdAt: new Date()
      }
      
      await journal.executeRollback(script)
      
      expect(mockFs.rename).toHaveBeenCalledWith('/current/location.txt', '/original/location.txt')
    })

    it('should execute multiple rollback operations in order', async () => {
      const script: RollbackScript = {
        id: 'rollback-1',
        operations: [
          {
            type: 'delete_file',
            targetPath: '/file1.txt'
          },
          {
            type: 'move_file',
            sourcePath: '/moved.txt',
            targetPath: '/original.txt'
          }
        ],
        strategy: 'reverse',
        createdAt: new Date()
      }
      
      await journal.executeRollback(script)
      
      expect(mockFs.unlink).toHaveBeenCalledWith('/file1.txt')
      expect(mockFs.rename).toHaveBeenCalledWith('/moved.txt', '/original.txt')
    })

    it('should handle rollback operation failures gracefully', async () => {
      const script: RollbackScript = {
        id: 'rollback-1',
        operations: [{
          type: 'delete_file',
          targetPath: '/nonexistent.txt'
        }],
        strategy: 'reverse',
        createdAt: new Date()
      }
      
      mockFs.unlink.mockRejectedValueOnce(new Error('File not found'))
      
      await expect(journal.executeRollback(script)).rejects.toThrow('Rollback execution failed')
    })

    it('should validate rollback script before execution', async () => {
      const invalidScript: RollbackScript = {
        id: 'rollback-1',
        operations: [{
          type: 'restore_file',
          targetPath: '/target.txt'
          // Missing backupPath
        }],
        strategy: 'restore',
        createdAt: new Date()
      }
      
      await expect(journal.executeRollback(invalidScript))
        .rejects.toThrow('Invalid rollback operation')
    })

    it('should handle expired rollback scripts', async () => {
      const expiredScript: RollbackScript = {
        id: 'rollback-1',
        operations: [{
          type: 'delete_file',
          targetPath: '/file.txt'
        }],
        strategy: 'reverse',
        createdAt: new Date('2020-01-01'),
        validUntil: new Date('2020-01-02')
      }
      
      await expect(journal.executeRollback(expiredScript))
        .rejects.toThrow('Rollback script has expired')
    })
  })

  describe('Journal Management and Cleanup', () => {
    beforeEach(async () => {
      await journal.initialize()
    })

    it('should clean up old operation records', async () => {
      const oldDate = new Date('2020-01-01')
      const recentDate = new Date('2024-01-01')
      
      const oldRecord = createMockOperationRecord('old', 'tx1', { timestamp: oldDate })
      const recentRecord = createMockOperationRecord('recent', 'tx2', { timestamp: recentDate })
      
      await journal.logOperation(oldRecord)
      await journal.logOperation(recentRecord)
      
      await journal.cleanupOldRecords(new Date('2023-01-01'))
      
      const allHistory = await journal.getOperationHistory()
      expect(allHistory).toHaveLength(1)
      expect(allHistory[0].id).toBe('recent')
    })

    it('should preserve recent records during cleanup', async () => {
      const records = [
        createMockOperationRecord('op1', 'tx1', { timestamp: new Date('2024-01-01') }),
        createMockOperationRecord('op2', 'tx1', { timestamp: new Date('2024-01-02') }),
        createMockOperationRecord('op3', 'tx1', { timestamp: new Date('2024-01-03') })
      ]
      
      for (const record of records) {
        await journal.logOperation(record)
      }
      
      await journal.cleanupOldRecords(new Date('2024-01-02'))
      
      const history = await journal.getOperationHistory()
      expect(history).toHaveLength(2)
      expect(history.some((r: OperationRecord) => r.id === 'op2')).toBe(true)
      expect(history.some((r: OperationRecord) => r.id === 'op3')).toBe(true)
    })

    it('should handle cleanup when no old records exist', async () => {
      const recentRecord = createMockOperationRecord('recent', 'tx1', {
        timestamp: new Date('2024-01-01')
      })
      
      await journal.logOperation(recentRecord)
      
      await journal.cleanupOldRecords(new Date('2020-01-01'))
      
      const history = await journal.getOperationHistory()
      expect(history).toHaveLength(1)
    })

    it('should clean up empty transactions after record cleanup', async () => {
      const records = [
        createMockOperationRecord('op1', 'tx1', { timestamp: new Date('2020-01-01') }),
        createMockOperationRecord('op2', 'tx2', { timestamp: new Date('2024-01-01') })
      ]
      
      for (const record of records) {
        await journal.logOperation(record)
      }
      
      await journal.cleanupOldRecords(new Date('2023-01-01'))
      
      const tx1Operations = await journal.getOperations('tx1')
      const tx2Operations = await journal.getOperations('tx2')
      
      expect(tx1Operations).toHaveLength(0)
      expect(tx2Operations).toHaveLength(1)
    })
  })

  describe('Performance and Concurrency', () => {
    beforeEach(async () => {
      await journal.initialize()
    })

    it('should handle concurrent operation logging', async () => {
      const records = Array.from({ length: 10 }, (_, i) => 
        createMockOperationRecord(`op${i}`, 'tx1')
      )
      
      await Promise.all(records.map(record => journal.logOperation(record)))
      
      const operations = await journal.getOperations('tx1')
      expect(operations).toHaveLength(10)
    })

    it('should efficiently retrieve large operation history', async () => {
      // Create many operations
      const records = Array.from({ length: 1000 }, (_, i) => 
        createMockOperationRecord(`op${i}`, `tx${i % 100}`, {
          timestamp: new Date(Date.now() + i * 1000)
        })
      )
      
      for (const record of records) {
        await journal.logOperation(record)
      }
      
      const start = Date.now()
      const history = await journal.getOperationHistory(50)
      const duration = Date.now() - start
      
      expect(history).toHaveLength(50)
      expect(duration).toBeLessThan(100) // Should be fast
    })

    it('should handle large rollback script generation efficiently', async () => {
      // Create transaction with many operations
      const records = Array.from({ length: 100 }, (_, i) => 
        createMockOperationRecord(`op${i}`, 'large-tx', {
          operation: {
            type: 'create',
            sourceePath: `/file${i}.txt`,
            id: `op${i}-operation`,
            safetyLevel: 'enhanced',
            timestamp: new Date(Date.now() + i * 1000)
          },
          timestamp: new Date(Date.now() + i * 1000)
        })
      )
      
      for (const record of records) {
        await journal.logOperation(record)
      }
      
      const start = Date.now()
      const script = await journal.createRollbackScript('large-tx')
      const duration = Date.now() - start
      
      expect(script.operations).toHaveLength(100)
      expect(duration).toBeLessThan(200) // Should be reasonably fast
    })
  })

  describe('Error Scenarios and Edge Cases', () => {
    beforeEach(async () => {
      await journal.initialize()
    })

    it('should handle corrupted journal file gracefully', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json content')
      
      await expect(journal.initialize()).rejects.toThrow('Failed to load journal')
    })

    it('should handle disk space errors during logging', async () => {
      const record = createMockOperationRecord('op1', 'tx1')
      mockFs.writeFile.mockRejectedValueOnce(new Error('ENOSPC: no space left on device'))
      
      await expect(journal.logOperation(record)).rejects.toThrow('Failed to log operation')
    })

    it('should handle missing backup files during rollback', async () => {
      const script: RollbackScript = {
        id: 'rollback-1',
        operations: [{
          type: 'restore_file',
          targetPath: '/target.txt',
          backupPath: '/nonexistent/backup.txt'
        }],
        strategy: 'restore',
        createdAt: new Date()
      }
      
      mockFs.copyFile.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'))
      
      await expect(journal.executeRollback(script)).rejects.toThrow('Rollback execution failed')
    })

    it('should validate operation record structure', async () => {
      const invalidRecord = {
        id: 'invalid',
        // Missing required fields
      } as any
      
      await expect(journal.logOperation(invalidRecord)).rejects.toThrow('Invalid operation record')
    })

    it('should handle empty rollback scripts', async () => {
      const emptyScript: RollbackScript = {
        id: 'empty',
        operations: [],
        strategy: 'reverse',
        createdAt: new Date()
      }
      
      await journal.executeRollback(emptyScript)
      
      // Should complete without error
      expect(mockFs.unlink).not.toHaveBeenCalled()
      expect(mockFs.rename).not.toHaveBeenCalled()
      expect(mockFs.copyFile).not.toHaveBeenCalled()
    })
  })
})

// Helper function to create mock operation records
function createMockOperationRecord(
  id: string, 
  transactionId: string, 
  overrides: Partial<OperationRecord> = {}
): OperationRecord {
  const baseOperation: FileOperation = {
    id: `operation-${id}`,
    type: 'create',
    sourceePath: `/mock/path/${id}.txt`,
    safetyLevel: 'enhanced',
    timestamp: new Date(),
    ...overrides.operation
  }

  const baseRollbackScript: RollbackScript = {
    id: `rollback-${id}`,
    operations: [],
    strategy: 'reverse',
    createdAt: new Date(),
    ...overrides.rollbackScript
  }

  return {
    id,
    transactionId,
    operation: baseOperation,
    beforeState: {},
    rollbackScript: baseRollbackScript,
    timestamp: new Date(),
    success: true,
    ...overrides
  }
}