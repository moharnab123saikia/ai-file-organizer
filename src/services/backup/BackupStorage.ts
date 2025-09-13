import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { createHash } from 'crypto'
import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'
import type {
  BackupData,
  BackupMetadata,
  CompressedBackup,
  StorageOptions,
  EncryptionOptions
} from './types'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

/**
 * BackupStorage - Handles storage and retrieval of backup data
 * 
 * Responsibilities:
 * - Store backup data to disk with compression
 * - Retrieve backup data with integrity verification
 * - Manage backup metadata and indexing
 * - Handle cleanup and retention policies
 */
export class BackupStorage {
  private storageLocation: string
  private options: StorageOptions

  constructor(storageLocation: string, options: Partial<StorageOptions> = {}) {
    this.storageLocation = storageLocation
    this.options = {
      location: storageLocation,
      compression: true,
      ...options
    }
  }

  /**
   * Store backup data to persistent storage
   */
  async store(backupData: BackupData): Promise<string> {
    try {
      // Ensure storage directory exists
      await this.ensureStorageDirectory()

      // Generate backup ID if not provided
      const backupId = backupData.metadata.id || this.generateBackupId()
      
      // Update metadata with final ID
      backupData.metadata.id = backupId

      // Calculate checksum
      const checksum = this.calculateChecksum(backupData)
      backupData.metadata.integrity.checksum = checksum
      backupData.metadata.integrity.verified = true
      backupData.metadata.integrity.lastVerification = new Date()

      // Serialize backup data
      const serializedData = JSON.stringify(backupData)
      let dataToStore = Buffer.from(serializedData, 'utf8')

      // Apply compression if enabled
      if (this.options.compression) {
        dataToStore = await gzipAsync(dataToStore)
        
        // Update compression ratio
        const originalSize = Buffer.byteLength(serializedData, 'utf8')
        const compressedSize = dataToStore.length
        backupData.metadata.compressionRatio = compressedSize / originalSize
      }

      // Store backup data
      const backupPath = this.getBackupPath(backupId)
      await fs.writeFile(backupPath, dataToStore)

      // Store metadata separately for quick access
      const metadataPath = this.getMetadataPath(backupId)
      await fs.writeFile(metadataPath, JSON.stringify(backupData.metadata, null, 2))

      return backupId

    } catch (error) {
      throw new Error(`Failed to store backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Retrieve backup data from storage
   */
  async retrieve(backupId: string): Promise<BackupData> {
    try {
      const backupPath = this.getBackupPath(backupId)
      
      // Check if backup exists
      try {
        await fs.access(backupPath)
      } catch {
        throw new Error(`Backup not found: ${backupId}`)
      }

      // Read backup data
      let data = await fs.readFile(backupPath)

      // Decompress if needed
      if (this.options.compression) {
        data = await gunzipAsync(data)
      }

      // Parse backup data
      const backupData: BackupData = JSON.parse(data.toString('utf8'))

      // Verify integrity
      const calculatedChecksum = this.calculateChecksum(backupData)
      if (calculatedChecksum !== backupData.metadata.integrity.checksum) {
        throw new Error(`Backup integrity verification failed: ${backupId}`)
      }

      return backupData

    } catch (error) {
      throw new Error(`Failed to retrieve backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * List all available backups
   */
  async list(): Promise<BackupMetadata[]> {
    try {
      await this.ensureStorageDirectory()

      const files = await fs.readdir(this.storageLocation)
      const metadataFiles = files.filter(file => file.endsWith('.metadata.json'))

      const backups: BackupMetadata[] = []

      for (const file of metadataFiles) {
        try {
          const metadataPath = join(this.storageLocation, file)
          const metadataContent = await fs.readFile(metadataPath, 'utf8')
          const metadata: BackupMetadata = JSON.parse(metadataContent)
          backups.push(metadata)
        } catch (error) {
          // Skip corrupted metadata files
          console.warn(`Skipping corrupted metadata file: ${file}`, error)
        }
      }

      // Sort by timestamp (newest first)
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    } catch (error) {
      throw new Error(`Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete a backup
   */
  async delete(backupId: string): Promise<void> {
    try {
      const backupPath = this.getBackupPath(backupId)
      const metadataPath = this.getMetadataPath(backupId)

      // Delete backup file
      try {
        await fs.unlink(backupPath)
      } catch (error) {
        // File might not exist, continue with metadata deletion
      }

      // Delete metadata file
      try {
        await fs.unlink(metadataPath)
      } catch (error) {
        // File might not exist
      }

    } catch (error) {
      throw new Error(`Failed to delete backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Compress backup data
   */
  async compress(data: BackupData): Promise<CompressedBackup> {
    const serializedData = JSON.stringify(data)
    const originalSize = Buffer.byteLength(serializedData, 'utf8')
    const compressedData = await gzipAsync(Buffer.from(serializedData, 'utf8'))

    return {
      metadata: data.metadata,
      compressedData,
      compressionAlgorithm: 'gzip',
      originalSize,
      compressedSize: compressedData.length
    }
  }

  /**
   * Decompress backup data
   */
  async decompress(compressed: CompressedBackup): Promise<BackupData> {
    const decompressedData = await gunzipAsync(compressed.compressedData)
    return JSON.parse(decompressedData.toString('utf8'))
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.storageLocation, { recursive: true })
    } catch (error) {
      throw new Error(`Failed to create storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `backup-${timestamp}-${random}`
  }

  /**
   * Get backup file path
   */
  private getBackupPath(backupId: string): string {
    return join(this.storageLocation, `${backupId}.backup`)
  }

  /**
   * Get metadata file path
   */
  private getMetadataPath(backupId: string): string {
    return join(this.storageLocation, `${backupId}.metadata.json`)
  }

  /**
   * Calculate checksum for backup data
   */
  private calculateChecksum(backupData: BackupData): string {
    // Create a copy without the integrity field to avoid circular dependencies
    const dataForChecksum = {
      ...backupData,
      metadata: {
        ...backupData.metadata,
        integrity: {
          ...backupData.metadata.integrity,
          checksum: '',
          verified: false,
          lastVerification: new Date(0)
        }
      }
    }

    const serialized = JSON.stringify(dataForChecksum)
    return createHash('sha256').update(serialized).digest('hex')
  }
}