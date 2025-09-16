/**
 * File Operation Safety Types
 * 
 * Comprehensive type definitions for atomic file operations,
 * transaction management, and rollback capabilities.
 */

// Core operation types
export type SafetyLevel = 'none' | 'basic' | 'enhanced' | 'maximum'
export type OperationType = 'read' | 'create' | 'update' | 'delete' | 'move' | 'copy'
export type TransactionStatus = 'pending' | 'active' | 'committed' | 'rolled_back' | 'failed'
export type RollbackStrategy = 'reverse' | 'restore' | 'hybrid'
export type ConflictResolution = 'abort' | 'force' | 'merge' | 'user_choice'

// File operation definition
export interface FileOperation {
  id: string
  type: OperationType
  sourceePath: string
  targetPath?: string
  metadata?: Record<string, unknown>
  safetyLevel: SafetyLevel
  timestamp: Date
  checksum?: string
  overwrite?: boolean
}

// Transaction definition
export interface Transaction {
  id: string
  status: TransactionStatus
  operations: FileOperation[]
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  safetyLevel: SafetyLevel
  rollbackStrategy: RollbackStrategy
  conflictResolution: ConflictResolution
  metadata?: Record<string, unknown>
}

// File system state snapshot
export interface FileSystemState {
  timestamp: Date
  checksum: string
  files: FileStateInfo[]
  directories: DirectoryStateInfo[]
}

export interface FileStateInfo {
  path: string
  exists: boolean
  isFile: boolean
  isDirectory: boolean
  size: number
  mtime: Date | null
  checksum: string | null
  permissions: {
    readable: boolean
    writable: boolean
    executable: boolean
  }
  metadata?: Record<string, unknown>
}

export interface DirectoryStateInfo {
  path: string
  lastModified: Date
  permissions: string
  childCount: number
  metadata?: Record<string, unknown>
}

// Operation journal entry
export interface OperationRecord {
  id: string
  transactionId: string
  operation: FileOperation
  beforeState: Partial<FileSystemState>
  afterState?: Partial<FileSystemState>
  rollbackScript: RollbackScript
  timestamp: Date
  success: boolean
  error?: SafetyError
}

// Rollback script definition
export interface RollbackScript {
  id: string
  operations: RollbackOperation[]
  strategy: RollbackStrategy
  createdAt: Date
  validUntil?: Date
  metadata?: Record<string, unknown>
}

export interface RollbackOperation {
  type: 'restore_file' | 'delete_file' | 'move_file' | 'restore_metadata'
  sourcePath?: string
  targetPath: string
  backupPath?: string
  metadata?: Record<string, unknown>
}

// Validation definitions
export interface ValidationRule {
  id: string
  name: string
  description: string
  validator: (operation: FileOperation) => ValidationResult
  safetyLevel: SafetyLevel
  enabled: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  checksumValid?: boolean
  structureValid?: boolean
  permissionsValid?: boolean
}

export interface ValidationError {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  operation?: FileOperation
  suggestion?: string
}

export interface ValidationWarning {
  code: string
  message: string
  operation?: FileOperation
  canProceed: boolean
  suggestion?: string
}

// Safety error types
export class SafetyError extends Error {
  constructor(
    message: string,
    public code: SafetyErrorCode,
    public operation?: FileOperation,
    public transaction?: Transaction,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'SafetyError'
  }
}

export enum SafetyErrorCode {
  VALIDATION_FAILED = 'validation_failed',
  BACKUP_FAILED = 'backup_failed',
  OPERATION_FAILED = 'operation_failed',
  ROLLBACK_FAILED = 'rollback_failed',
  CORRUPTION_DETECTED = 'corruption_detected',
  CONFLICT_DETECTED = 'conflict_detected',
  PERMISSION_DENIED = 'permission_denied',
  INSUFFICIENT_SPACE = 'insufficient_space',
  TRANSACTION_FAILED = 'transaction_failed',
  CHECKSUM_MISMATCH = 'checksum_mismatch'
}

// Conflict detection and resolution
export interface FileConflict {
  id: string
  type: ConflictType
  operation: FileOperation
  conflictingPath: string
  severity: ConflictSeverity
  detectedAt: Date
  resolution?: ConflictResolution
  resolvedAt?: Date
  metadata?: Record<string, unknown>
}

export interface ConflictInfo extends FileConflict {}

export type ConflictType =
  | 'file_exists'
  | 'directory_exists'
  | 'concurrent_modification'
  | 'permission_denied'
  | 'path_too_long'
  | 'insufficient_space'
  | 'external_modification'
  | 'concurrent_access'
  | 'permission_conflict'
  | 'checksum_mismatch'

