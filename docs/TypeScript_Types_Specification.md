# AI File Organizer - TypeScript Types Specification

## 📋 Overview

This document defines all TypeScript interfaces, types, and enums that will be used throughout the AI File Organizer application. These types ensure type safety, better developer experience, and clear contracts between different parts of the application.

## 🗂️ Core Domain Types

### File System Types

```typescript
// fileSystem.ts - Core file system types

export interface FileSystemNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  lastModified: Date;
  created: Date;
  parent?: string;
  children?: string[];
  metadata?: FileMetadata;
}

export interface FileItem extends FileSystemNode {
  type: 'file';
  extension: string;
  mimeType: string;
  checksum: string;
  isHidden: boolean;
  permissions: FilePermissions;
  analysis?: FileAnalysis;
}

export interface DirectoryItem extends FileSystemNode {
  type: 'directory';
  childCount: number;
  totalSize: number;
  isEmpty: boolean;
  isExpanded: boolean;
  isWatched: boolean;
}

export interface FileSystemTree {
  root: DirectoryItem;
  nodes: Map<string, FileSystemNode>;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  lastScanned: Date;
  scanDuration: number;
}

export interface FileMetadata {
  title?: string;
  description?: string;
  author?: string;
  keywords?: string[];
  dateCreated?: Date;
  dateModified?: Date;
  dimensions?: ImageDimensions;
  duration?: number; // for audio/video files
  pageCount?: number; // for documents
  language?: string;
  encoding?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  colorDepth: number;
  hasAlpha: boolean;
}

export interface FilePermissions {
  readable: boolean;
  writable: boolean;
  executable: boolean;
  owner: string;
  group: string;
  mode: string;
}

export interface FileAnalysis {
  contentType: ContentType;
  category: string;
  confidence: number;
  tags: string[];
  extractedText?: string;
  aiSuggestion?: AISuggestion;
  ruleMatches: RuleMatch[];
}

export enum ContentType {
  DOCUMENT = 'document',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  ARCHIVE = 'archive',
  CODE = 'code',
  DATA = 'data',
  EXECUTABLE = 'executable',
  FONT = 'font',
  UNKNOWN = 'unknown'
}

export interface ScanProgress {
  currentPath: string;
  filesScanned: number;
  directoriesScanned: number;
  totalEstimated: number;
  bytesProcessed: number;
  startTime: Date;
  estimatedCompletion?: Date;
  status: ScanStatus;
  errors: ScanError[];
}

export enum ScanStatus {
  INITIALIZING = 'initializing',
  SCANNING = 'scanning',
  ANALYZING = 'analyzing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}

export interface ScanError {
  path: string;
  error: string;
  timestamp: Date;
  severity: 'warning' | 'error';
}
```

### Organization System Types

