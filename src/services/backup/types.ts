/**
 * Core type definitions for the Backup and Restore system
 */

// ============================================================================
// Backup Types
// ============================================================================

export type BackupType = 'full' | 'incremental' | 'metadata'
export type OperationType = 'reorganization' | 'manual' | 'scheduled'
export type ConflictResolutionType = 'overwrite' | 'skip' | 'rename' | 'merge' | 'prompt'
export type RestoreType = 'full' | 'selective' | 'merge'
export type RiskLevel = 'low' | 'medium' | 'high'

// ============================================================================
// Backup Metadata and Data Structures
// ============================================================================

export interface BackupMetadata {
  id: string
  timestamp: Date
  type: BackupType
  targetPath: string
  size: number
  compressionRatio: number
  operationType: OperationType
  description?: string
  tags: string[]
  integrity: BackupIntegrity
}

export interface BackupIntegrity {
  checksum: string
  verified: boolean
  lastVerification: Date
}

export interface BackupData {
  metadata: BackupMetadata
  structure: DirectoryStructure
  files: FileBackupEntry[]
  permissions: PermissionBackup[]
  settings: SettingsSnapshot
}

export interface FileBackupEntry {
  path: string
  originalPath: string
  metadata: FileMetadata
  content?: Buffer  // For small files or when includeContent is true
  contentHash: string
  permissions: FilePermissions
}

export interface DirectoryStructure {
  root: string
  tree: DirectoryNode[]
}

export interface DirectoryNode {
  path: string
  name: string
  children: DirectoryNode[]
  files: string[]
  metadata: DirectoryMetadata
}

export interface FileMetadata {
  size: number
  created: Date
  modified: Date
  accessed: Date
  isDirectory: boolean
  isSymlink: boolean
  extension?: string
  mimeType?: string
}

export interface DirectoryMetadata {
  created: Date
  modified: Date
  accessed: Date
  fileCount: number
  totalSize: number
  permissions: FilePermissions
}

export interface FilePermissions {
  readable: boolean
  writable: boolean
  executable: boolean
  mode?: number  // Unix permissions
}

export interface PermissionBackup {
  path: string
  permissions: FilePermissions
  owner?: string
  group?: string
}

export interface SettingsSnapshot {
  version: string
  settings: Record<string, any>
  timestamp: Date
}

// ============================================================================
// Operation and Context Types
// ============================================================================

export interface OrganizationOperation {
  type: OperationType
  targetPath: string
  changes: FileChangeOperation[]
  timestamp: Date
  description?: string
}

export interface FileChangeOperation {
  type: 'move' | 'copy' | 'delete' | 'create' | 'rename'
  from: string
  to?: string
  metadata?: any
}

export interface BackupContext {
  operation?: OrganizationOperation
  user?: string
  sessionId?: string
  options: BackupOptions
}

// ============================================================================
// Options and Configuration
// ============================================================================

export interface BackupOptions {
  type?: BackupType
  includeContent?: boolean
  compression?: boolean
  maxSize?: number
  excludePatterns?: string[]
  includePatterns?: string[]
  description?: string
  tags?: string[]
  priority?: 'low' | 'normal' | 'high'
}

export interface RestoreOptions {
  restoreType?: RestoreType
  targetPath?: string
  conflictResolution?: ConflictResolutionType
  selective?: string[]  // Paths to restore selectively
  preview?: boolean
  createBackup?: boolean  // Create backup before restore
  preservePermissions?: boolean
}

export interface BackupFilter {
  targetPath?: string
  type?: BackupType
  operationType?: OperationType
  tags?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  sizeRange?: {
    min: number
    max: number
  }
}

// ============================================================================
// Result Types
// ============================================================================

export interface BackupResult {
  success: boolean
  id?: string
  metadata?: BackupMetadata
  error?: string
  warnings?: string[]
  duration: number
  bytesProcessed?: number
}

export interface RestoreResult {
  success: boolean
  backupId: string
  restoredFiles: number
  skippedFiles?: number
  conflicts: FileConflict[]
  error?: string
  warnings?: string[]
  duration: number
  bytesRestored?: number
}

export interface ValidationResult {
  valid: boolean
  checksumMatch: boolean
  structureIntact: boolean
  missingFiles?: string[]
  corruptedFiles?: string[]
  error?: string
  details?: ValidationDetails
}