export type ConflictSeverity = 'low' | 'medium' | 'high' | 'critical'

// Backup integration
export interface SafetyBackup {
  id: string
  transactionId: string
  createdAt: Date
  backupPath: string
  originalPaths: string[]
  checksum: string
  compressed: boolean
  encrypted: boolean
  metadata?: Record<string, unknown>
}

// Monitoring and metrics
export interface SafetyMetrics {
  totalOperations: number
  successfulOperations: number
  failedOperations: number
  rolledBackOperations: number
  averageOperationTime: number
  averageRollbackTime: number
  storageOverhead: number
  lastUpdate: Date
}

export interface OperationStats {
  operationType: OperationType
  count: number
  successRate: number
  averageTime: number
  averageSize: number
  errors: SafetyErrorCode[]
}

// Configuration interfaces
export interface SafetyConfig {
  defaultSafetyLevel: SafetyLevel
  enableBackups: boolean
  backupRetentionDays: number
  journalRetentionDays: number
  validationRules: ValidationRule[]
  conflictResolution: ConflictResolution
  rollbackStrategy: RollbackStrategy
  maxTransactionSize: number
  enableChecksums: boolean
  enableEncryption: boolean
  performanceMode: boolean
}

export interface TransactionConfig {
  isolationLevel: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable'
  timeoutMs: number
  maxRetries: number
  enableDeadlockDetection: boolean
  enableConflictDetection: boolean
  batchSize: number
}

// Service interfaces
export interface TransactionManager {
  beginTransaction(config?: Partial<TransactionConfig>): Promise<Transaction>
  addOperation(transaction: Transaction, operation: FileOperation): Promise<void>
  commitTransaction(transaction: Transaction): Promise<void>
  rollbackTransaction(transaction: Transaction): Promise<void>
  getTransaction(id: string): Promise<Transaction | null>
  isTransactionActive(id: string): boolean
  getActiveTransactions(): Transaction[]
}

export interface OperationJournal {
  logOperation(record: OperationRecord): Promise<void>
  getOperations(transactionId: string): Promise<OperationRecord[]>
  getOperationHistory(limit?: number): Promise<OperationRecord[]>
  createRollbackScript(transactionId: string): Promise<RollbackScript>
  executeRollback(script: RollbackScript): Promise<void>
  cleanupOldRecords(olderThan: Date): Promise<void>
}

export interface FileSystemMonitor {
  startMonitoring(paths: string[], options?: MonitoringOptions): Promise<void>
  stopMonitoring(): Promise<void>
  detectConflicts(operation: FileOperation): Promise<FileConflict[]>
  captureState(path: string): Promise<FileStateInfo>
  onFileChanged(callback: (event: FileChangeEvent) => void): () => void
  onError(callback: (error: SafetyError) => void): () => void
  onSafetyEvent(callback: (event: SafetyEvent) => void): () => void
  suggestResolution(conflict: FileConflict): Promise<ConflictResolutionSuggestion>
  validateResolution(conflict: FileConflict, resolution: ConflictResolutionSuggestion): Promise<boolean>
  getCacheSize(): Promise<number>
}

export interface MonitoringOptions {
  recursive?: boolean
  interval?: number
  ignoreHidden?: boolean
  excludePatterns?: string[]
}

export interface FileChangeEvent {
  type: 'change' | 'rename'
  path: string
  timestamp: Date
}

export interface ConflictResolutionSuggestion {
  strategy: 'rename' | 'overwrite' | 'merge' | 'manual'
  suggestedPath?: string
  automatic: boolean
  confidence: number
  requiresUserInput?: boolean
}

export interface SafetyValidator {
  validateOperation(operation: FileOperation): Promise<ValidationResult>
  addValidationRule(rule: ValidationRule): void
  removeValidationRule(ruleId: string): void
  getValidationRules(): ValidationRule[]
  validateChecksum(filePath: string, expectedChecksum: string): Promise<boolean>
  validatePermissions(filePath: string, requiredPermissions: string): Promise<boolean>
}

// Event system
export type SafetyEventType = 
  | 'operation_started'
  | 'operation_completed'
  | 'operation_failed'
  | 'transaction_started'
  | 'transaction_committed'
  | 'transaction_rolled_back'
  | 'conflict_detected'
  | 'validation_failed'
  | 'backup_created'
  | 'rollback_executed'

export interface SafetyEvent {
  type: SafetyEventType
  timestamp: Date
  transaction?: Transaction
  operation?: FileOperation
  conflict?: ConflictInfo
  error?: SafetyError
  metadata?: Record<string, unknown>
}

export type SafetyEventListener = (event: SafetyEvent) => void

