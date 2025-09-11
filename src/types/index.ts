/**
 * Core TypeScript Type Definitions for AI File Organizer
 * 
 * This file contains all the shared type definitions used throughout the application,
 * providing strong typing for better development experience and error prevention.
 */

// ================================
// File System Types
// ================================

export interface FileSystemItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  extension?: string;
  mimeType?: string;
  modifiedAt: Date;
  createdAt: Date;
  isHidden?: boolean;
  permissions?: FilePermissions;
  children?: FileSystemItem[];
  metadata?: FileMetadata;
}

export interface FilePermissions {
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

export interface FileMetadata {
  hash?: string;
  encoding?: string;
  lineCount?: number;
  wordCount?: number;
  characterCount?: number;
  isSymlink?: boolean;
  symlinkTarget?: string;
  tags: string[];
  notes?: string;
  customProperties?: Record<string, unknown>;
}

export interface DirectoryStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  averageFileSize: number;
  fileTypeDistribution: Record<string, number>;
  depthDistribution: Record<number, number>;
  lastModified: Date;
}

// ================================
// Johnny Decimal System Types
// ================================

export interface JohnnyDecimalStructure {
  id: string;
  name: string;
  rootPath: string;
  areas: JDArea[];
  createdAt: Date;
  modifiedAt: Date;
  version: string;
  description?: string;
}

export interface JDArea {
  number: number; // 10, 20, 30, etc.
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  categories: JDCategory[];
  isActive: boolean;
  rules?: OrganizationRule[];
}

export interface JDCategory {
  number: number; // 11, 12, 13, etc.
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  items: JDItem[];
  autoAssignRules?: CategoryRule[];
  maxItems?: number;
  isActive: boolean;
}

export interface JDItem {
  number: string; // 11.01, 11.02, etc.
  name: string;
  description?: string;
  files: string[]; // File paths
  targetPath?: string;
  color?: string;
  icon?: string;
  tags: string[];
  notes?: string;
  isActive: boolean;
  maxFiles?: number;
}

export interface CategoryAssignment {
  areaNumber: number;
  categoryNumber: number;
  itemNumber: string;
  confidence: number; // 0-1
  reasoning: string;
  suggestedPath: string;
  alternativeAssignments?: CategoryAssignment[];
  isManual: boolean;
  timestamp: Date;
}

// ================================
// AI Service Types
// ================================

export interface AIProvider {
  id: string;
  name: string;
  type: 'local' | 'cloud';
  status: AIProviderStatus;
  models: AIModel[];
  config: AIProviderConfig;
  capabilities: AICapability[];
}

export enum AIProviderStatus {
  OFFLINE = 'offline',
  CONNECTING = 'connecting',
  ONLINE = 'online',
  ERROR = 'error',
  UPDATING = 'updating'
}

export interface AIModel {
  id: string;
  name: string;
  version: string;
  size: number; // in bytes
  parameters: string; // e.g., "1B", "7B"
  description?: string;
  isDownloaded: boolean;
  isActive: boolean;
  downloadProgress?: number; // 0-100
  capabilities: AICapability[];
  performance: ModelPerformance;
}

export enum AICapability {
  FILE_CATEGORIZATION = 'file_categorization',
  TEXT_ANALYSIS = 'text_analysis',
  IMAGE_ANALYSIS = 'image_analysis',
  METADATA_EXTRACTION = 'metadata_extraction',
  BATCH_PROCESSING = 'batch_processing',
  CUSTOM_RULES = 'custom_rules'
}

export interface ModelPerformance {
  avgResponseTime: number; // milliseconds
  accuracy: number; // 0-1
  throughput: number; // files per minute
  memoryUsage: number; // MB
  lastBenchmark: Date;
}

export interface AIProviderConfig {
  endpoint?: string;
  apiKey?: string;
  timeout: number;
  maxConcurrentRequests: number;
  retryAttempts: number;
  customHeaders?: Record<string, string>;
}