```typescript
// organization.ts - Organization system types

export interface OrganizationScheme {
  id: string;
  name: string;
  type: OrganizationType;
  description: string;
  rules: OrganizationRule[];
  structure?: JohnnyDecimalStructure;
  created: Date;
  lastModified: Date;
  isActive: boolean;
}

export enum OrganizationType {
  JOHNNY_DECIMAL = 'johnny-decimal',
  FILE_TYPE = 'file-type',
  DATE_BASED = 'date-based',
  CUSTOM = 'custom',
  AI_SUGGESTED = 'ai-suggested'
}

export interface OrganizationRule {
  id: string;
  name: string;
  description: string;
  criteria: RuleCriteria;
  action: RuleAction;
  priority: number;
  isActive: boolean;
  confidence: number;
  userCreated: boolean;
  lastUsed?: Date;
  usage: RuleUsage;
}

export interface RuleCriteria {
  fileExtensions?: string[];
  fileNamePatterns?: string[];
  fileSizeRange?: SizeRange;
  dateRange?: DateRange;
  contentTypes?: ContentType[];
  pathPatterns?: string[];
  metadata?: MetadataCriteria;
  aiTags?: string[];
}

export interface RuleAction {
  type: ActionType;
  destination: string;
  folderTemplate?: string;
  renamePattern?: string;
  copyMode?: CopyMode;
  backup?: boolean;
}

export enum ActionType {
  MOVE = 'move',
  COPY = 'copy',
  CATEGORIZE = 'categorize',
  RENAME = 'rename',
  DELETE = 'delete',
  IGNORE = 'ignore'
}

export enum CopyMode {
  COPY = 'copy',
  MOVE = 'move',
  LINK = 'link'
}

export interface SizeRange {
  min?: number;
  max?: number;
  unit: SizeUnit;
}

export enum SizeUnit {
  BYTES = 'bytes',
  KB = 'kb',
  MB = 'mb',
  GB = 'gb'
}

export interface DateRange {
  start?: Date;
  end?: Date;
  relative?: RelativeDate;
}

export interface RelativeDate {
  value: number;
  unit: TimeUnit;
  direction: 'before' | 'after';
}

export enum TimeUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

export interface MetadataCriteria {
  title?: string;
  author?: string;
  keywords?: string[];
  hasMetadata?: boolean;
}

export interface RuleMatch {
  ruleId: string;
  confidence: number;
  appliedAction: RuleAction;
  timestamp: Date;
}

export interface RuleUsage {
  timesApplied: number;
  lastApplied?: Date;
  successRate: number;
  userOverrides: number;
}

export interface OrganizationResult {
  changes: OrganizationChange[];
  conflicts: OrganizationConflict[];
  summary: OrganizationSummary;
  backupId?: string;
  timestamp: Date;
}

export interface OrganizationChange {
  id: string;
  type: ChangeType;
  source: string;
  destination: string;
  fileId: string;
  ruleId?: string;
  confidence: number;
  status: ChangeStatus;
  error?: string;
}

export enum ChangeType {
  MOVE_FILE = 'move-file',
  COPY_FILE = 'copy-file',
  CREATE_FOLDER = 'create-folder',
  RENAME_FILE = 'rename-file',
  DELETE_FILE = 'delete-file'
}

export enum ChangeStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface OrganizationConflict {
  id: string;
  type: ConflictType;
  description: string;
  affectedFiles: string[];
  suggestedResolution: ConflictResolution;
  severity: ConflictSeverity;
}

export enum ConflictType {
  NAMING_CONFLICT = 'naming-conflict',
  CATEGORY_AMBIGUITY = 'category-ambiguity',
  RULE_CONFLICT = 'rule-conflict',
  PERMISSION_DENIED = 'permission-denied',
  DISK_SPACE = 'disk-space'
}

export interface ConflictResolution {
  action: ResolutionAction;
  parameters: Record<string, any>;
  autoApplicable: boolean;
}

export enum ResolutionAction {
  RENAME_TARGET = 'rename-target',
  OVERWRITE = 'overwrite',
  SKIP = 'skip',
  CREATE_UNIQUE_NAME = 'create-unique-name',
  MANUAL_REVIEW = 'manual-review'
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface OrganizationSummary {
  totalFiles: number;
  filesProcessed: number;
  filesSkipped: number;
  foldersCreated: number;
  errorsEncountered: number;
  timeElapsed: number;
  spaceReclaimed: number;
}
```

### Johnny Decimal System Types

