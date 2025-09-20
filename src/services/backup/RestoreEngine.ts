import { promises as fs } from 'fs'
import { join, dirname, basename } from 'path'
import { BackupStorage } from './BackupStorage'
import { RestoreError } from './types'
import type {
  RestorePlan,
  RestoreResult,
  RestoreAnalysis,
  RestoreOptions,
  BackupData,
  FileConflict,
  ConflictResolution,
  ConflictResolutionType,
  FileMetadata,
  RestoreType,
  RiskLevel
} from './types'

/**
 * RestoreEngine - Handles backup restoration with conflict detection and resolution
 * 
 * Responsibilities:
 * - Analyze restore operations and detect potential conflicts
 * - Execute restore plans with appropriate conflict resolution
 * - Provide restore previews and risk assessment
 * - Handle selective and full restore operations
 * - Maintain data integrity during restoration
 */
export class RestoreEngine {
  private storage: BackupStorage

  constructor(storage: BackupStorage) {
    this.storage = storage
  }

  /**
   * Analyze a potential restore operation
   */
  async analyzeRestore(
    backupId: string,
    options: RestoreOptions = {}
  ): Promise<RestoreAnalysis> {
    try {
      // Retrieve backup data
      const backupData = await this.storage.retrieve(backupId)
      
      // Determine target path
      const targetPath = options.targetPath || backupData.metadata.targetPath
      
      // Analyze conflicts
      const conflicts = await this.detectConflicts(backupData, targetPath, options)
      
      // Create conflict resolutions
      const resolutions = this.createResolutions(conflicts, options.conflictResolution || 'prompt')
      
      // Assess risk level
      const riskLevel = this.assessRiskLevel(conflicts, options)
      
      // Generate warnings
      const warnings = this.generateWarnings(conflicts, riskLevel, options)
      
      // Estimate changes and size
      const estimatedChanges = this.estimateChanges(backupData, conflicts, options)
      const estimatedSize = this.estimateSize(backupData, options)
      
      const plan: RestorePlan = {
        backupId,
        restoreType: options.restoreType || 'full',
        targetPath,
        conflicts,
        resolutions,
        estimatedChanges,
        estimatedSize,
        riskLevel,
        warnings
      }

      const analysis: RestoreAnalysis = {
        plan,
        recommendations: this.generateRecommendations(plan),
        requiredPermissions: this.analyzePermissions(backupData, targetPath),
        estimatedDuration: this.estimateDuration(backupData, conflicts.length),
        diskSpaceRequired: estimatedSize
      }

      return analysis

    } catch (error) {
      throw new RestoreError(
        `Failed to analyze restore: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_FAILED',
        backupId
      )
    }
  }

  /**
   * Execute a restore operation
   */
  async executeRestore(plan: RestorePlan): Promise<RestoreResult> {
    const startTime = Date.now()
    let restoredFiles = 0
    let skippedFiles = 0
    const processedConflicts: FileConflict[] = []

    try {
      // Retrieve backup data
      const backupData = await this.storage.retrieve(plan.backupId)
      
      // Validate target path
      await this.ensureTargetPath(plan.targetPath)
      
      // Execute restore based on type
      switch (plan.restoreType) {
        case 'full':
          ({ restoredFiles, skippedFiles } = await this.executeFullRestore(
            backupData, 
            plan, 
            processedConflicts
          ))
          break
          
        case 'selective':
          ({ restoredFiles, skippedFiles } = await this.executeSelectiveRestore(
            backupData, 
            plan, 
            processedConflicts
          ))
          break
          
        case 'merge':
          ({ restoredFiles, skippedFiles } = await this.executeMergeRestore(
            backupData, 
            plan, 
            processedConflicts
          ))
          break
          
        default:
          throw new Error(`Unsupported restore type: ${plan.restoreType}`)
      }

      const duration = Date.now() - startTime
      const bytesRestored = this.calculateBytesRestored(backupData, restoredFiles)

      return {
        success: true,
        backupId: plan.backupId,
        restoredFiles,
        skippedFiles,
        conflicts: processedConflicts,
        duration,
        bytesRestored
      }

    } catch (error) {
      const duration = Date.now() - startTime
      
      return {
        success: false,
        backupId: plan.backupId,
        restoredFiles,
        skippedFiles,
        conflicts: processedConflicts,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      }
    }
  }

  /**
   * Detect conflicts between backup and current state
   */
  private async detectConflicts(
    backupData: BackupData,
    targetPath: string,
    options: RestoreOptions
  ): Promise<FileConflict[]> {
    const conflicts: FileConflict[] = []

    // Check if target path exists
    try {
      await fs.access(targetPath)
    } catch {
      // Target doesn't exist, no conflicts
      return conflicts
    }

    // Check each file in backup
    for (const fileEntry of backupData.files) {
      const relativePath = fileEntry.path.replace(backupData.metadata.targetPath, '')
      const currentPath = join(targetPath, relativePath)

      try {
        const currentStats = await fs.stat(currentPath)
        const currentMetadata: FileMetadata = {
          size: currentStats.size,
          created: currentStats.birthtime,
          modified: currentStats.mtime,
          accessed: currentStats.atime,
          isDirectory: currentStats.isDirectory(),
          isSymlink: currentStats.isSymbolicLink()
        }

        // Compare with backup metadata
        const conflict = this.compareFileMetadata(
          fileEntry.metadata,
          currentMetadata,
          currentPath,
          fileEntry.path
        )

        if (conflict) {
          conflicts.push(conflict)
        }

      } catch (error) {
        // File doesn't exist in current location - not a conflict
        continue
      }
    }

    return conflicts
  }

  /**
   * Compare file metadata to detect conflicts
   */
  private compareFileMetadata(
    backupMetadata: FileMetadata,
    currentMetadata: FileMetadata,
    currentPath: string,
    backupPath: string
  ): FileConflict | null {
    // File exists - check if it's been modified
    if (currentMetadata.modified.getTime() !== backupMetadata.modified.getTime()) {
      return {
        type: 'modified',
        currentPath,
        backupPath,
        currentMetadata,
        backupMetadata: backupMetadata,
        severity: 'medium'
      }
    }

    // Check size differences
    if (currentMetadata.size !== backupMetadata.size) {
      return {
        type: 'modified',
        currentPath,
        backupPath,
        currentMetadata,
        backupMetadata: backupMetadata,
        severity: 'high'
      }
    }

    // File exists but is identical
    return {
      type: 'exists',
      currentPath,
      backupPath,
      currentMetadata,
      backupMetadata: backupMetadata,
      severity: 'low'
    }
  }

  /**
   * Create conflict resolutions based on strategy
   */
  private createResolutions(
    conflicts: FileConflict[],
    defaultStrategy: ConflictResolutionType
  ): ConflictResolution[] {
    return conflicts.map(conflict => ({
      conflict,
      resolution: defaultStrategy,
      preserveBoth: defaultStrategy === 'rename',
      userDecision: defaultStrategy === 'prompt'
    }))
  }

  /**
   * Assess risk level of restore operation
   */
  private assessRiskLevel(conflicts: FileConflict[], options: RestoreOptions): RiskLevel {
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'high').length
    const totalConflicts = conflicts.length

    if (highSeverityConflicts > 5 || totalConflicts > 20) {
      return 'high'
    }

    if (highSeverityConflicts > 0 || totalConflicts > 5) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Generate warnings for restore operation
   */
  private generateWarnings(
    conflicts: FileConflict[],
    riskLevel: RiskLevel,
    options: RestoreOptions
  ): string[] {
    const warnings: string[] = []

    if (riskLevel === 'high') {
      warnings.push('High risk operation: Many files will be overwritten')
    }

    if (conflicts.some(c => c.type === 'modified' && c.severity === 'high')) {
      warnings.push('Some files have been significantly modified since backup')
    }

    if (!options.createBackup && conflicts.length > 0) {
      warnings.push('Consider creating a backup before restore to preserve current state')
    }

    return warnings
  }

  /**
   * Execute full restore operation
   */
  private async executeFullRestore(
    backupData: BackupData,
    plan: RestorePlan,
    processedConflicts: FileConflict[]
  ): Promise<{ restoredFiles: number; skippedFiles: number }> {
    let restoredFiles = 0
    let skippedFiles = 0

    // Restore directory structure first
    await this.restoreDirectoryStructure(backupData, plan.targetPath)

    // Restore files
    for (const fileEntry of backupData.files) {
      const relativePath = fileEntry.path.replace(backupData.metadata.targetPath, '')
      const targetFilePath = join(plan.targetPath, relativePath)

      // Check for conflicts
      const conflict = plan.conflicts.find(c => c.currentPath === targetFilePath)
      const resolution = plan.resolutions.find(r => r.conflict.currentPath === targetFilePath)

      if (conflict && resolution) {
        const restored = await this.handleFileConflict(fileEntry, targetFilePath, resolution)
        if (restored) {
          restoredFiles++
          processedConflicts.push(conflict)
        } else {
          skippedFiles++
        }
      } else {
        // No conflict, restore normally
        await this.restoreFile(fileEntry, targetFilePath)
        restoredFiles++
      }
    }

    return { restoredFiles, skippedFiles }
  }

  /**
   * Execute selective restore operation
   */
  private async executeSelectiveRestore(
    backupData: BackupData,
    plan: RestorePlan,
    processedConflicts: FileConflict[]
  ): Promise<{ restoredFiles: number; skippedFiles: number }> {
    // Implementation for selective restore
    // This would filter files based on selective paths in RestoreOptions
    return this.executeFullRestore(backupData, plan, processedConflicts)
  }

  /**
   * Execute merge restore operation
   */
  private async executeMergeRestore(
    backupData: BackupData,
    plan: RestorePlan,
    processedConflicts: FileConflict[]
  ): Promise<{ restoredFiles: number; skippedFiles: number }> {
    // Implementation for merge restore
    // This would intelligently merge changes
    return this.executeFullRestore(backupData, plan, processedConflicts)
  }

  /**
   * Restore directory structure
   */
  private async restoreDirectoryStructure(backupData: BackupData, targetPath: string): Promise<void> {
    for (const node of backupData.structure.tree) {
      await this.createDirectoryRecursive(node, targetPath, backupData.metadata.targetPath)
    }
  }

  /**
   * Create directory recursively
   */
  private async createDirectoryRecursive(
    node: any,
    targetBasePath: string,
    originalBasePath: string
  ): Promise<void> {
    const relativePath = node.path.replace(originalBasePath, '')
    const targetDirPath = join(targetBasePath, relativePath)

    try {
      await fs.mkdir(targetDirPath, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Process children
    for (const child of node.children || []) {
      await this.createDirectoryRecursive(child, targetBasePath, originalBasePath)
    }
  }

  /**
   * Handle file conflict based on resolution
   */
  private async handleFileConflict(
    fileEntry: any,
    targetPath: string,
    resolution: ConflictResolution
  ): Promise<boolean> {
    switch (resolution.resolution) {
      case 'overwrite':
        await this.restoreFile(fileEntry, targetPath)
        return true

      case 'skip':
        return false

      case 'rename': {
        const backupPath = this.generateBackupPath(targetPath)
        await this.restoreFile(fileEntry, backupPath)
        return true
      }

      case 'prompt': {
        // In a real implementation, this would prompt the user
        // For now, default to rename
        const promptBackupPath = this.generateBackupPath(targetPath)
        await this.restoreFile(fileEntry, promptBackupPath)
        return true
      }

      default:
        return false
    }
  }

  /**
   * Restore individual file
   */
  private async restoreFile(fileEntry: any, targetPath: string): Promise<void> {
    // Ensure parent directory exists
    await fs.mkdir(dirname(targetPath), { recursive: true })

    if (fileEntry.content) {
      // File has content stored in backup
      await fs.writeFile(targetPath, fileEntry.content)
    } else {
      // For large files, we might only have metadata
      // This would require different handling in a complete implementation
      console.warn(`File content not available in backup: ${fileEntry.path}`)
    }

    // Restore timestamps
    if (fileEntry.metadata) {
      try {
        await fs.utimes(targetPath, fileEntry.metadata.accessed, fileEntry.metadata.modified)
      } catch (error) {
        // Timestamp restoration is not critical
      }
    }
  }

  /**
   * Generate backup path for conflicting files
   */
  private generateBackupPath(originalPath: string): string {
    const dir = dirname(originalPath)
    const ext = originalPath.substring(originalPath.lastIndexOf('.'))
    const nameWithoutExt = basename(originalPath, ext)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    return join(dir, `${nameWithoutExt}.backup-${timestamp}${ext}`)
  }

  /**
   * Ensure target path exists
   */
  private async ensureTargetPath(targetPath: string): Promise<void> {
    try {
      await fs.mkdir(targetPath, { recursive: true })
    } catch (error) {
      throw new RestoreError(
        `Failed to create target path: ${targetPath}`,
        'TARGET_PATH_FAILED',
        'unknown'
      )
    }
  }

  /**
   * Helper methods for analysis
   */
  private estimateChanges(backupData: BackupData, conflicts: FileConflict[], options: RestoreOptions): number {
    return backupData.files.length + conflicts.length
  }

  private estimateSize(backupData: BackupData, options: RestoreOptions): number {
    return backupData.metadata.size
  }

  private generateRecommendations(plan: RestorePlan): string[] {
    const recommendations: string[] = []

    if (plan.riskLevel === 'high') {
      recommendations.push('Create a backup of current state before proceeding')
    }

    if (plan.conflicts.length > 10) {
      recommendations.push('Consider selective restore for specific files only')
    }

    if (plan.conflicts.some(c => c.severity === 'high')) {
      recommendations.push('Review conflicts carefully - some files have significant changes')
    }

    return recommendations
  }

  private analyzePermissions(backupData: BackupData, targetPath: string): string[] {
    // Analysis of required permissions for restore
    return ['write', 'create']
  }

  private estimateDuration(backupData: BackupData, conflictCount: number): number {
    // Rough estimation: 1ms per file + 100ms per conflict
    return backupData.files.length + (conflictCount * 100)
  }

  private calculateBytesRestored(backupData: BackupData, restoredFiles: number): number {
    // Simplified calculation
    return Math.round((backupData.metadata.size * restoredFiles) / backupData.files.length)
  }
}