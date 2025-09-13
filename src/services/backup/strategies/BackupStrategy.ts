import type {
  BackupStrategy as IBackupStrategy,
  BackupType,
  BackupContext,
  BackupData,
  BackupMetadata,
  DirectoryStructure,
  FileBackupEntry,
  PermissionBackup,
  SettingsSnapshot
} from '../types'

/**
 * Abstract base class for backup strategies
 * 
 * Provides common functionality and defines the interface
 * that all backup strategies must implement
 */
export abstract class BackupStrategy implements IBackupStrategy {
  abstract readonly type: BackupType

  /**
   * Create a backup using this strategy
   */
  abstract createBackup(
    targetPath: string,
    context: BackupContext
  ): Promise<BackupData>

  /**
   * Estimate the size of the backup that would be created
   */
  abstract estimateSize(targetPath: string): Promise<number>

  /**
   * Estimate the time required to create the backup
   */
  abstract estimateTime(targetPath: string): Promise<number>

  /**
   * Generate backup metadata
   */
  protected generateMetadata(
    targetPath: string,
    context: BackupContext,
    size: number
  ): BackupMetadata {
    const timestamp = new Date()
    
    return {
      id: this.generateBackupId(),
      timestamp,
      type: this.type,
      targetPath,
      size,
      compressionRatio: 1.0, // Will be updated during storage
      operationType: context.operation?.type || 'manual',
      description: context.options.description,
      tags: context.options.tags || [],
      integrity: {
        checksum: '', // Will be calculated during storage
        verified: false,
        lastVerification: timestamp
      }
    }
  }

  /**
   * Generate unique backup ID
   */
  protected generateBackupId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `backup-${timestamp}-${random}`
  }

  /**
   * Create empty settings snapshot
   */
  protected createSettingsSnapshot(): SettingsSnapshot {
    return {
      version: '1.0.0',
      settings: {},
      timestamp: new Date()
    }
  }
}