```typescript
// johnnyDecimal.ts - Johnny Decimal specific types

export interface JohnnyDecimalStructure {
  id: string;
  name: string;
  rootPath: string;
  areas: JDArea[];
  created: Date;
  lastModified: Date;
  version: string;
  metadata: JDMetadata;
}

export interface JDArea {
  id: string;
  number: number; // 10-19, 20-29, etc.
  name: string;
  description: string;
  color?: string;
  categories: JDCategory[];
  totalFiles: number;
  totalSize: number;
}

export interface JDCategory {
  id: string;
  areaNumber: number;
  categoryNumber: number; // 11, 12, 13, etc.
  name: string;
  description: string;
  items: JDItem[];
  rules: CategoryRule[];
  fileTypes: ContentType[];
}

export interface JDItem {
  id: string;
  areaNumber: number;
  categoryNumber: number;
  itemNumber: number; // 11.01, 11.02, etc.
  name: string;
  description: string;
  path: string;
  files: string[];
  created: Date;
  lastModified: Date;
}

export interface CategoryRule {
  pattern: string;
  fileTypes: string[];
  description: string;
  examples: string[];
}

export interface JDMetadata {
  purpose: string;
  owner: string;
  tags: string[];
  version: string;
  template?: string;
}

export interface JDValidationResult {
  isValid: boolean;
  errors: JDValidationError[];
  warnings: JDValidationWarning[];
  suggestions: JDSuggestion[];
}

export interface JDValidationError {
  type: JDErrorType;
  message: string;
  location: JDLocation;
  severity: 'error' | 'warning';
}

export enum JDErrorType {
  DUPLICATE_NUMBER = 'duplicate-number',
  INVALID_RANGE = 'invalid-range',
  MISSING_ITEMS = 'missing-items',
  NAMING_CONVENTION = 'naming-convention',
  STRUCTURE_VIOLATION = 'structure-violation'
}

export interface JDValidationWarning {
  type: string;
  message: string;
  location: JDLocation;
}

export interface JDLocation {
  area?: number;
  category?: number;
  item?: number;
  path?: string;
}

export interface JDSuggestion {
  type: 'optimization' | 'expansion' | 'reorganization';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  autoApplicable: boolean;
}

export interface JDTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  areas: JDAreaTemplate[];
  tags: string[];
  popularity: number;
  author: string;
}

export enum TemplateCategory {
  PERSONAL = 'personal',
  BUSINESS = 'business',
  CREATIVE = 'creative',
  ACADEMIC = 'academic',
  TECHNICAL = 'technical'
}

export interface JDAreaTemplate {
  numberRange: [number, number];
  name: string;
  description: string;
  suggestedCategories: JDCategoryTemplate[];
}

export interface JDCategoryTemplate {
  number: number;
  name: string;
  description: string;
  commonFileTypes: string[];
  examples: string[];
}
```

### AI Integration Types

