import { promises as fs } from 'fs'
import { join, relative } from 'path'
import { BackupStrategy } from './BackupStrategy'
import type {
  BackupData,
  BackupContext,
  DirectoryStructure,
  DirectoryNode,
  FileBackupEntry,
  FileMetadata,
  DirectoryMetadata,
  FilePermissions,
  PermissionBackup
} from '../types'

/**
 * FullBackupStrategy - Creates complete backups with all file data
 * 
 * This strategy creates comprehensive backups that include:
 * - Complete directory structure
 * - All file metadata (timestamps, permissions, sizes)
 * - Content of small files (< 1MB by default)
 * - Checksums for all files for integrity verification
 * 
 * Best for: Small to medium directories, critical operations requiring maximum safety
 */
export class FullBackupStrategy extends BackupStrategy {
  readonly type = 'full' as const
  
  private readonly maxFileSize = 1024 * 1024 // 1MB - files larger than this won't have content stored
  private readonly excludePatterns = [
    /\.DS_Store$/,
    /Thumbs\.db$/,
    /\.tmp$/,
    /\.temp$/,
    /~\$.*/, // Office temporary files
  ]

  /**
   * Create a full backup of the target directory
   */
  async createBackup(targetPath: string, context: BackupContext): Promise<BackupData> {
    try {
      // Scan directory structure
      const structure = await this.scanDirectoryStructure(targetPath)
      
      // Collect all files
      const files = await this.collectFiles(targetPath, context)
      
      // Collect permissions
      const permissions = await this.collectPermissions(targetPath)
      
      // Calculate total size
      const totalSize = this.calculateTotalSize(files)
      
      // Generate metadata
      const metadata = this.generateMetadata(targetPath, context, totalSize)
      
      // Create settings snapshot
      const settings = this.createSettingsSnapshot()

      return {
        metadata,
        structure,
        files,
        permissions,
        settings
      }

    } catch (error) {
      throw new Error(`Failed to create full backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Estimate the size of a full backup
   */
  async estimateSize(targetPath: string): Promise<number> {
    try {
      let totalSize = 0
      
      // Recursively calculate directory size
      const stats = await fs.stat(targetPath)
      if (!stats.isDirectory()) {
        return stats.size
      }

      const entries = await fs.readdir(targetPath)
      
      for (const entry of entries) {
        if (this.shouldExcludeFile(entry)) continue
        
        const entryPath = join(targetPath, entry)
        const entryStats = await fs.stat(entryPath)
        
        if (entryStats.isDirectory()) {
          totalSize += await this.estimateSize(entryPath)
        } else {
          // For small files, include full content in backup
          if (entryStats.size <= this.maxFileSize) {
            totalSize += entryStats.size
          }
          // Always include metadata overhead
          totalSize += 1024 // Approximate metadata size per file
        }
      }

      return totalSize

    } catch (error) {
      return 0 // Return 0 if can't estimate
    }
  }

  /**
   * Estimate time required for backup creation
   */
  async estimateTime(targetPath: string): Promise<number> {
    try {
      const fileCount = await this.countFiles(targetPath)
      
      // Rough estimation: 10ms per file + 1ms per KB of data
      const estimatedSize = await this.estimateSize(targetPath)
      const sizeInKB = estimatedSize / 1024
      
      return (fileCount * 10) + sizeInKB

    } catch (error) {
      return 1000 // Default to 1 second if can't estimate
    }
  }

  /**
   * Scan directory structure recursively
   */
  private async scanDirectoryStructure(targetPath: string): Promise<DirectoryStructure> {
    const root = targetPath
    const tree = await this.scanDirectoryNode(targetPath, targetPath)
    
    return {
      root,
      tree: tree ? [tree] : []
    }
  }

  /**
   * Scan a single directory node
   */
  private async scanDirectoryNode(
    currentPath: string, 
    rootPath: string
  ): Promise<DirectoryNode | null> {
    try {
      const stats = await fs.stat(currentPath)
      if (!stats.isDirectory()) return null

      const entries = await fs.readdir(currentPath)
      const children: DirectoryNode[] = []
      const files: string[] = []
      
      let fileCount = 0
      let totalSize = 0

      for (const entry of entries) {
        if (this.shouldExcludeFile(entry)) continue
        
        const entryPath = join(currentPath, entry)
        const entryStats = await fs.stat(entryPath)
        
        if (entryStats.isDirectory()) {
          const childNode = await this.scanDirectoryNode(entryPath, rootPath)
          if (childNode) {
            children.push(childNode)
            fileCount += childNode.metadata.fileCount
            totalSize += childNode.metadata.totalSize
          }
        } else {
          files.push(entry)
          fileCount++
          totalSize += entryStats.size
        }
      }

      const metadata: DirectoryMetadata = {
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        fileCount,
        totalSize,
        permissions: await this.getFilePermissions(currentPath)
      }

      return {
        path: currentPath,
        name: relative(rootPath, currentPath) || 'root',
        children,
        files,
        metadata
      }

    } catch (error) {
      return null
    }
  }

  /**
   * Collect all files for backup
   */
  private async collectFiles(targetPath: string, context: BackupContext): Promise<FileBackupEntry[]> {
    const files: FileBackupEntry[] = []
    
    await this.collectFilesRecursive(targetPath, targetPath, files, context)
    
    return files
  }

  /**
   * Recursively collect files
   */
  private async collectFilesRecursive(
    currentPath: string,
    rootPath: string,
    files: FileBackupEntry[],
    context: BackupContext
  ): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath)
      
      for (const entry of entries) {
        if (this.shouldExcludeFile(entry)) continue
        
        const entryPath = join(currentPath, entry)
        const stats = await fs.stat(entryPath)
        
        if (stats.isDirectory()) {
          await this.collectFilesRecursive(entryPath, rootPath, files, context)
        } else {
          const fileEntry = await this.createFileBackupEntry(entryPath, rootPath, context)
          if (fileEntry) {
            files.push(fileEntry)
          }
        }
      }

    } catch (error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Create a file backup entry
   */
  private async createFileBackupEntry(
    filePath: string,
    rootPath: string,
    context: BackupContext
  ): Promise<FileBackupEntry | null> {
    try {
      const stats = await fs.stat(filePath)
      
      const metadata: FileMetadata = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isDirectory: false,
        isSymlink: stats.isSymbolicLink(),
        extension: filePath.substring(filePath.lastIndexOf('.') + 1),
        mimeType: this.getMimeType(filePath)
      }

      const permissions = await this.getFilePermissions(filePath)
      
      // Include file content for small files
      let content: Buffer | undefined
      if (context.options.includeContent && stats.size <= this.maxFileSize) {
        try {
          content = await fs.readFile(filePath)
        } catch (error) {
          // If can't read file, skip content but keep metadata
        }
      }

      // Calculate content hash
      const contentHash = content ? 
        require('crypto').createHash('sha256').update(content).digest('hex') :
        'no-content'

      return {
        path: filePath,
        originalPath: filePath,
        metadata,
        content,
        contentHash,
        permissions
      }

    } catch (error) {
      return null
    }
  }

  /**
   * Collect permission information
   */
  private async collectPermissions(targetPath: string): Promise<PermissionBackup[]> {
    const permissions: PermissionBackup[] = []
    
    await this.collectPermissionsRecursive(targetPath, permissions)
    
    return permissions
  }

  /**
   * Recursively collect permissions
   */
  private async collectPermissionsRecursive(
    currentPath: string,
    permissions: PermissionBackup[]
  ): Promise<void> {
    try {
      const filePermissions = await this.getFilePermissions(currentPath)
      
      permissions.push({
        path: currentPath,
        permissions: filePermissions
      })

      const stats = await fs.stat(currentPath)
      if (stats.isDirectory()) {
        const entries = await fs.readdir(currentPath)
        
        for (const entry of entries) {
          if (this.shouldExcludeFile(entry)) continue
          
          const entryPath = join(currentPath, entry)
          await this.collectPermissionsRecursive(entryPath, permissions)
        }
      }

    } catch (error) {
      // Skip files that can't be accessed
    }
  }

  /**
   * Get file permissions
   */
  private async getFilePermissions(filePath: string): Promise<FilePermissions> {
    try {
      const stats = await fs.stat(filePath)
      
      return {
        readable: true, // Basic assumption - we were able to stat the file
        writable: true, // Would need more complex checking for accurate values
        executable: false, // Simplified for now
        mode: stats.mode
      }

    } catch (error) {
      return {
        readable: false,
        writable: false,
        executable: false
      }
    }
  }

  /**
   * Check if file should be excluded
   */
  private shouldExcludeFile(filename: string): boolean {
    return this.excludePatterns.some(pattern => pattern.test(filename))
  }

  /**
   * Get MIME type for file
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.substring(filePath.lastIndexOf('.') + 1).toLowerCase()
    
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'json': 'application/json',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'html': 'text/html',
      'css': 'text/css',
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif'
    }

    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * Calculate total size of files
   */
  private calculateTotalSize(files: FileBackupEntry[]): number {
    return files.reduce((total, file) => {
      return total + (file.content?.length || 0) + 1024 // Add metadata overhead
    }, 0)
  }

  /**
   * Count total files in directory
   */
  private async countFiles(targetPath: string): Promise<number> {
    try {
      let count = 0
      const stats = await fs.stat(targetPath)
      
      if (!stats.isDirectory()) {
        return 1
      }

      const entries = await fs.readdir(targetPath)
      
      for (const entry of entries) {
        if (this.shouldExcludeFile(entry)) continue
        
        const entryPath = join(targetPath, entry)
        const entryStats = await fs.stat(entryPath)
        
        if (entryStats.isDirectory()) {
          count += await this.countFiles(entryPath)
        } else {
          count++
        }
      }

      return count

    } catch (error) {
      return 0
    }
  }
}