export interface AIAnalysisRequest {
  files: string[];
  analysisType: AIAnalysisType;
  options: AIAnalysisOptions;
  priority: 'low' | 'normal' | 'high';
}

export enum AIAnalysisType {
  CATEGORIZATION = 'categorization',
  METADATA_EXTRACTION = 'metadata_extraction',
  CONTENT_ANALYSIS = 'content_analysis',
  SIMILARITY_DETECTION = 'similarity_detection',
  DUPLICATE_DETECTION = 'duplicate_detection'
}

export interface AIAnalysisOptions {
  includeContent: boolean;
  includeMetadata: boolean;
  customPrompt?: string;
  confidenceThreshold: number;
  maxTokens?: number;
  temperature?: number;
}

export interface AIAnalysisResult {
  fileId: string;
  analysisType: AIAnalysisType;
  result: unknown;
  confidence: number;
  processingTime: number;
  model: string;
  timestamp: Date;
  error?: string;
}

// ================================
// Ollama-specific Types
// ================================

export interface OllamaModel {
  name: string;
  size: string; // Human readable size like "3.8 GB"
  modified_at: string; // ISO string from Ollama API
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaConfiguration {
  host: string;
  timeout: number;
  model: string;
}

export interface OllamaRequest {
  model?: string; // Optional, can use default from configuration
  prompt: string;
  stream?: boolean;
  format?: string;
  options?: OllamaOptions;
  system?: string;
  template?: string;
  context?: number[];
  raw?: boolean;
}

export interface OllamaOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  seed?: number;
  num_ctx?: number;
  num_batch?: number;
  num_gqa?: number;
  num_gpu?: number;
  main_gpu?: number;
  low_vram?: boolean;
  f16_kv?: boolean;
  logits_all?: boolean;
  vocab_only?: boolean;
  use_mmap?: boolean;
  use_mlock?: boolean;
  embedding_only?: boolean;
  rope_frequency_base?: number;
  rope_frequency_scale?: number;
  num_thread?: number;
}

export interface OllamaResponse {
  model: string;
  created_at: string; // ISO string from Ollama API
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// ================================
// File Info Type for AI Analysis
// ================================

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  extension?: string;
  lastModified: Date;
  content?: string; // Optional file content for analysis
}

// ================================
// AI Analysis Result Types
// ================================

export interface FileOrganizationSuggestion {
  category: string;
  subcategory: string;
  confidence: number; // 0-1
  reasoning: string;
}

// ================================
// Organization Operation Types
// ================================

export interface OrganizationSession {
  id: string;
  name: string;
  rootPath: string;
  structureId: string;
  status: SessionStatus;
  createdAt: Date;
  completedAt?: Date;
  filesProcessed: number;
  filesTotal: number;
  operations: OrganizationOperation[];
  settings: OrganizationSettings;
  progress: SessionProgress;
}

export enum SessionStatus {
  CREATED = 'created',
  SCANNING = 'scanning',
  ANALYZING = 'analyzing',
  ORGANIZING = 'organizing',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export interface OrganizationOperation {
  id: string;
  type: OperationType;
  sourceFiles: string[];
  targetPath: string;
  status: OperationStatus;
  timestamp: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

export enum OperationType {
  MOVE = 'move',
  COPY = 'copy',
  CREATE_DIRECTORY = 'create_directory',
  DELETE = 'delete',
  RENAME = 'rename',
  BACKUP = 'backup',
  RESTORE = 'restore'
}

export enum OperationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  ROLLED_BACK = 'rolled_back'
}

export interface OrganizationSettings {
  previewMode: boolean;
  createBackup: boolean;
  confirmOperations: boolean;
  skipDuplicates: boolean;
  overwriteExisting: boolean;
  preserveStructure: boolean;
  handleConflicts: ConflictResolution;
  maxFileSize: number; // MB
  excludedExtensions: string[];
  excludedPaths: string[];
  batchSize: number;
  parallelOperations: number;
}

export enum ConflictResolution {
  ASK = 'ask',
  SKIP = 'skip',
  OVERWRITE = 'overwrite',
  RENAME = 'rename',
  MERGE = 'merge'
}

export interface SessionProgress {
  phase: SessionStatus;
  percentage: number;
  currentFile?: string;
  filesRemaining: number;
  estimatedTimeRemaining?: number;
  operationsCompleted: number;
  operationsFailed: number;
  throughput: number; // files per minute
}

// ================================
// Application State Types
// ================================

export interface AppSettings {
  theme: ThemeSettings;
  scan: ScanSettings;
  ai: AISettings;
  organization: UserOrganizationSettings;
  general: GeneralSettings;
}

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'system' | 'high_contrast';
  primaryColor: string;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  compactMode: boolean;
}