```typescript
// ai.ts - AI and LLM integration types

export interface AIService {
  name: string;
  type: AIServiceType;
  status: AIServiceStatus;
  capabilities: AICapability[];
  config: AIServiceConfig;
}

export enum AIServiceType {
  OLLAMA = 'ollama',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  LOCAL_TRANSFORMER = 'local-transformer'
}

export enum AIServiceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  INSTALLING = 'installing'
}

export enum AICapability {
  FILE_CATEGORIZATION = 'file-categorization',
  CONTENT_ANALYSIS = 'content-analysis',
  TEXT_EXTRACTION = 'text-extraction',
  IMAGE_ANALYSIS = 'image-analysis',
  NAMING_SUGGESTIONS = 'naming-suggestions',
  FOLDER_STRUCTURE = 'folder-structure'
}

export interface AIServiceConfig {
  baseUrl?: string;
  apiKey?: string;
  model: string;
  timeout: number;
  maxTokens: number;
  temperature: number;
  batchSize: number;
}

export interface LocalModel {
  name: string;
  displayName: string;
  size: string;
  memoryRequirement: number;
  contextLength: number;
  downloadUrl: string;
  modelfile?: string;
  isInstalled: boolean;
  isActive: boolean;
  downloadProgress?: DownloadProgress;
}

export interface DownloadProgress {
  status: DownloadStatus;
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  speed: number;
  timeRemaining: number;
  error?: string;
}

export enum DownloadStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  EXTRACTING = 'extracting',
  INSTALLING = 'installing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface FileAnalysisRequest {
  fileName: string;
  filePath: string;
  fileExtension: string;
  fileSize: number;
  mimeType: string;
  existingStructure: JohnnyDecimalStructure;
  organizationScheme: OrganizationType;
  context?: AnalysisContext;
}

export interface AnalysisContext {
  siblingFiles: string[];
  parentDirectory: string;
  userHistory: UserAction[];
  customRules: OrganizationRule[];
}

export interface AIAnalysisResult {
  suggestedCategory: string;
  confidence: number;
  reasoning: string;
  alternativeCategories: CategorySuggestion[];
  extractedMetadata?: Record<string, any>;
  tags: string[];
  warnings: string[];
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reasoning: string;
  johnnyDecimalPath?: string;
}

export interface AISuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  confidence: number;
  impact: SuggestionImpact;
  files: string[];
  action: SuggestedAction;
  reasoning: string;
  alternatives: AISuggestion[];
}

export enum SuggestionType {
  FILE_MOVE = 'file-move',
  FOLDER_CREATE = 'folder-create',
  RULE_CREATE = 'rule-create',
  STRUCTURE_OPTIMIZE = 'structure-optimize',
  NAMING_IMPROVE = 'naming-improve'
}

export interface SuggestionImpact {
  filesAffected: number;
  timeToApply: number;
  reversible: boolean;
  riskLevel: RiskLevel;
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface SuggestedAction {
  type: ActionType;
  parameters: Record<string, any>;
  preview: ActionPreview;
}

export interface ActionPreview {
  before: string;
  after: string;
  changes: PreviewChange[];
}

export interface PreviewChange {
  type: 'create' | 'move' | 'rename' | 'delete';
  path: string;
  newPath?: string;
  size?: number;
}

export interface ModelInfo {
  name: string;
  size: number;
  parameterSize: string;
  quantizationLevel: string;
  architecture: string;
  family: string;
  capabilities: AICapability[];
  performance: ModelPerformance;
}

export interface ModelPerformance {
  speed: number; // tokens per second
  memoryUsage: number; // MB
  accuracy: number; // 0-1 scale
  lastBenchmark: Date;
}

export interface AIAnalysisHistory {
  requests: AIAnalysisRequest[];
  results: AIAnalysisResult[];
  performance: PerformanceMetrics;
  userFeedback: UserFeedback[];
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  totalRequests: number;
  successRate: number;
  averageConfidence: number;
  cacheHitRate: number;
}

export interface UserFeedback {
  analysisId: string;
  wasCorrect: boolean;
  userCorrection?: string;
  confidence: number;
  timestamp: Date;
}
```

## 🎨 UI Component Types

### Component Props Types

```typescript
// components.ts - UI component types

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

export interface ButtonProps extends BaseComponentProps {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export enum ButtonVariant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  OUTLINE = 'outline',
  GHOST = 'ghost',
  DANGER = 'danger'
}

export enum ButtonSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export enum ModalSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  FULLSCREEN = 'fullscreen'
}

export interface TreeViewProps extends BaseComponentProps {
  data: TreeNode[];
  selectedItems: string[];
  expandedItems: string[];
  multiSelect?: boolean;
  draggable?: boolean;
  editable?: boolean;
  onSelect: (itemIds: string[]) => void;
  onExpand: (itemId: string) => void;
  onDragStart?: (item: TreeNode) => void;
  onDrop?: (item: TreeNode, target: TreeNode) => void;
  onRename?: (itemId: string, newName: string) => void;
  renderNode?: (node: TreeNode) => React.ReactNode;
}

export interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  icon?: React.ReactNode;
  size?: number;
  lastModified?: Date;
  metadata?: Record<string, any>;
  isExpanded?: boolean;
  isSelected?: boolean;
  isDragTarget?: boolean;
  isEditing?: boolean;
}

export interface ProgressBarProps extends BaseComponentProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  color?: ProgressColor;
  size?: ProgressSize;
}

export enum ProgressColor {
  PRIMARY = 'primary',
  SUCCESS = 'success',
  WARNING = 'warning',
  DANGER = 'danger'
}

export enum ProgressSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export interface FormFieldProps extends BaseComponentProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
}

export interface InputProps extends FormFieldProps {
  type: InputType;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  maxLength?: number;
}

export enum InputType {
  TEXT = 'text',
  EMAIL = 'email',
  PASSWORD = 'password',
  NUMBER = 'number',
  SEARCH = 'search',
  URL = 'url'
}

export interface SelectProps extends FormFieldProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  multiSelect?: boolean;
  onChange: (value: string | string[]) => void;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
}
```

