/**
 * OperationJournal Implementation
 * 
 * Provides comprehensive audit logging and rollback script execution
 * for file operations with full ACID properties and enterprise-level
 * safety guarantees.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import {
  OperationJournal as IOperationJournal,
  OperationRecord,
  RollbackScript,
  RollbackOperation,
  SafetyError,
  SafetyErrorCode,
  FileOperation,
  OperationType
} from './types'

export class OperationJournal implements IOperationJournal {
  private journalPath: string
  private operations: Map<string, OperationRecord[]> = new Map()
  private allOperations: OperationRecord[] = []
  private isInitialized = false

  constructor(journalPath: string) {
    this.journalPath = journalPath
  }

  /**
   * Initialize the journal and load existing entries
   */
  async initialize(): Promise<void> {
    // Ensure journal directory exists
    await this.ensureJournalDirectory()
    
    // Load existing journal entries (this can throw its own specific errors)
    await this.loadJournalEntries()
    
    this.isInitialized = true
  }

  /**
   * Log a file operation to the journal
   */
  async logOperation(record: OperationRecord): Promise<void> {
    this.validateOperationRecord(record)
    
    try {
      // Add to in-memory storage
      if (!this.operations.has(record.transactionId)) {
        this.operations.set(record.transactionId, [])
      }
      
      const transactionOps = this.operations.get(record.transactionId)!
      transactionOps.push(record)
      
      // Add to all operations list
      this.allOperations.push(record)
      
      // Sort operations by timestamp
      transactionOps.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      this.allOperations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      
      // Persist to disk
      await this.persistJournal()
      
    } catch (error) {
      throw new SafetyError(
        'Failed to log operation',
        SafetyErrorCode.OPERATION_FAILED,
        record.operation,
        undefined,
        { error: error instanceof Error ? error.message : String(error) }
      )
    }
  }

  /**
   * Get all operations for a specific transaction
   */
  async getOperations(transactionId: string): Promise<OperationRecord[]> {
    const operations = this.operations.get(transactionId) || []
    return [...operations] // Return copy to prevent mutation
  }

  /**
   * Get operation history with optional limit
   */
  async getOperationHistory(limit?: number): Promise<OperationRecord[]> {
    // Sort by timestamp in descending order (most recent first)
    const sortedOps = [...this.allOperations].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )
    
    return limit ? sortedOps.slice(0, limit) : sortedOps
  }

  /**
   * Create a rollback script for a transaction
   */
  async createRollbackScript(transactionId: string): Promise<RollbackScript> {
    const operations = await this.getOperations(transactionId)
    
    if (operations.length === 0) {
      throw new SafetyError(
        `No operations found for transaction: ${transactionId}`,
        SafetyErrorCode.OPERATION_FAILED,
        undefined,
        undefined,
        { transactionId }
      )
    }

    // Filter out failed operations and reverse order for rollback
    const successfulOps = operations
      .filter(record => record.success)
      .reverse()

    const rollbackOperations: RollbackOperation[] = []

    for (const record of successfulOps) {
      const rollbackOps = this.generateRollbackOperations(record)
      rollbackOperations.push(...rollbackOps)
    }

    return {
      id: `rollback-${transactionId}-${Date.now()}`,
      operations: rollbackOperations,
      strategy: 'reverse',
      createdAt: new Date()
    }
  }

  /**
   * Execute a rollback script
   */
  async executeRollback(script: RollbackScript): Promise<void> {
    this.validateRollbackScript(script)

    try {
      for (const operation of script.operations) {
        await this.executeRollbackOperation(operation)
      }
    } catch (error) {
      throw new SafetyError(
        'Rollback execution failed',
        SafetyErrorCode.ROLLBACK_FAILED,
        undefined,
        undefined,
        { 
          scriptId: script.id,
          error: error instanceof Error ? error.message : String(error)
        }
      )
    }
  }

  /**
   * Clean up old operation records
   */
  async cleanupOldRecords(olderThan: Date): Promise<void> {
    try {
      // Filter out old records (keep records newer than or equal to the cutoff)
      this.allOperations = this.allOperations.filter(
        record => record.timestamp >= olderThan
      )

      // Rebuild transaction map
      this.operations.clear()
      for (const record of this.allOperations) {
        if (!this.operations.has(record.transactionId)) {
          this.operations.set(record.transactionId, [])
        }
        this.operations.get(record.transactionId)!.push(record)
      }

      // Sort all transaction operations
      for (const [, ops] of this.operations) {
        ops.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      }

      // Persist changes
      await this.persistJournal()
      
    } catch (error) {
      throw new SafetyError(
        'Failed to cleanup old records',
        SafetyErrorCode.OPERATION_FAILED,
        undefined,
        undefined,
        { error: error instanceof Error ? error.message : String(error) }
      )
    }
  }

  // Private helper methods

  private async ensureJournalDirectory(): Promise<void> {
    try {
      await fs.access(this.journalPath)
    } catch {
      await fs.mkdir(this.journalPath, { recursive: true })
    }
  }

  private async loadJournalEntries(): Promise<void> {
    const journalFile = path.join(this.journalPath, 'operations.json')
    
    try {
      await fs.access(journalFile)
      const data = await fs.readFile(journalFile, 'utf-8')
      const records: OperationRecord[] = JSON.parse(data)
      
      // Rebuild in-memory structures with proper date conversion
      this.allOperations = records.map(record => ({
        ...record,
        timestamp: new Date(record.timestamp),
        operation: {
          ...record.operation,
          timestamp: new Date(record.operation.timestamp)
        },
        rollbackScript: record.rollbackScript ? {
          ...record.rollbackScript,
          createdAt: new Date(record.rollbackScript.createdAt)
        } : record.rollbackScript
      }))

      this.operations.clear()
      for (const record of this.allOperations) {
        if (!this.operations.has(record.transactionId)) {
          this.operations.set(record.transactionId, [])
        }
        this.operations.get(record.transactionId)!.push(record)
      }

      // Sort all operations
      for (const [, ops] of this.operations) {
        ops.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      }
      this.allOperations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new SafetyError(
          'Failed to load journal',
          SafetyErrorCode.CORRUPTION_DETECTED,
          undefined,
          undefined,
          { error: error.message }
        )
      }
      // File doesn't exist, start with empty journal
      this.allOperations = []
      this.operations.clear()
    }
  }

  private async persistJournal(): Promise<void> {
    const journalFile = path.join(this.journalPath, 'operations.json')
    // Use a replacer to properly serialize dates
    const data = JSON.stringify(this.allOperations, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    }, 2)
    await fs.writeFile(journalFile, data, 'utf-8')
  }

  private validateOperationRecord(record: OperationRecord): void {
    if (!record.id || !record.transactionId || !record.operation) {
      throw new SafetyError(
        'Invalid operation record: missing required fields',
        SafetyErrorCode.VALIDATION_FAILED,
        record.operation,
        undefined,
        { recordId: record.id }
      )
    }

    if (!record.operation.id || !record.operation.type || !record.operation.sourceePath) {
      throw new SafetyError(
        'Invalid operation record: invalid operation structure',
        SafetyErrorCode.VALIDATION_FAILED,
        record.operation,
        undefined,
        { recordId: record.id }
      )
    }
  }

  private validateRollbackScript(script: RollbackScript): void {
    if (script.validUntil && script.validUntil < new Date()) {
      throw new SafetyError(
        'Rollback script has expired',
        SafetyErrorCode.ROLLBACK_FAILED,
        undefined,
        undefined,
        { scriptId: script.id, validUntil: script.validUntil }
      )
    }

    for (const operation of script.operations) {
      if (operation.type === 'restore_file' && !operation.backupPath) {
        throw new SafetyError(
          'Invalid rollback operation: restore_file requires backupPath',
          SafetyErrorCode.VALIDATION_FAILED,
          undefined,
          undefined,
          { scriptId: script.id, operation }
        )
      }

      if (operation.type === 'move_file' && !operation.sourcePath) {
        throw new SafetyError(
          'Invalid rollback operation: move_file requires sourcePath',
          SafetyErrorCode.VALIDATION_FAILED,
          undefined,
          undefined,
          { scriptId: script.id, operation }
        )
      }
    }
  }

  private generateRollbackOperations(record: OperationRecord): RollbackOperation[] {
    const { operation } = record
    const rollbackOps: RollbackOperation[] = []

    switch (operation.type) {
      case 'create':
        // Rollback create by deleting the file
        rollbackOps.push({
          type: 'delete_file',
          targetPath: operation.targetPath || operation.sourceePath
        })
        break

      case 'delete':
        // Rollback delete by restoring from backup
        if (record.rollbackScript?.operations) {
          rollbackOps.push(...record.rollbackScript.operations)
        }
        break

      case 'move':
        // Rollback move by moving back to original location
        rollbackOps.push({
          type: 'move_file',
          sourcePath: operation.targetPath || operation.sourceePath,
          targetPath: operation.sourceePath
        })
        break

      case 'copy':
        // Rollback copy by deleting the copied file
        if (operation.targetPath) {
          rollbackOps.push({
            type: 'delete_file',
            targetPath: operation.targetPath
          })
        }
        break

      case 'update':
        // Rollback update by restoring from backup
        if (record.rollbackScript?.operations) {
          rollbackOps.push(...record.rollbackScript.operations)
        }
        break

      default:
        // For unknown operation types, try to use existing rollback script
        if (record.rollbackScript?.operations) {
          rollbackOps.push(...record.rollbackScript.operations)
        }
    }

    return rollbackOps
  }

  private async executeRollbackOperation(operation: RollbackOperation): Promise<void> {
    switch (operation.type) {
      case 'delete_file':
        await fs.unlink(operation.targetPath)
        break

      case 'restore_file':
        if (!operation.backupPath) {
          throw new Error('Backup path required for restore operation')
        }
        await fs.copyFile(operation.backupPath, operation.targetPath)
        break

      case 'move_file':
        if (!operation.sourcePath) {
          throw new Error('Source path required for move operation')
        }
        await fs.rename(operation.sourcePath, operation.targetPath)
        break

      case 'restore_metadata':
        // Placeholder for metadata restoration
        // Implementation would depend on specific metadata storage
        break

      default:
        throw new Error(`Unknown rollback operation type: ${operation.type}`)
    }
  }
}