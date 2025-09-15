/**
 * FileSystemMonitor Tests
 * 
 * Comprehensive test suite for the FileSystemMonitor service covering:
 * - Real-time file system monitoring and change detection
 * - Conflict detection for concurrent operations
 * - File state capture and validation
 * - Performance monitoring for large directory structures
 * - Error handling and recovery scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FileSystemMonitor } from '../FileSystemMonitor'
import {
  FileOperation,
  FileConflict,
  FileSystemState,
  FileStateInfo,
  SafetyError,
  SafetyErrorCode,
  ConflictType,
  ConflictSeverity
} from '../types'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { EventEmitter } from 'events'

// Mock filesystem operations
vi.mock('fs/promises')
vi.mock('fs')
vi.mock('path')
vi.mock('crypto')

describe('FileSystemMonitor', () => {
  let monitor: FileSystemMonitor
  let mockFs: any
  let mockFsSync: any
  let mockPath: any
  let mockCrypto: any
  let mockWatcher: EventEmitter

  beforeEach(() => {
    mockFs = vi.mocked(fs)
    mockFsSync = vi.mocked(fsSync)
    mockPath = vi.mocked(path)
    mockCrypto = vi.mocked(crypto)
    
    // Create mock watcher with close method and callback storage
    mockWatcher = new EventEmitter()
    ;(mockWatcher as any).close = vi.fn()
    ;(mockWatcher as any)._callback = null
    
    // Mock fs.watch to capture the callback and store it on the watcher
    mockFsSync.watch = vi.fn().mockImplementation((path: string, options: any, callback: Function) => {
      ;(mockWatcher as any)._callback = callback
      return mockWatcher
    })
    
    // Override the emit method to also call the stored callback
    const originalEmit = mockWatcher.emit.bind(mockWatcher)
    mockWatcher.emit = vi.fn().mockImplementation((event: string, ...args: any[]) => {
      const result = originalEmit(event, ...args)
      
      // If this is a file system event and we have a callback, call it
      if ((event === 'change' || event === 'rename') && (mockWatcher as any)._callback) {
        ;(mockWatcher as any)._callback(event, args[0])
      }
      
      return result
    })
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup crypto mocks
    const mockHash = {
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('098f6bcd4621d373cade4e832627b4f6')
    }
    mockCrypto.createHash = vi.fn().mockReturnValue(mockHash)
    
    // Setup default mock implementations
    mockFs.stat.mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      size: 1024,
      mtime: new Date('2024-01-01T10:00:00Z'),
      ctime: new Date('2024-01-01T09:00:00Z'),
      atime: new Date('2024-01-01T11:00:00Z'),
      mode: 0o644
    } as any)
    
    mockFs.access.mockResolvedValue(undefined)
    mockFs.readFile.mockResolvedValue('file content')
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'))
    mockPath.dirname.mockImplementation((p: string) => p.split('/').slice(0, -1).join('/'))
    mockPath.basename.mockImplementation((p: string) => p.split('/').pop() || '')
    mockPath.resolve.mockImplementation((p: string) => p.startsWith('/') ? p : `/resolved${p}`)
    mockPath.isAbsolute.mockImplementation((p: string) => p.startsWith('/'))

    monitor = new FileSystemMonitor()
  })

  afterEach(async () => {
    await monitor.stopMonitoring()
    vi.resetAllMocks()
  })

  describe('Initialization and Configuration', () => {
    it('should create monitor with default configuration', () => {
      expect(monitor).toBeInstanceOf(FileSystemMonitor)
    })

    it('should start monitoring specified paths', async () => {
      const paths = ['/test/path1', '/test/path2']
      
      await monitor.startMonitoring(paths)
      
      expect(mockFsSync.watch).toHaveBeenCalledTimes(2)
      expect(mockFsSync.watch).toHaveBeenCalledWith('/test/path1', expect.any(Object), expect.any(Function))
      expect(mockFsSync.watch).toHaveBeenCalledWith('/test/path2', expect.any(Object), expect.any(Function))
    })

    it('should stop monitoring and clean up watchers', async () => {
      const mockClose: () => void = vi.fn()
      ;(mockWatcher as any).close = mockClose
      
      await monitor.startMonitoring(['/test/path'])
      await monitor.stopMonitoring()
      
      expect(mockClose).toHaveBeenCalled()
    })

    it('should handle monitoring errors gracefully', async () => {
      mockFsSync.watch.mockImplementation(() => {
        throw new Error('Permission denied')
      })
      
      await expect(monitor.startMonitoring(['/restricted/path']))
        .rejects.toThrow('Failed to watch path: /restricted/path')
    })

    it('should configure monitoring options', async () => {
      const options = {
        recursive: true,
        interval: 500,
        ignoreHidden: true,
        excludePatterns: ['*.tmp', 'node_modules']
      }
      
      await monitor.startMonitoring(['/test/path'], options)
      
      const watchCall = mockFsSync.watch.mock.calls[0]
      expect(watchCall[1]).toMatchObject({
        recursive: true,
        persistent: true
      })
    })
  })

  describe('File State Capture and Management', () => {
    beforeEach(async () => {
      await monitor.startMonitoring(['/test'])
    })

    it('should capture file state for single file', async () => {
      const filePath = '/test/file.txt'
      
      const state = await monitor.captureState(filePath)
      
      expect(state).toEqual({
        path: filePath,
        exists: true,
        isFile: true,
        isDirectory: false,
        size: 1024,
        mtime: new Date('2024-01-01T10:00:00Z'),
        checksum: expect.any(String),
        permissions: {
          readable: true,
          writable: true,
          executable: true
        }
      })
      expect(mockFs.stat).toHaveBeenCalledWith(filePath)
    })

    it('should capture state for directory', async () => {
      const dirPath = '/test/directory'
      mockFs.stat.mockResolvedValueOnce({
        isFile: () => false,
        isDirectory: () => true,
        size: 4096,
        mtime: new Date('2024-01-01T10:00:00Z'),
        ctime: new Date('2024-01-01T09:00:00Z'),
        atime: new Date('2024-01-01T11:00:00Z'),
        mode: 0o755
      } as any)
      
      const state = await monitor.captureState(dirPath)
      
      expect(state).toMatchObject({
        path: dirPath,
        exists: true,
        isFile: false,
        isDirectory: true,
        size: 4096
      })
    })

    it('should handle non-existent files', async () => {
      const filePath = '/test/nonexistent.txt'
      mockFs.access.mockRejectedValueOnce(new Error('ENOENT'))
      mockFs.stat.mockRejectedValueOnce(new Error('ENOENT'))
      
      const state = await monitor.captureState(filePath)
      
      expect(state).toEqual({
        path: filePath,
        exists: false,
        isFile: false,
        isDirectory: false,
        size: 0,
        mtime: null,
        checksum: null,
        permissions: {
          readable: false,
          writable: false,
          executable: false
        }
      })
    })

    it('should calculate file checksums correctly', async () => {
      const filePath = '/test/file.txt'
      mockFs.readFile.mockResolvedValueOnce('test content')
      
      const state = await monitor.captureState(filePath)
      
      expect(state.checksum).toBe('098f6bcd4621d373cade4e832627b4f6') // MD5 of 'test content'
    })

    it('should cache file states for performance', async () => {
      const filePath = '/test/file.txt'
      
      await monitor.captureState(filePath)
      await monitor.captureState(filePath)
      
      // Should only call stat once due to caching
      expect(mockFs.stat).toHaveBeenCalledTimes(1)
    })

    it('should invalidate cache when file changes detected', async () => {
      const filePath = '/test/file.txt'
      
      await monitor.captureState(filePath)
      
      // Simulate file change event - emit will now trigger the callback
      mockWatcher.emit('change', 'file.txt')
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await monitor.captureState(filePath)
      
      expect(mockFs.stat).toHaveBeenCalledTimes(2)
    })
  })

  describe('Conflict Detection', () => {
    let operation: FileOperation

    beforeEach(async () => {
      await monitor.startMonitoring(['/test'])
      
      operation = {
        id: 'op-1',
        type: 'move',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        safetyLevel: 'enhanced',
        timestamp: new Date()
      }
    })

    it('should detect no conflicts for safe operation', async () => {
      // Target doesn't exist, source exists
      mockFs.access.mockImplementation(async (path: string) => {
        if (path === '/test/target.txt') {
          throw new Error('ENOENT')
        }
        return undefined
      })
      mockFs.stat.mockImplementation(async (path: string) => {
        if (path === '/test/target.txt') {
          throw new Error('ENOENT')
        }
        return {
          isFile: () => true,
          isDirectory: () => false,
          size: 1024,
          mtime: new Date('2024-01-01T10:00:00Z'),
          mode: 0o644
        }
      })
      
      const conflicts = await monitor.detectConflicts(operation)
      
      expect(conflicts).toHaveLength(0)
    })

    it('should detect file exists conflict', async () => {
      // Both source and target exist
      mockFs.access.mockResolvedValue(undefined)
      
      const conflicts = await monitor.detectConflicts(operation)
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0]).toMatchObject({
        id: expect.any(String),
        type: 'file_exists',
        operation,
        conflictingPath: '/test/target.txt',
        severity: 'medium',
        detectedAt: expect.any(Date)
      })
    })

    it('should detect concurrent modification conflict', async () => {
      const operation: FileOperation = {
        id: 'op-2',
        type: 'update',
        sourceePath: '/test/file.txt',
        safetyLevel: 'maximum',
        timestamp: new Date()
      }
      
      // File was modified after operation started
      mockFs.stat.mockResolvedValueOnce({
        isFile: () => true,
        mtime: new Date(Date.now() + 1000), // Modified after operation timestamp
        size: 1024,
        mode: 0o644
      } as any)
      
      const conflicts = await monitor.detectConflicts(operation)
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('concurrent_modification')
      expect(conflicts[0].severity).toBe('high')
    })

    it('should detect permission conflicts', async () => {
      const operation: FileOperation = {
        id: 'op-3',
        type: 'delete',
        sourceePath: '/test/readonly.txt',
        safetyLevel: 'enhanced',
        timestamp: new Date()
      }
      
      mockFs.stat.mockResolvedValueOnce({
        isFile: () => true,
        mtime: new Date(),
        size: 1024,
        mode: 0o444 // Read-only file
      } as any)
      
      const conflicts = await monitor.detectConflicts(operation)
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('permission_denied')
      expect(conflicts[0].severity).toBe('high')
    })

    it('should detect path length conflicts', async () => {
      const longPath = '/test/' + 'a'.repeat(260) + '.txt'
      const operation: FileOperation = {
        id: 'op-4',
        type: 'create',
        sourceePath: longPath,
        safetyLevel: 'basic',
        timestamp: new Date()
      }
      
      const conflicts = await monitor.detectConflicts(operation)
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('path_too_long')
      expect(conflicts[0].severity).toBe('medium')
    })

    it('should detect disk space conflicts', async () => {
      const operation: FileOperation = {
        id: 'op-5',
        type: 'copy',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        safetyLevel: 'enhanced',
        timestamp: new Date()
      }
      
      // Mock file size that exceeds available space
      mockFs.stat.mockResolvedValueOnce({
        isFile: () => true,
        size: 10 * 1024 * 1024 * 1024, // 10GB file
        mtime: new Date(),
        mode: 0o644
      } as any)
      
      // Mock disk space check
      const originalStatfs = mockFs.statfs
      mockFs.statfs = vi.fn().mockResolvedValue({
        bavail: 1024, // Only 1MB available
        bsize: 1024
      })
      
      const conflicts = await monitor.detectConflicts(operation)
      
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].type).toBe('insufficient_space')
      expect(conflicts[0].severity).toBe('critical')
      
      mockFs.statfs = originalStatfs
    })

    it('should aggregate multiple conflicts', async () => {
      const operation: FileOperation = {
        id: 'op-6',
        type: 'move',
        sourceePath: '/test/readonly.txt',
        targetPath: '/test/existing.txt',
        safetyLevel: 'maximum',
        timestamp: new Date()
      }
      
      // Setup conditions for multiple conflicts
      mockFs.access.mockResolvedValue(undefined) // Both files exist
      mockFs.stat.mockImplementation(async (path: string) => ({
        isFile: () => true,
        mtime: path === '/test/readonly.txt' ? new Date() : new Date(Date.now() + 1000),
        size: 1024,
        mode: path === '/test/readonly.txt' ? 0o444 : 0o644 // Source is readonly
      } as any))
      
      const conflicts = await monitor.detectConflicts(operation)
      
      expect(conflicts.length).toBeGreaterThan(1)
      expect(conflicts.some((c: any) => c.type === 'file_exists')).toBe(true)
      expect(conflicts.some((c: any) => c.type === 'permission_denied')).toBe(true)
    })
  })

  describe('Real-time Change Detection', () => {
    beforeEach(async () => {
      await monitor.startMonitoring(['/test'])
    })

    it('should emit change events for file modifications', async () => {
      const changeCallback = vi.fn()
      monitor.onFileChanged(changeCallback)
      
      // Simulate file change
      mockWatcher.emit('change', 'file.txt')
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(changeCallback).toHaveBeenCalledWith({
        type: 'change',
        path: expect.stringContaining('file.txt'),
        timestamp: expect.any(Date)
      })
    })

    it('should emit rename events for file moves', async () => {
      const changeCallback = vi.fn()
      monitor.onFileChanged(changeCallback)
      
      // Simulate file rename
      mockWatcher.emit('rename', 'oldfile.txt')
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(changeCallback).toHaveBeenCalledWith({
        type: 'rename',
        path: expect.stringContaining('oldfile.txt'),
        timestamp: expect.any(Date)
      })
    })

    it('should debounce rapid file changes', async () => {
      const changeCallback = vi.fn()
      monitor.onFileChanged(changeCallback)
      
      // Simulate rapid changes to same file
      mockWatcher.emit('change', 'file.txt')
      mockWatcher.emit('change', 'file.txt')
      mockWatcher.emit('change', 'file.txt')
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should only emit once due to debouncing
      expect(changeCallback).toHaveBeenCalledTimes(1)
    })

    it('should handle watcher errors gracefully', async () => {
      const errorCallback = vi.fn()
      monitor.onError(errorCallback)
      
      // Simulate watcher error
      mockWatcher.emit('error', new Error('Watch failed'))
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(errorCallback).toHaveBeenCalledWith(expect.any(SafetyError))
    })
  })

  describe('Conflict Resolution Support', () => {
    beforeEach(async () => {
      await monitor.startMonitoring(['/test'])
    })

    it('should suggest automatic conflict resolution', async () => {
      const conflict: FileConflict = {
        id: 'conflict-1',
        type: 'file_exists',
        operation: {
          id: 'op-1',
          type: 'copy',
          sourceePath: '/test/source.txt',
          targetPath: '/test/target.txt',
          safetyLevel: 'enhanced',
          timestamp: new Date()
        },
        conflictingPath: '/test/target.txt',
        severity: 'medium',
        detectedAt: new Date()
      }
      
      const resolution = await monitor.suggestResolution(conflict)
      
      expect(resolution).toMatchObject({
        strategy: 'rename',
        suggestedPath: expect.stringContaining('/test/target'),
        automatic: true,
        confidence: expect.any(Number)
      })
    })

    it('should require manual resolution for critical conflicts', async () => {
      const conflict: FileConflict = {
        id: 'conflict-2',
        type: 'concurrent_modification',
        operation: {
          id: 'op-2',
          type: 'update',
          sourceePath: '/test/important.txt',
          safetyLevel: 'maximum',
          timestamp: new Date()
        },
        conflictingPath: '/test/important.txt',
        severity: 'critical',
        detectedAt: new Date()
      }
      
      const resolution = await monitor.suggestResolution(conflict)
      
      expect(resolution).toMatchObject({
        strategy: 'manual',
        automatic: false,
        confidence: 0,
        requiresUserInput: true
      })
    })

    it('should validate proposed conflict resolutions', async () => {
      const conflict: FileConflict = {
        id: 'conflict-3',
        type: 'file_exists',
        operation: {
          id: 'op-3',
          type: 'move',
          sourceePath: '/test/source.txt',
          targetPath: '/test/target.txt',
          safetyLevel: 'enhanced',
          timestamp: new Date()
        },
        conflictingPath: '/test/target.txt',
        severity: 'medium',
        detectedAt: new Date()
      }
      
      const resolution = {
        strategy: 'rename' as const,
        suggestedPath: '/test/target_backup.txt',
        automatic: true,
        confidence: 0.8
      }
      
      const isValid = await monitor.validateResolution(conflict, resolution)
      
      expect(isValid).toBe(true)
    })
  })

  describe('Performance and Optimization', () => {
    beforeEach(async () => {
      await monitor.startMonitoring(['/test'])
    })

    it('should handle monitoring of large directory trees efficiently', async () => {
      // Stop existing monitoring first to get clean call count
      await monitor.stopMonitoring()
      vi.clearAllMocks()
      
      const largePaths = Array.from({ length: 1000 }, (_, i) => `/test/dir${i}`)
      
      const startTime = Date.now()
      await monitor.startMonitoring(largePaths)
      const duration = Date.now() - startTime
      
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(mockFsSync.watch).toHaveBeenCalledTimes(1000)
    })

    it('should efficiently detect conflicts in bulk operations', async () => {
      const operations: FileOperation[] = Array.from({ length: 100 }, (_, i) => ({
        id: `op-${i}`,
        type: 'create',
        sourceePath: `/test/file${i}.txt`,
        safetyLevel: 'basic',
        timestamp: new Date()
      }))
      
      const startTime = Date.now()
      const results = await Promise.all(
        operations.map(op => monitor.detectConflicts(op))
      )
      const duration = Date.now() - startTime
      
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
      expect(results).toHaveLength(100)
    })

    it('should manage memory usage with state cache limits', async () => {
      // Capture state for many files to test cache limits
      const filePaths = Array.from({ length: 1000 }, (_, i) => `/test/file${i}.txt`)
      
      for (const filePath of filePaths) {
        await monitor.captureState(filePath)
      }
      
      const cacheSize = await monitor.getCacheSize()
      expect(cacheSize).toBeLessThanOrEqual(500) // Should limit cache size
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle filesystem access errors gracefully', async () => {
      mockFs.stat.mockRejectedValue(new Error('Permission denied'))
      
      await expect(monitor.captureState('/restricted/file.txt'))
        .rejects.toThrow('Failed to capture file state')
    })

    it('should recover from watcher failures', async () => {
      await monitor.startMonitoring(['/test'])
      
      // Simulate watcher failure
      mockWatcher.emit('error', new Error('Watch failed'))
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Should automatically restart monitoring
      expect(mockFsSync.watch).toHaveBeenCalledTimes(2) // Initial + restart
    })

    it('should handle network drive disconnections', async () => {
      const networkPath = '/server/share/folder'
      mockFsSync.watch.mockImplementation(() => {
        throw new Error('Network path not found')
      })
      
      await expect(monitor.startMonitoring([networkPath]))
        .rejects.toThrow('Failed to watch path')
    })

    it('should validate file paths before operations', async () => {
      const invalidPaths = [
        '', // Empty path
        '/test/file\x00.txt', // Null character
        'relative/path' // Relative path
      ]
      
      for (const invalidPath of invalidPaths) {
        await expect(monitor.captureState(invalidPath))
          .rejects.toThrow('Failed to capture file state')
      }
    })

    it('should handle system resource exhaustion', async () => {
      // Mock system running out of file descriptors
      mockFsSync.watch.mockImplementation(() => {
        throw new Error('EMFILE: too many open files')
      })
      
      await expect(monitor.startMonitoring(['/test']))
        .rejects.toThrow('Failed to watch path')
    })
  })

  describe('Integration with Safety System', () => {
    it('should integrate with transaction manager for conflict checking', async () => {
      const operation: FileOperation = {
        id: 'op-1',
        type: 'move',
        sourceePath: '/test/source.txt',
        targetPath: '/test/target.txt',
        safetyLevel: 'enhanced',
        timestamp: new Date(),
      }
      
      await monitor.startMonitoring(['/test'])
      const conflicts = await monitor.detectConflicts(operation)
      
      expect(conflicts).toBeInstanceOf(Array)
      // Should check for conflicts specific to the transaction
    })

    it('should provide state information for rollback operations', async () => {
      const filePath = '/test/file.txt'
      
      await monitor.startMonitoring(['/test'])
      const beforeState = await monitor.captureState(filePath)
      
      expect(beforeState).toMatchObject({
        path: filePath,
        exists: expect.any(Boolean),
        checksum: expect.any(String)
      })
    })

    it('should emit events for safety system coordination', async () => {
      const eventCallback = vi.fn()
      monitor.onSafetyEvent(eventCallback)
      
      await monitor.startMonitoring(['/test'])
      
      // Simulate critical conflict detection
      const operation: FileOperation = {
        id: 'op-1',
        type: 'delete',
        sourceePath: '/test/system-file.txt',
        safetyLevel: 'maximum',
        timestamp: new Date()
      }
      
      await monitor.detectConflicts(operation)
      
      expect(eventCallback).toHaveBeenCalledWith({
        type: 'conflict_detected',
        severity: 'critical',
        operation,
        timestamp: expect.any(Date)
      })
    })
  })
})