export interface ValidationDetails {
  totalFiles: number
  validatedFiles: number
  checksumErrors: number
  structureErrors: number
  permissionErrors: number
}

// ============================================================================
// Conflict Resolution
// ============================================================================

export interface FileConflict {
  type: 'exists' | 'modified' | 'permission' | 'structure'
  currentPath: string
  backupPath: string
  currentMetadata?: FileMetadata
  backupMetadata?: FileMetadata
  resolution?: ConflictResolutionType
  severity: 'low' | 'medium' | 'high'
}

export interface ConflictResolution {
  conflict: FileConflict
  resolution: ConflictResolutionType
  alternativePath?: string
  preserveBoth?: boolean
  userDecision?: boolean
}

export interface RestorePlan {
  backupId: string
  restoreType: RestoreType
  targetPath: string
  conflicts: FileConflict[]
  resolutions: ConflictResolution[]
  estimatedChanges: number
  estimatedSize: number
  riskLevel: RiskLevel
  warnings: string[]
}

export interface RestoreAnalysis {
  plan: RestorePlan
  recommendations: string[]
  requiredPermissions: string[]
  estimatedDuration: number
  diskSpaceRequired: number
}

// ============================================================================
// Strategy Interfaces
// ============================================================================

export interface BackupStrategy {
  readonly type: BackupType
  
  createBackup(
    targetPath: string, 
    context: BackupContext
  ): Promise<BackupData>
  
  estimateSize(targetPath: string): Promise<number>
  estimateTime(targetPath: string): Promise<number>
}

export interface RestoreStrategy {
  readonly type: RestoreType
  
  analyzeRestore(
    backup: BackupData, 
    options: RestoreOptions
  ): Promise<RestoreAnalysis>
  
  executeRestore(
    plan: RestorePlan, 
    backup: BackupData
  ): Promise<RestoreResult>
}

// ============================================================================
// Event Types
// ============================================================================

export interface BackupEvent {
  type: 'backup:started' | 'backup:progress' | 'backup:completed' | 'backup:failed'
  timestamp: Date
  data: any
}

export interface RestoreEvent {
  type: 'restore:started' | 'restore:conflicts' | 'restore:completed' | 'restore:failed'
  timestamp: Date
  data: any
}

export interface BackupProgressEvent {
  operation: 'scan' | 'read' | 'compress' | 'store'
  filesProcessed: number
  totalFiles: number
  bytesProcessed: number
  totalBytes: number
  percentage: number
  currentFile?: string
  estimatedTimeRemaining?: number
}

// ============================================================================
// Service Configuration
// ============================================================================

export interface BackupManagerConfig {
  storage: StorageOptions
  defaultStrategy: BackupType
  autoBackup: boolean
  retentionPolicy: RetentionPolicy
  performanceOptions: PerformanceOptions
}

export interface StorageOptions {
  location: string
  compression: boolean
  encryption?: EncryptionOptions
  maxSize?: number
  retentionPolicy?: RetentionPolicy
}

export interface EncryptionOptions {
  enabled: boolean
  algorithm: string
  keyDerivation: string
  saltLength: number
}

export interface RetentionPolicy {
  maxBackups: number
  maxAge: number  // days
  minFreeSpace: number  // bytes
  priorityRules: PriorityRule[]
}

export interface PriorityRule {
  condition: (backup: BackupMetadata) => boolean
  priority: number
  description: string
}

export interface PerformanceOptions {
  maxConcurrentOps: number
  chunkSize: number
  memoryLimit: number
  backgroundProcessing: boolean
  progressUpdateInterval: number
}

// ============================================================================
// Error Types
// ============================================================================

export class BackupError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public details?: any
  ) {
    super(message)
    this.name = 'BackupError'
  }
}

export class RestoreError extends Error {
  constructor(
    message: string,
    public code: string,
    public backupId: string,
    public details?: any
  ) {
    super(message)
    this.name = 'RestoreError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public backupId: string,
    public validationDetails?: ValidationDetails
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// ============================================================================
// Compressed Backup Types
// ============================================================================

export interface CompressedBackup {
  metadata: BackupMetadata
  compressedData: Buffer
  compressionAlgorithm: 'gzip' | 'brotli' | 'lz4'
  originalSize: number
  compressedSize: number
}