export interface ScanSettings {
  maxDepth: number;
  includeHidden: boolean;
  excludePatterns: string[];
  maxFileSize: number; // in bytes
  followSymlinks: boolean;
}

export interface AISettings {
  provider: 'ollama' | 'openai' | 'anthropic' | 'local';
  model: string;
  maxTokens: number;
  temperature: number;
  endpoint: string;
  enabled: boolean;
}

export interface UserOrganizationSettings {
  autoOrganize: boolean;
  confirmBeforeMove: boolean;
  createBackups: boolean;
  preserveOriginalStructure: boolean;
}

export interface GeneralSettings {
  language: string;
  autoSave: boolean;
  confirmOnExit: boolean;
  showTips: boolean;
  checkForUpdates: boolean;
}

// Legacy interface for backward compatibility
export interface LegacyAppSettings {
  theme: ThemeMode;
  language: string;
  autoSave: boolean;
  autoBackup: boolean;
  backupLocation?: string;
  aiProvider: string;
  aiModel: string;
  previewMode: boolean;
  confirmMoves: boolean;
  showHiddenFiles: boolean;
  maxFileSize: number;
  excludedExtensions: string[];
  excludedPaths: string[];
  keyboardShortcuts: Record<string, string>;
  accessibility: AccessibilitySettings;
  performance: PerformanceSettings;
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
  HIGH_CONTRAST = 'high_contrast'
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

export interface PerformanceSettings {
  enableVirtualization: boolean;
  itemsPerPage: number;
  preloadThreshold: number;
  cacheSize: number; // MB
  enablePrefetching: boolean;
  backgroundProcessing: boolean;
}

export interface ViewState {
  leftPanePath: string;
  rightPanePath: string;
  activePane: 'left' | 'right';
  viewMode: ViewMode;
  sortBy: SortCriteria;
  sortOrder: 'asc' | 'desc';
  filterCriteria: FilterCriteria;
  selectedItems: string[];
  expandedDirectories: Set<string>;
  pinnedPaths: string[];
}

export enum ViewMode {
  LIST = 'list',
  GRID = 'grid',
  TREE = 'tree',
  DETAILS = 'details'
}

export interface SortCriteria {
  field: 'name' | 'size' | 'modified' | 'created' | 'type' | 'extension';
  direction: 'asc' | 'desc';
}

export interface FilterCriteria {
  showHidden: boolean;
  fileTypes: string[];
  sizeRange: [number, number];
  dateRange: [Date, Date];
  searchQuery: string;
  tags: string[];
}

// ================================
// UI Component Types
// ================================

export interface TreeNodeData extends FileSystemItem {
  isExpanded: boolean;
  isSelected: boolean;
  level: number;
  hasChildren: boolean;
  isLoading: boolean;
  parent?: TreeNodeData;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  separator?: boolean;
  children?: ContextMenuAction[];
  onClick: (items: FileSystemItem[]) => void;
}

export interface DragDropData {
  items: FileSystemItem[];
  sourcePane: 'left' | 'right';
  operation: 'move' | 'copy';
  timestamp: Date;
}

export interface ProgressIndicator {
  id: string;
  title: string;
  description?: string;
  progress: number; // 0-100
  isIndeterminate: boolean;
  canCancel: boolean;
  status: 'running' | 'completed' | 'error' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

// ================================
// Validation and Error Types
// ================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface AppError {
  id: string;
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  stack?: string;
  recoverable: boolean;
  userMessage?: string;
}

export enum ErrorType {
  FILE_SYSTEM = 'file_system',
  PERMISSION = 'permission',
  NETWORK = 'network',
  AI_SERVICE = 'ai_service',
  VALIDATION = 'validation',
  DATABASE = 'database',
  CONFIGURATION = 'configuration',
  UNKNOWN = 'unknown'
}

// ================================
// Utility Types
// ================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: AppError;
  timestamp: Date;
  requestId: string;
}