### Theme and Styling Types

```typescript
// themes.ts - Theme and styling types

export interface Theme {
  name: string;
  colors: ColorPalette;
  typography: Typography;
  spacing: Spacing;
  shadows: Shadows;
  borderRadius: BorderRadius;
  animation: Animation;
}

export interface ColorPalette {
  primary: ColorScale;
  secondary: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  danger: ColorScale;
  neutral: ColorScale;
  background: BackgroundColors;
  text: TextColors;
  border: BorderColors;
}

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface BackgroundColors {
  primary: string;
  secondary: string;
  tertiary: string;
  surface: string;
  overlay: string;
}

export interface TextColors {
  primary: string;
  secondary: string;
  tertiary: string;
  inverse: string;
  disabled: string;
  link: string;
  linkHover: string;
}

export interface BorderColors {
  primary: string;
  secondary: string;
  focus: string;
  error: string;
  success: string;
  warning: string;
}

export interface Typography {
  fontFamily: FontFamily;
  fontSize: FontSize;
  fontWeight: FontWeight;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
}

export interface FontFamily {
  sans: string;
  serif: string;
  mono: string;
}

export interface FontSize {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface FontWeight {
  thin: number;
  light: number;
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
  extrabold: number;
}

export interface LineHeight {
  tight: number;
  normal: number;
  relaxed: number;
  loose: number;
}

export interface LetterSpacing {
  tight: string;
  normal: string;
  wide: string;
}

export interface Spacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
}

export interface Shadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  inner: string;
  none: string;
}

export interface BorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface Animation {
  duration: AnimationDuration;
  easing: AnimationEasing;
}

export interface AnimationDuration {
  fast: number;
  normal: number;
  slow: number;
}

export interface AnimationEasing {
  easeIn: string;
  easeOut: string;
  easeInOut: string;
  linear: string;
}
```

## 🔧 Application State Types

### Store Types

```typescript
// stores.ts - Application state types

export interface AppState {
  // Application lifecycle
  isInitialized: boolean;
  isLoading: boolean;
  error: AppError | null;
  
  // Current operation
  currentPath: string | null;
  currentOperation: Operation | null;
  operationProgress: OperationProgress | null;
  
  // UI state
  theme: ThemeMode;
  language: Language;
  activeModal: ModalType | null;
  sidebarCollapsed: boolean;
  
  // User preferences
  preferences: UserPreferences;
  recentPaths: string[];
  
  // Performance
  performance: PerformanceState;
}

export interface Operation {
  id: string;
  type: OperationType;
  status: OperationStatus;
  startTime: Date;
  endTime?: Date;
  progress: number;
  message: string;
  cancellable: boolean;
  error?: string;
}

export enum OperationType {
  SCAN_DIRECTORY = 'scan-directory',
  ANALYZE_FILES = 'analyze-files',
  ORGANIZE_FILES = 'organize-files',
  BACKUP_CREATE = 'backup-create',
  BACKUP_RESTORE = 'backup-restore',
  MODEL_DOWNLOAD = 'model-download',
  OLLAMA_INSTALL = 'ollama-install'
}

export enum OperationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export interface OperationProgress {
  current: number;
  total: number;
  percentage: number;
  rate: number;
  eta: number;
  message: string;
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export enum Language {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  JAPANESE = 'ja',
  CHINESE = 'zh'
}

export enum ModalType {
  SETTINGS = 'settings',
  ABOUT = 'about',
  CONFIRMATION = 'confirmation',
  ERROR = 'error',
  FIRST_TIME_SETUP = 'first-time-setup',
  MODEL_SELECTION = 'model-selection',
  BACKUP_RESTORE = 'backup-restore',
  ORGANIZATION_PREVIEW = 'organization-preview'
}

export interface UserPreferences {
  autoSave: boolean;
  confirmDangerous: boolean;
  showHiddenFiles: boolean;
  defaultOrganization: OrganizationType;
  backupRetention: number; // days
  aiConfidenceThreshold: number;
  performanceMode: PerformanceMode;
  shortcuts: KeyboardShortcuts;
  accessibility: AccessibilitySettings;
}

export enum PerformanceMode {
  PERFORMANCE = 'performance',
  BALANCED = 'balanced',
  EFFICIENCY = 'efficiency'
}

export interface KeyboardShortcuts {
  selectFolder: string;
  analyze: string;
  applyChanges: string;
  undo: string;
  redo: string;
  settings: string;
  quit: string;
  toggleTheme: string;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface PerformanceState {
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  cacheSize: number;
  networkLatency: number;
  lastMeasured: Date;
}

export interface AppError {
  id: string;
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
  severity: ErrorSeverity;
  context?: ErrorContext;
  recoverable: boolean;
}

export enum ErrorType {
  NETWORK = 'network',
  FILE_SYSTEM = 'file-system',
  AI_SERVICE = 'ai-service',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  operation?: string;
  filePath?: string;
  component?: string;
  userId?: string;
  sessionId?: string;
  stackTrace?: string;
}
```

