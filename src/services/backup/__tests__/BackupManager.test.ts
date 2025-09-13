import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BackupManager } from '../BackupManager'
import { BackupStorage } from '../BackupStorage'
import { RestoreEngine } from '../RestoreEngine'
import { BackupStrategy } from '../strategies/BackupStrategy'
import type {
  BackupMetadata,
  BackupOptions,
  RestoreOptions,
  OrganizationOperation,
  BackupResult,
  RestoreResult,
  BackupType
} from '../types'

// Mock dependencies
vi.mock('../BackupStorage')
vi.mock('../RestoreEngine')
vi.mock('../strategies/FullBackupStrategy')

describe('BackupManager', () => {
  let backupManager: BackupManager
  let mockStorage: BackupStorage
  let mockRestoreEngine: RestoreEngine
  let mockStrategy: BackupStrategy

  beforeEach(() => {
    mockStorage = new BackupStorage('/test/backups')
    mockRestoreEngine = new RestoreEngine(mockStorage)
    mockStrategy = {
      type: 'full',
      createBackup: vi.fn(),
      estimateSize: vi.fn(),
      estimateTime: vi.fn()
    } as any

    // Create a map with the same mocked strategy for all types
    const mockStrategies = new Map<BackupType, BackupStrategy>([
      ['full', mockStrategy],
      ['incremental', mockStrategy],
      ['metadata', mockStrategy]
    ])

    backupManager = new BackupManager({
      storage: mockStorage,
      restoreEngine: mockRestoreEngine,
      defaultStrategy: mockStrategy,
      strategies: mockStrategies
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createBackup', () => {
    it('should create a backup successfully', async () => {
      const operation: OrganizationOperation = {
        type: 'reorganization',
        targetPath: '/test/path',
        changes: [
          { type: 'move', from: '/test/path/file1.txt', to: '/test/organized/file1.txt' }
        ],
        timestamp: new Date()
      }

      const expectedBackup: BackupResult = {
        id: 'backup-123',
        metadata: {
          id: 'backup-123',
          timestamp: new Date(),
          type: 'full',
          targetPath: '/test/path',
          size: 1024,
          compressionRatio: 0.8,
          operationType: 'reorganization',
          tags: [],
          integrity: {
            checksum: 'abc123',
            verified: true,
            lastVerification: new Date()
          }
        },
        success: true,
        duration: 1000
      }

      vi.mocked(mockStrategy.createBackup).mockResolvedValue({
        metadata: expectedBackup.metadata!,
        structure: { root: '/test/path', tree: [] },
        files: [],
        permissions: [],
        settings: {
          version: '1.0.0',
          settings: {},
          timestamp: new Date()
        }
      })

      vi.mocked(mockStorage.store).mockResolvedValue('backup-123')

      const result = await backupManager.createBackup(operation)

      expect(result.success).toBe(true)
      expect(result.id).toBe('backup-123')
      expect(mockStrategy.createBackup).toHaveBeenCalledWith('/test/path', expect.any(Object))
      expect(mockStorage.store).toHaveBeenCalled()
    })

    it('should handle backup creation failure', async () => {
      const operation: OrganizationOperation = {
        type: 'reorganization',
        targetPath: '/test/path',
        changes: [],
        timestamp: new Date()
      }

      vi.mocked(mockStrategy.createBackup).mockRejectedValue(new Error('Storage full'))

      const result = await backupManager.createBackup(operation)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage full')
    })

    it('should use custom backup options', async () => {
      const operation: OrganizationOperation = {
        type: 'manual',
        targetPath: '/test/path',
        changes: [],
        timestamp: new Date()
      }

      const options: BackupOptions = {
        type: 'incremental',
        includeContent: false,
        compression: true,
        description: 'Manual backup'
      }

      vi.mocked(mockStrategy.createBackup).mockResolvedValue({
        metadata: {
          id: 'backup-456',
          timestamp: new Date(),
          type: 'incremental',
          targetPath: '/test/path',
          size: 512,
          compressionRatio: 0.9,
          operationType: 'manual',
          description: 'Manual backup',
          tags: [],
          integrity: {
            checksum: 'def456',
            verified: true,
            lastVerification: new Date()
          }
        },
        structure: { root: '/test/path', tree: [] },
        files: [],
        permissions: [],
        settings: {
          version: '1.0.0',
          settings: {},
          timestamp: new Date()
        }
      })

      vi.mocked(mockStorage.store).mockResolvedValue('backup-456')

      const result = await backupManager.createBackup(operation, options)

      expect(result.success).toBe(true)
      expect(mockStrategy.createBackup).toHaveBeenCalledWith(
        '/test/path',
        expect.objectContaining({
          operation: expect.objectContaining({
            type: 'manual',
            targetPath: '/test/path'
          }),
          options: expect.objectContaining({
            type: 'incremental',
            includeContent: false,
            compression: true,
            description: 'Manual backup'
          }),
          sessionId: expect.any(String)
        })
      )
    })
  })

  describe('listBackups', () => {
    it('should return list of available backups', async () => {
      const mockBackups: BackupMetadata[] = [
        {
          id: 'backup-1',
          timestamp: new Date('2023-01-01'),
          type: 'full',
          targetPath: '/test/path1',
          size: 1024,
          compressionRatio: 0.8,
          operationType: 'reorganization',
          tags: ['auto'],
          integrity: {
            checksum: 'abc123',
            verified: true,
            lastVerification: new Date()
          }
        },
        {
          id: 'backup-2',
          timestamp: new Date('2023-01-02'),
          type: 'incremental',
          targetPath: '/test/path2',
          size: 512,
          compressionRatio: 0.9,
          operationType: 'manual',
          tags: ['user'],
          integrity: {
            checksum: 'def456',
            verified: true,
            lastVerification: new Date()
          }
        }
      ]

      vi.mocked(mockStorage.list).mockResolvedValue(mockBackups)

      const result = await backupManager.listBackups()

      expect(result).toEqual(mockBackups)
      expect(mockStorage.list).toHaveBeenCalled()
    })

    it('should filter backups by criteria', async () => {
      const allBackups: BackupMetadata[] = [
        {
          id: 'backup-1',
          timestamp: new Date('2023-01-01'),
          type: 'full',
          targetPath: '/test/path1',
          size: 1024,
          compressionRatio: 0.8,
          operationType: 'reorganization',
          tags: ['auto'],
          integrity: {
            checksum: 'abc123',
            verified: true,
            lastVerification: new Date()
          }
        },
        {
          id: 'backup-2',
          timestamp: new Date('2023-01-02'),
          type: 'full',
          targetPath: '/test/path2',
          size: 512,
          compressionRatio: 0.9,
          operationType: 'manual',
          tags: ['user'],
          integrity: {
            checksum: 'def456',
            verified: true,
            lastVerification: new Date()
          }
        }
      ]

      vi.mocked(mockStorage.list).mockResolvedValue(allBackups)

      const result = await backupManager.listBackups({
        targetPath: '/test/path1'
      })

      expect(result).toHaveLength(1)
      expect(result[0].targetPath).toBe('/test/path1')
    })
  })

  describe('restoreBackup', () => {
    it('should restore backup successfully', async () => {
      const backupId = 'backup-123'
      const expectedResult: RestoreResult = {
        success: true,
        backupId,
        restoredFiles: 5,
        conflicts: [],
        duration: 2000
      }

      vi.mocked(mockRestoreEngine.executeRestore).mockResolvedValue(expectedResult)

      const result = await backupManager.restoreBackup(backupId)

      expect(result.success).toBe(true)
      expect(result.backupId).toBe(backupId)
      expect(mockRestoreEngine.executeRestore).toHaveBeenCalled()
    })

    it('should handle restore conflicts', async () => {
      const backupId = 'backup-123'
      const options: RestoreOptions = {
        conflictResolution: 'prompt',
        targetPath: '/test/restore'
      }

      const resultWithConflicts: RestoreResult = {
        success: false,
        backupId,
        restoredFiles: 0,
        conflicts: [
          {
            type: 'exists',
            currentPath: '/test/restore/file1.txt',
            backupPath: '/test/path/file1.txt',
            severity: 'medium'
          }
        ],
        duration: 500
      }

      vi.mocked(mockRestoreEngine.executeRestore).mockResolvedValue(resultWithConflicts)

      const result = await backupManager.restoreBackup(backupId, options)

      expect(result.success).toBe(false)
      expect(result.conflicts).toHaveLength(1)
      expect(mockRestoreEngine.executeRestore).toHaveBeenCalledWith(
        expect.objectContaining({
          backupId,
          restoreType: 'full'
        })
      )
    })

    it('should handle selective restore', async () => {
      const backupId = 'backup-123'
      const options: RestoreOptions = {
        selective: ['/test/path/important.txt'],
        targetPath: '/test/restore'
      }

      const expectedResult: RestoreResult = {
        success: true,
        backupId,
        restoredFiles: 1,
        conflicts: [],
        duration: 500
      }

      vi.mocked(mockRestoreEngine.executeRestore).mockResolvedValue(expectedResult)

      const result = await backupManager.restoreBackup(backupId, options)

      expect(result.success).toBe(true)
      expect(result.restoredFiles).toBe(1)
    })
  })

  describe('deleteBackup', () => {
    it('should delete backup successfully', async () => {
      vi.mocked(mockStorage.delete).mockResolvedValue()

      await backupManager.deleteBackup('backup-123')

      expect(mockStorage.delete).toHaveBeenCalledWith('backup-123')
    })

    it('should handle deletion errors', async () => {
      vi.mocked(mockStorage.delete).mockRejectedValue(new Error('Backup not found'))

      await expect(backupManager.deleteBackup('nonexistent')).rejects.toThrow('Backup not found')
    })
  })

  describe('validateBackup', () => {
    it('should validate backup integrity', async () => {
      const backupId = 'backup-123'
      
      vi.mocked(mockStorage.retrieve).mockResolvedValue({
        metadata: {
          id: backupId,
          timestamp: new Date(),
          type: 'full',
          targetPath: '/test/path',
          size: 1024,
          compressionRatio: 0.8,
          operationType: 'reorganization',
          tags: [],
          integrity: {
            checksum: 'abc123',
            verified: false,
            lastVerification: new Date(0)
          }
        },
        structure: { root: '/test/path', tree: [] },
        files: [],
        permissions: [],
        settings: {
          version: '1.0.0',
          settings: {},
          timestamp: new Date()
        }
      })

      const result = await backupManager.validateBackup(backupId)

      expect(result.valid).toBe(true)
      expect(result.checksumMatch).toBe(true)
      expect(mockStorage.retrieve).toHaveBeenCalledWith(backupId)
    })

    it('should detect corrupted backup', async () => {
      const backupId = 'backup-corrupted'
      
      vi.mocked(mockStorage.retrieve).mockRejectedValue(new Error('Checksum mismatch'))

      const result = await backupManager.validateBackup(backupId)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Checksum mismatch')
    })
  })

  describe('integration scenarios', () => {
    it('should handle backup-restore cycle', async () => {
      // Create backup
      const operation: OrganizationOperation = {
        type: 'reorganization',
        targetPath: '/test/path',
        changes: [
          { type: 'move', from: '/test/path/file1.txt', to: '/test/organized/file1.txt' }
        ],
        timestamp: new Date()
      }

      const backupData = {
        metadata: {
          id: 'backup-cycle',
          timestamp: new Date(),
          type: 'full' as const,
          targetPath: '/test/path',
          size: 1024,
          compressionRatio: 0.8,
          operationType: 'reorganization' as const,
          tags: [],
          integrity: {
            checksum: 'abc123',
            verified: true,
            lastVerification: new Date()
          }
        },
        structure: { root: '/test/path', tree: [] },
        files: [],
        permissions: [],
        settings: {
          version: '1.0.0',
          settings: {},
          timestamp: new Date()
        }
      }

      vi.mocked(mockStrategy.createBackup).mockResolvedValue(backupData)
      vi.mocked(mockStorage.store).mockResolvedValue('backup-cycle')
      
      const backupResult = await backupManager.createBackup(operation)
      expect(backupResult.success).toBe(true)

      // Restore backup
      vi.mocked(mockRestoreEngine.executeRestore).mockResolvedValue({
        success: true,
        backupId: 'backup-cycle',
        restoredFiles: 1,
        conflicts: [],
        duration: 1000
      })

      const restoreResult = await backupManager.restoreBackup('backup-cycle')
      expect(restoreResult.success).toBe(true)
      expect(restoreResult.restoredFiles).toBe(1)
    })

    it('should handle backup cleanup workflow', async () => {
      const oldBackups: BackupMetadata[] = [
        {
          id: 'backup-old',
          timestamp: new Date('2023-01-01'),
          type: 'full',
          targetPath: '/test/path',
          size: 1024,
          compressionRatio: 0.8,
          operationType: 'reorganization',
          tags: ['auto', 'expired'],
          integrity: {
            checksum: 'old123',
            verified: true,
            lastVerification: new Date()
          }
        }
      ]

      vi.mocked(mockStorage.list).mockResolvedValue(oldBackups)
      vi.mocked(mockStorage.delete).mockResolvedValue()

      const backups = await backupManager.listBackups()
      expect(backups).toHaveLength(1)

      await backupManager.deleteBackup('backup-old')
      expect(mockStorage.delete).toHaveBeenCalledWith('backup-old')
    })
  })
})