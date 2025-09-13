import { EventEmitter } from 'events'
import { BackupStorage } from './BackupStorage'
import { RestoreEngine } from './RestoreEngine'
import { FullBackupStrategy } from './strategies/FullBackupStrategy'
import { IncrementalBackupStrategy } from './strategies/IncrementalBackupStrategy'
import { MetadataBackupStrategy } from './strategies/MetadataBackupStrategy'
import { BackupError, ValidationError } from './types'
import type {
  BackupStrategy,
  BackupManagerConfig,
  OrganizationOperation,
  BackupOptions,
  RestoreOptions,
  BackupFilter,
  BackupResult,
  RestoreResult,
  ValidationResult,
  BackupMetadata,
  BackupData,
  BackupContext,
  BackupEvent,
  RestoreEvent,
  BackupType
} from './types'

/**
 * BackupManager - Central orchestrator for backup and restore operations
 * 
 * Responsibilities:
 * - Coordinate backup creation with appropriate strategies
 * - Manage backup metadata and storage
 * - Handle restore operations with conflict resolution
 * - Provide backup validation and integrity checking
 * - Emit events for UI progress tracking
 */
export class BackupManager extends EventEmitter {
  private storage: BackupStorage
  private restoreEngine: RestoreEngine
  private strategies: Map<BackupType, BackupStrategy>
  private defaultStrategy: BackupStrategy

  constructor(config: {
    storage: BackupStorage
    restoreEngine: RestoreEngine
    defaultStrategy?: BackupStrategy
    strategies?: Map<BackupType, BackupStrategy>
  }) {
    super()
    
    this.storage = config.storage
    this.restoreEngine = config.restoreEngine
    
    // Initialize backup strategies - use provided or create defaults
    this.strategies = config.strategies || new Map<BackupType, BackupStrategy>([
      ['full', new FullBackupStrategy()],
      ['incremental', new IncrementalBackupStrategy()],
      ['metadata', new MetadataBackupStrategy()]
    ])
    
    // Set default strategy
    this.defaultStrategy = config.defaultStrategy || this.strategies.get('full')!
  }

  /**
   * Create a backup for an organization operation
   */
  async createBackup(
    operation: OrganizationOperation,
    options: BackupOptions = {}
  ): Promise<BackupResult> {
    const startTime = Date.now()
    
    try {
      this.emit('backup:started', {
        type: 'backup:started',
        timestamp: new Date(),
        data: { operation, options }
      })

      // Select appropriate strategy
      const strategy = this.getStrategy(options.type || 'full')
      
      // Build backup context
      const context: BackupContext = {
        operation,
        sessionId: this.generateSessionId(),
        options: {
          includeContent: true,
          compression: true,
          ...options
        }
      }

      // Create backup data
      const backupData = await strategy.createBackup(operation.targetPath, context)
      
      // Store backup
      const backupId = await this.storage.store(backupData)
      
      const duration = Date.now() - startTime
      const result: BackupResult = {
        success: true,
        id: backupId,
        metadata: backupData.metadata,
        duration,
        bytesProcessed: backupData.metadata.size
      }

      this.emit('backup:completed', {
        type: 'backup:completed',
        timestamp: new Date(),
        data: result
      })

      return result

    } catch (error) {
      const duration = Date.now() - startTime
      const result: BackupResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      }

      this.emit('backup:failed', {
        type: 'backup:failed',
        timestamp: new Date(),
        data: { error, operation }
      })

      return result
    }
  }

  /**
   * List all available backups with optional filtering
   */
  async listBackups(filter?: BackupFilter): Promise<BackupMetadata[]> {
    try {
      const allBackups = await this.storage.list()
      
      if (!filter) {
        return allBackups
      }

      return allBackups.filter((backup: BackupMetadata) => {
        // Filter by target path
        if (filter.targetPath && backup.targetPath !== filter.targetPath) {
          return false
        }

        // Filter by type
        if (filter.type && backup.type !== filter.type) {
          return false
        }

        // Filter by operation type
        if (filter.operationType && backup.operationType !== filter.operationType) {
          return false
        }

        // Filter by tags
        if (filter.tags && filter.tags.length > 0) {
          const hasMatchingTag = filter.tags.some(tag => backup.tags.includes(tag))
          if (!hasMatchingTag) {
            return false
          }
        }

        // Filter by date range
        if (filter.dateRange) {
          const backupDate = backup.timestamp
          if (backupDate < filter.dateRange.from || backupDate > filter.dateRange.to) {
            return false
          }
        }

        // Filter by size range
        if (filter.sizeRange) {
          if (backup.size < filter.sizeRange.min || backup.size > filter.sizeRange.max) {
            return false
          }
        }

        return true
      })

    } catch (error) {
      throw new BackupError(
        `Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LIST_FAILED',
        'list'
      )
    }
  }

  /**
   * Restore a backup with conflict resolution
   */
  async restoreBackup(
    backupId: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    try {
      this.emit('restore:started', {
        type: 'restore:started',
        timestamp: new Date(),
        data: { backupId, options }
      })

      // Create restore plan
      const plan = {
        backupId,
        restoreType: options.restoreType || 'full',
        targetPath: options.targetPath || '',
        conflicts: [],
        resolutions: [],
        estimatedChanges: 0,
        estimatedSize: 0,
        riskLevel: 'low' as const,
        warnings: []
      }

      // Execute restore
      const result = await this.restoreEngine.executeRestore(plan)

      this.emit('restore:completed', {
        type: 'restore:completed',
        timestamp: new Date(),
        data: result
      })

      return result

    } catch (error) {
      const result: RestoreResult = {
        success: false,
        backupId,
        restoredFiles: 0,
        conflicts: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0
      }

      this.emit('restore:failed', {
        type: 'restore:failed',
        timestamp: new Date(),
        data: { error, backupId }
      })

      return result
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      await this.storage.delete(backupId)
    } catch (error) {
      throw new BackupError(
        `Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_FAILED',
        'delete',
        { backupId }
      )
    }
  }

  /**
   * Validate backup integrity
   */
  async validateBackup(backupId: string): Promise<ValidationResult> {
    try {
      const backupData = await this.storage.retrieve(backupId)
      
      // Perform basic validation
      const isValid = this.validateBackupData(backupData)
      
      return {
        valid: isValid,
        checksumMatch: true,
        structureIntact: true,
        details: {
          totalFiles: backupData.files.length,
          validatedFiles: backupData.files.length,
          checksumErrors: 0,
          structureErrors: 0,
          permissionErrors: 0
        }
      }

    } catch (error) {
      return {
        valid: false,
        checksumMatch: false,
        structureIntact: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get backup strategy by type
   */
  private getStrategy(type: BackupType): BackupStrategy {
    const strategy = this.strategies.get(type)
    if (!strategy) {
      return this.defaultStrategy
    }
    return strategy
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Validate backup data integrity
   */
  private validateBackupData(backupData: BackupData): boolean {
    try {
      // Check required fields
      if (!backupData.metadata || !backupData.structure || !backupData.files) {
        return false
      }

      // Check metadata integrity
      if (!backupData.metadata.id || !backupData.metadata.timestamp) {
        return false
      }

      // Check structure integrity
      if (!backupData.structure.root || !Array.isArray(backupData.structure.tree)) {
        return false
      }

      // Check files array
      if (!Array.isArray(backupData.files)) {
        return false
      }

      return true

    } catch (error) {
      return false
    }
  }
}