## 🔄 Event and Action Types

```typescript
// events.ts - Event system types

export interface AppEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: EventSource;
  data: EventData;
  userId?: string;
}

export enum EventType {
  // File system events
  FILE_CREATED = 'file-created',
  FILE_MODIFIED = 'file-modified',
  FILE_DELETED = 'file-deleted',
  FILE_MOVED = 'file-moved',
  DIRECTORY_CREATED = 'directory-created',
  DIRECTORY_DELETED = 'directory-deleted',
  
  // Organization events
  ORGANIZATION_STARTED = 'organization-started',
  ORGANIZATION_COMPLETED = 'organization-completed',
  ORGANIZATION_CANCELLED = 'organization-cancelled',
  RULE_APPLIED = 'rule-applied',
  BACKUP_CREATED = 'backup-created',
  
  // AI events
  AI_ANALYSIS_STARTED = 'ai-analysis-started',
  AI_ANALYSIS_COMPLETED = 'ai-analysis-completed',
  MODEL_DOWNLOADED = 'model-downloaded',
  MODEL_CHANGED = 'model-changed',
  
  // UI events
  THEME_CHANGED = 'theme-changed',
  SETTINGS_UPDATED = 'settings-updated',
  ERROR_OCCURRED = 'error-occurred',
  
  // System events
  APP_STARTED = 'app-started',
  APP_CLOSED = 'app-closed',
  UPDATE_AVAILABLE = 'update-available'
}

export enum EventSource {
  USER = 'user',
  SYSTEM = 'system',
  AI = 'ai',
  FILE_WATCHER = 'file-watcher',
  BACKGROUND_TASK = 'background-task'
}

export type EventData = 
  | FileEventData
  | OrganizationEventData
  | AIEventData
  | UIEventData
  | SystemEventData;

export interface FileEventData {
  path: string;
  size?: number;
  oldPath?: string; // for move events
  newPath?: string; // for move events
  fileType?: string;
}

export interface OrganizationEventData {
  scheme: OrganizationType;
  filesAffected: number;
  duration: number;
  success: boolean;
  backupId?: string;
}

export interface AIEventData {
  model: string;
  operation: string;
  duration: number;
  confidence?: number;
  tokensUsed?: number;
}

export interface UIEventData {
  component: string;
  action: string;
  value?: any;
}

export interface SystemEventData {
  version?: string;
  platform?: string;
  memory?: number;
  performance?: PerformanceMetrics;
}

export interface UserAction {
  id: string;
  type: UserActionType;
  timestamp: Date;
  context: ActionContext;
  result: ActionResult;
}

export enum UserActionType {
  FILE_SELECT = 'file-select',
  FOLDER_ORGANIZE = 'folder-organize',
  RULE_CREATE = 'rule-create',
  RULE_MODIFY = 'rule-modify',
  SUGGESTION_ACCEPT = 'suggestion-accept',
  SUGGESTION_REJECT = 'suggestion-reject',
  BACKUP_CREATE = 'backup-create',
  BACKUP_RESTORE = 'backup-restore',
  SETTINGS_CHANGE = 'settings-change'
}

export interface ActionContext {
  path?: string;
  fileCount?: number;
  organizationType?: OrganizationType;
  previousValue?: any;
  newValue?: any;
}

export interface ActionResult {
  success: boolean;
  duration: number;
  changes: number;
  error?: string;
  feedback?: UserFeedback;
}
```

