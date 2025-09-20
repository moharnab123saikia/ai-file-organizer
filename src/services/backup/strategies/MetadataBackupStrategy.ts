import { promises as fs, Stats } from 'fs'
import { join, relative } from 'path'
import { createHash } from 'crypto'
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
 * MetadataBackupStrategy - Creates lightweight backups with only metadata
 * 
 * This strategy creates minimal backups that include:
 * - Directory structure information
 * - File metadata (timestamps, sizes, permissions)
 * - NO file content (fastest backup option)
 * - Permission and ownership information
 * 
 * Best for: Quick operations, structure-only changes, low storage scenarios
 */
export class MetadataBackupStrategy extends BackupStrategy {
  readonly type = 'metadata' as const
  
  private readonly excludePatterns = [
    /\.DS_Store$/,
    /Thumbs\.db$/,
    /\.tmp$/,
    /\.temp$/,
    /~\$.*/, // Office temporary files
  ]

  /**
   * Create a metadata-only backup
   */
  async createBackup(targetPath: string, context: BackupContext): Promise<BackupData> {
    try {
      // Scan directory structure
      const structure = await this.scanDirectoryStructure(targetPath)
      
      // Collect file metadata (no content)
      const files = await this.collectFileMetadata(targetPath)
      
      // Collect permissions
      const permissions = await this.collectPermissions(targetPath)
      
      // Calculate metadata size (no content)
      const totalSize = this.calculateMetadataSize(files)
      
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
      throw new Error(`Failed to create metadata backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Estimate size of metadata backup (very small)
   */
  async estimateSize(targetPath: string): Promise<number> {
    try {
      const fileCount = await this.countFiles(targetPath)
      
      // Metadata backup is very small - approximately 1KB per file for metadata
      return fileCount * 1024

    } catch (error) {
      return 10240 // Default to 10KB if can't estimate
    }
  }

  /**
   * Estimate time for metadata backup (very fast)
   */
  async estimateTime(targetPath: string): Promise<number> {
    try {
      const fileCount = await this.countFiles(targetPath)
      
      // Metadata backup is very fast - approximately 1ms per file
      return fileCount

    } catch (error) {
      return 100 // Default to 100ms if can't estimate
    }
  }

  /**
   * Scan directory structure (same as full backup)
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
   * Collect file metadata only (no content)
   */
  private async collectFileMetadata(targetPath: string): Promise<FileBackupEntry[]> {
    const files: FileBackupEntry[] = []
    
    await this.collectFileMetadataRecursive(targetPath, targetPath, files)
    
    return files
  }

  /**
   * Recursively collect file metadata
   */
  private async collectFileMetadataRecursive(
    currentPath: string,
    rootPath: string,
    files: FileBackupEntry[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath)
      
      for (const entry of entries) {
        if (this.shouldExcludeFile(entry)) continue
        
        const entryPath = join(currentPath, entry)
        const stats = await fs.stat(entryPath)
        
        if (stats.isDirectory()) {
          await this.collectFileMetadataRecursive(entryPath, rootPath, files)
        } else {
          const fileEntry = await this.createFileMetadataEntry(entryPath)
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
   * Create a file metadata entry (no content)
   */
  private async createFileMetadataEntry(filePath: string): Promise<FileBackupEntry | null> {
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
      
      // NO content in metadata backup - this is the key difference
      const content = undefined
      
      // Create a metadata-only hash based on file stats
      const contentHash = this.createMetadataHash(stats, filePath)

      return {
        path: filePath,
        originalPath: filePath,
        metadata,
        content, // Always undefined for metadata backup
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
   * Create metadata hash based on file stats
   */
  private createMetadataHash(stats: Stats, filePath: string): string {
    const metadataString = `${filePath}-${stats.size}-${stats.mtime.getTime()}-${stats.mode}`
    return createHash('sha256').update(metadataString).digest('hex')
  }

  /**
   * Calculate metadata size (no file content)
   */
  private calculateMetadataSize(files: FileBackupEntry[]): number {
    // Each file entry has approximately 1KB of metadata
    return files.length * 1024
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