// ================================
// Event Types
// ================================

export interface AppEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
  source: string;
}

export interface FileSystemEvent extends AppEvent {
  type: 'file_created' | 'file_modified' | 'file_deleted' | 'directory_created' | 'directory_deleted';
  payload: {
    path: string;
    item?: FileSystemItem;
  };
}

export interface OrganizationEvent extends AppEvent {
  type: 'session_started' | 'session_completed' | 'session_paused' | 'operation_completed' | 'progress_updated';
  payload: {
    sessionId: string;
    data?: unknown;
  };
}

export interface AIServiceEvent extends AppEvent {
  type: 'provider_status_changed' | 'model_downloaded' | 'analysis_completed' | 'error_occurred';
  payload: {
    providerId?: string;
    modelId?: string;
    data?: unknown;
  };
}

// ================================
// Configuration Types
// ================================

export interface OrganizationRule {
  id: string;
  name: string;
  description?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  isEnabled: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

export interface RuleCondition {
  field: 'extension' | 'name' | 'size' | 'path' | 'content' | 'modified_date';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'greater_than' | 'less_than' | 'between';
  value: string | number | [number, number];
  caseSensitive?: boolean;
}

export interface RuleAction {
  type: 'assign_category' | 'add_tag' | 'set_priority' | 'exclude' | 'custom';
  parameters: Record<string, unknown>;
}

export interface CategoryRule {
  fileExtensions: string[];
  namePatterns: string[];
  sizeRange?: [number, number];
  contentPatterns?: string[];
  confidence: number;
}

// ================================
// Organization Engine Types
// ================================

export interface JohnnyDecimalConfiguration {
  maxAreas: number;
  maxCategoriesPerArea: number;
  maxItemsPerCategory: number;
  autoCreateStructure: boolean;
  conflictResolution: 'ask' | 'skip' | 'overwrite' | 'rename' | 'merge';
}

export interface OrganizationSuggestion {
  file: FileInfo;
  suggestedArea: {
    number: number;
    name: string;
  };
  suggestedCategory: {
    number: number;
    name: string;
  };
  suggestedItem?: {
    number: string;
    name: string;
  };
  confidence: number;
  reasoning: string;
}

// ================================
// Settings Service Types
// ================================

export interface SettingsChangeEvent {
  type: 'theme' | 'scan' | 'ai' | 'organization' | 'general' | 'reset';
  settings: ThemeSettings | ScanSettings | AISettings | UserOrganizationSettings | GeneralSettings | AppSettings;
  timestamp: Date;
}

export interface SettingsExport {
  settings: AppSettings;
  exportedAt: string;
  version: string;
  metadata?: Record<string, unknown>;
}

export interface SettingsValidationResult {
  isValid: boolean;
  errors: SettingsValidationError[];
  warnings: SettingsValidationWarning[];
}

export interface SettingsValidationError {
  field: string;
  message: string;
  value: unknown;
  expectedType?: string;
}

export interface SettingsValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

// ================================
// Export all types
// ================================

export type {
  // Re-export commonly used types for convenience
  FileSystemItem as FSItem,
  JohnnyDecimalStructure as JDStructure,
  OrganizationSession as OrgSession,
  AppSettings as Settings,
  ViewState as View,
  AppError as Error
};