export interface SafetyEventEmitter {
  on(event: SafetyEventType, listener: SafetyEventListener): () => void
  emit(event: SafetyEvent): void
  removeAllListeners(event?: SafetyEventType): void
}

// Recovery system
export interface RecoveryPoint {
  id: string
  createdAt: Date
  description: string
  transactionId: string
  backupIds: string[]
  fileSystemState: FileSystemState
  metadata?: Record<string, unknown>
}

export interface RecoveryManager {
  createRecoveryPoint(description: string, transactionId: string): Promise<RecoveryPoint>
  listRecoveryPoints(): Promise<RecoveryPoint[]>
  recoverToPoint(recoveryPointId: string): Promise<void>
  deleteRecoveryPoint(recoveryPointId: string): Promise<void>
  validateRecoveryPoint(recoveryPointId: string): Promise<ValidationResult>
}

// Performance monitoring
export interface PerformanceMetrics {
  operationDuration: number
  transactionDuration: number
  rollbackDuration: number
  backupCreationTime: number
  validationTime: number
  memoryUsage: number
  diskUsage: number
  cpuUsage: number
}

export interface PerformanceMonitor {
  startMetrics(operation: FileOperation): string
  endMetrics(metricsId: string): PerformanceMetrics
  getAverageMetrics(operationType?: OperationType): PerformanceMetrics
  getMetricsHistory(limit?: number): PerformanceMetrics[]
}

// User interface integration
export interface SafetyUIState {
  activeTransactions: Transaction[]
  recentOperations: OperationRecord[]
  conflicts: ConflictInfo[]
  recoveryPoints: RecoveryPoint[]
  metrics: SafetyMetrics
  isMonitoring: boolean
}

export interface ProgressCallback {
  (operation: FileOperation, progress: number, message?: string): void
}

export interface ConfirmationCallback {
  (operation: FileOperation, risks: ValidationWarning[]): Promise<boolean>
}

// Main safety service interface
export interface SafetyService {
  // Transaction management
  beginTransaction(config?: Partial<TransactionConfig>): Promise<Transaction>
  executeOperation(operation: FileOperation, transaction?: Transaction): Promise<void>
  commitTransaction(transaction: Transaction): Promise<void>
  rollbackTransaction(transaction: Transaction): Promise<void>
  
  // Operation management
  validateOperation(operation: FileOperation): Promise<ValidationResult>
  executeAtomicOperation(operation: FileOperation): Promise<void>
  createBackup(paths: string[]): Promise<SafetyBackup>
  
  // Monitoring and recovery
  startMonitoring(paths: string[]): Promise<void>
  stopMonitoring(): Promise<void>
  createRecoveryPoint(description: string): Promise<RecoveryPoint>
  recoverToPoint(recoveryPointId: string): Promise<void>
  
  // Configuration and status
  configure(config: Partial<SafetyConfig>): void
  getConfig(): SafetyConfig
  getMetrics(): Promise<SafetyMetrics>
  getUIState(): Promise<SafetyUIState>
  
  // Event system
  on(event: SafetyEventType, listener: SafetyEventListener): () => void
  setProgressCallback(callback: ProgressCallback): void
  setConfirmationCallback(callback: ConfirmationCallback): void
}

// Default configurations
export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  defaultSafetyLevel: 'enhanced',
  enableBackups: true,
  backupRetentionDays: 30,
  journalRetentionDays: 90,
  validationRules: [],
  conflictResolution: 'user_choice',
  rollbackStrategy: 'hybrid',
  maxTransactionSize: 1000,
  enableChecksums: true,
  enableEncryption: false,
  performanceMode: false
}

export const DEFAULT_TRANSACTION_CONFIG: TransactionConfig = {
  isolationLevel: 'read_committed',
  timeoutMs: 300000, // 5 minutes
  maxRetries: 3,
  enableDeadlockDetection: true,
  enableConflictDetection: true,
  batchSize: 100
}

// Constants
export const SAFETY_STORAGE_KEYS = {
  CONFIG: 'ai-file-organizer-safety-config',
  JOURNAL: 'ai-file-organizer-operation-journal',
  RECOVERY_POINTS: 'ai-file-organizer-recovery-points',
  METRICS: 'ai-file-organizer-safety-metrics'
} as const

export const MAX_ROLLBACK_OPERATIONS = 10000
export const MAX_JOURNAL_SIZE_MB = 100
export const DEFAULT_CHECKSUM_ALGORITHM = 'sha256'
export const TRANSACTION_TIMEOUT_MS = 300000 // 5 minutes
export const MONITORING_INTERVAL_MS = 1000 // 1 second