## 📦 API and Integration Types

```typescript
// api.ts - API and external integration types

export interface TauriCommand<T = any> {
  command: string;
  payload?: Record<string, any>;
  response: Promise<T>;
}

export interface OllamaAPI {
  generate: (request: GenerateRequest) => Promise<GenerateResponse>;
  pull: (request: PullRequest) => Promise<PullResponse>;
  list: () => Promise<ListResponse>;
  show: (request: ShowRequest) => Promise<ShowResponse>;
  delete: (request: DeleteRequest) => Promise<void>;
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: GenerateOptions;
  context?: number[];
}

export interface GenerateOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
}

export interface GenerateResponse {
  model: string;
  created_at: string;
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

export interface PullRequest {
  name: string;
  stream?: boolean;
}

export interface PullResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface ListResponse {
  models: ModelListItem[];
}

export interface ModelListItem {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: ModelDetails;
}

export interface ModelDetails {
  format: string;
  family: string;
  families?: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface ShowRequest {
  name: string;
}

export interface ShowResponse {
  license: string;
  modelfile: string;
  parameters: string;
  template: string;
  details: ModelDetails;
}

export interface DeleteRequest {
  name: string;
}

// Tauri-specific types
export interface TauriFileSystemAPI {
  scanDirectory: (path: string) => Promise<FileSystemTree>;
  getFileMetadata: (path: string) => Promise<FileMetadata>;
  moveFile: (source: string, destination: string) => Promise<void>;
  copyFile: (source: string, destination: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  watchDirectory: (path: string) => Promise<string>; // Returns watcher ID
  unwatchDirectory: (watcherId: string) => Promise<void>;
}

export interface TauriSystemAPI {
  getSystemInfo: () => Promise<SystemInfo>;
  openPath: (path: string) => Promise<void>;
  showInFolder: (path: string) => Promise<void>;
  requestPermissions: (permissions: Permission[]) => Promise<PermissionResult>;
  getAvailableSpace: (path: string) => Promise<number>;
}

export interface SystemInfo {
  platform: Platform;
  version: string;
  arch: string;
  totalMemory: number;
  availableMemory: number;
  cpuCount: number;
  cpuModel: string;
}

export enum Platform {
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux'
}

export enum Permission {
  READ_FILE = 'read-file',
  WRITE_FILE = 'write-file',
  CREATE_FILE = 'create-file',
  DELETE_FILE = 'delete-file',
  READ_DIRECTORY = 'read-directory',
  WRITE_DIRECTORY = 'write-directory'
}

export interface PermissionResult {
  granted: Permission[];
  denied: Permission[];
}
```

This comprehensive TypeScript types specification provides:

1. **Complete type coverage** for all application domains
2. **Consistent naming conventions** across all interfaces
3. **Extensible enums** for categorization and state management
4. **Detailed interfaces** for complex data structures
5. **API contract definitions** for external integrations
6. **UI component type safety** for React components
7. **Event system types** for application-wide communication
8. **State management types** for Zustand stores

These types will ensure type safety throughout the application development process and provide excellent developer experience with IntelliSense and compile-time error checking.