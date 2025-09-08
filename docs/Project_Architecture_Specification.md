# AI File Organizer - Project Architecture Specification

## 📋 Executive Summary

This document defines the complete architectural specification for the AI File Organizer application, including technology stack decisions, project structure, component architecture, and implementation guidelines.

## 🏗️ Architecture Overview

### Technology Stack Decision Matrix

| Component | Technology | Rationale | Alternatives Considered |
|-----------|------------|-----------|----------------------|
| **Desktop Framework** | Tauri 2.0 | Rust performance, small bundle size, native APIs | Electron (larger bundle), Flutter Desktop (less mature) |
| **Frontend Framework** | React 18+ | Large ecosystem, team familiarity, component reusability | Vue.js, Svelte, Angular |
| **Language** | TypeScript 5+ | Type safety, better development experience | JavaScript (less safe), ReScript |
| **Bundler** | Vite | Fast development, modern tooling, Tauri integration | Webpack, Parcel, Rollup |
| **Styling** | Tailwind CSS | Utility-first, consistent design system | Styled Components, Material-UI, Chakra UI |
| **State Management** | Zustand | Lightweight, TypeScript-first, simple API | Redux Toolkit, Jotai, Valtio |
| **AI/ML Backend** | Bundled Ollama | Privacy-first, offline capability, no API costs | OpenAI API, Anthropic API, Local transformers.js |
| **Local Database** | SQLite (via Tauri) | Embedded, cross-platform, SQL familiarity | IndexedDB, LevelDB, JSON files |
| **File Operations** | Tauri APIs + Rust | Native performance, cross-platform consistency | Node.js fs, Web File System API |

## 🏢 Project Structure

```
ai-file-organizer/
├── 📁 docs/                              # Documentation
│   ├── Technical_Architecture.md         # Technical details
│   ├── Folder_Organizer_Design_Document.md
│   ├── Incremental_Organization_Strategy.md
│   ├── Downloads_Johnny_Decimal_Mapping.md
│   └── Project_Architecture_Specification.md (this file)
│
├── 📁 src/                               # Frontend React application
│   ├── 📁 components/                    # React components
│   │   ├── 📁 common/                    # Shared/reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── index.ts
│   │   ├── 📁 layout/                    # Layout components
│   │   │   ├── AppHeader.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── 📁 file-explorer/            # File system components
│   │   │   ├── TreeView.tsx
│   │   │   ├── TreeNode.tsx
│   │   │   ├── FileItem.tsx
│   │   │   ├── FolderItem.tsx
│   │   │   ├── DualPaneView.tsx
│   │   │   └── index.ts
│   │   ├── 📁 organization/             # Organization features
│   │   │   ├── OrganizationPanel.tsx
│   │   │   ├── JohnnyDecimalSetup.tsx
│   │   │   ├── CategorySelector.tsx
│   │   │   ├── DragDropZone.tsx
│   │   │   ├── ProgressTracker.tsx
│   │   │   └── index.ts
│   │   ├── 📁 ai-integration/           # AI/LLM components
│   │   │   ├── ModelSelector.tsx
│   │   │   ├── AIStatusIndicator.tsx
│   │   │   ├── SuggestionPanel.tsx
│   │   │   ├── ConfidenceIndicator.tsx
│   │   │   └── index.ts
│   │   ├── 📁 settings/                 # Settings and configuration
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── GeneralSettings.tsx
│   │   │   ├── AISettings.tsx
│   │   │   ├── ThemeSettings.tsx
│   │   │   ├── AdvancedSettings.tsx
│   │   │   └── index.ts
│   │   └── 📁 onboarding/               # First-time setup
│   │       ├── WelcomeScreen.tsx
│   │       ├── OllamaSetup.tsx
│   │       ├── ModelInstallation.tsx
│   │       ├── TutorialModal.tsx
│   │       └── index.ts
│   │
│   ├── 📁 hooks/                        # Custom React hooks
│   │   ├── useFileSystem.ts
│   │   ├── useAI.ts
│   │   ├── useOrganization.ts
│   │   ├── useSettings.ts
│   │   ├── useDragDrop.ts
│   │   ├── useKeyboardShortcuts.ts
│   │   └── index.ts
│   │
│   ├── 📁 services/                     # Business logic services
│   │   ├── 📁 ai/                       # AI/LLM integration
│   │   │   ├── OllamaService.ts
│   │   │   ├── ModelManager.ts
│   │   │   ├── PromptTemplates.ts
│   │   │   └── index.ts
│   │   ├── 📁 file-system/              # File operations
│   │   │   ├── FileScanner.ts
│   │   │   ├── FileOperations.ts
│   │   │   ├── BackupManager.ts
│   │   │   ├── WatchService.ts
│   │   │   └── index.ts
│   │   ├── 📁 organization/             # Organization logic
│   │   │   ├── JohnnyDecimalEngine.ts
│   │   │   ├── CategoryMatcher.ts
│   │   │   ├── RuleEngine.ts
│   │   │   ├── ConflictResolver.ts
│   │   │   └── index.ts
│   │   ├── 📁 database/                 # Local data management
│   │   │   ├── DatabaseService.ts
│   │   │   ├── MetadataManager.ts
│   │   │   ├── SettingsStore.ts
│   │   │   └── index.ts
│   │   └── 📁 analytics/                # Usage analytics
│   │       ├── PerformanceTracker.ts
│   │       ├── UsageStats.ts
│   │       └── index.ts
│   │
│   ├── 📁 stores/                       # Zustand state stores
│   │   ├── appStore.ts                  # Global application state
│   │   ├── fileSystemStore.ts           # File system state
│   │   ├── organizationStore.ts         # Organization state
│   │   ├── aiStore.ts                   # AI/LLM state
│   │   ├── settingsStore.ts             # User settings
│   │   ├── uiStore.ts                   # UI state (modals, themes, etc.)
│   │   └── index.ts
│   │
│   ├── 📁 types/                        # TypeScript type definitions
│   │   ├── 📁 api/                      # API response types
│   │   │   ├── ollama.ts
│   │   │   ├── tauri.ts
│   │   │   └── index.ts
│   │   ├── 📁 core/                     # Core domain types
│   │   │   ├── fileSystem.ts
│   │   │   ├── organization.ts
│   │   │   ├── johnnyDecimal.ts
│   │   │   ├── ai.ts
│   │   │   └── index.ts
│   │   ├── 📁 ui/                       # UI component types
│   │   │   ├── components.ts
│   │   │   ├── themes.ts
│   │   │   ├── events.ts
│   │   │   └── index.ts
│   │   └── global.d.ts                  # Global type declarations
│   │
│   ├── 📁 utils/                        # Utility functions
│   │   ├── 📁 file/                     # File utilities
│   │   │   ├── pathUtils.ts
│   │   │   ├── mimeTypeDetection.ts
│   │   │   ├── sizeFormatting.ts
│   │   │   └── index.ts
│   │   ├── 📁 ui/                       # UI utilities
│   │   │   ├── classNames.ts
│   │   │   ├── animations.ts
│   │   │   ├── accessibility.ts
│   │   │   └── index.ts
│   │   ├── 📁 validation/               # Validation utilities
│   │   │   ├── fileValidation.ts
│   │   │   ├── pathValidation.ts
│   │   │   ├── schemaValidation.ts
│   │   │   └── index.ts
│   │   ├── constants.ts
│   │   ├── logger.ts
│   │   ├── errorHandling.ts
│   │   └── index.ts
│   │
│   ├── 📁 styles/                       # CSS and styling
│   │   ├── globals.css                  # Global styles and Tailwind imports
│   │   ├── components.css               # Component-specific styles
│   │   ├── themes.css                   # Theme definitions
│   │   └── animations.css               # Animation definitions
│   │
│   ├── 📁 assets/                       # Static assets
│   │   ├── 📁 icons/                    # SVG icons and icon fonts
│   │   ├── 📁 images/                   # Application images
│   │   ├── 📁 fonts/                    # Custom fonts
│   │   └── 📁 sounds/                   # Audio feedback files
│   │
│   ├── App.tsx                          # Main React application
│   ├── main.tsx                         # React entry point
│   └── vite-env.d.ts                    # Vite environment types
│
├── 📁 src-tauri/                        # Tauri backend (Rust)
│   ├── 📁 src/                          # Rust source code
│   │   ├── 📁 ai/                       # AI/Ollama integration modules
│   │   │   ├── ollama_manager.rs        # Ollama service management
│   │   │   ├── model_downloader.rs      # Model installation logic
│   │   │   ├── service_monitor.rs       # Health monitoring
│   │   │   └── mod.rs
│   │   ├── 📁 file_system/              # File system operations
│   │   │   ├── scanner.rs               # Directory scanning
│   │   │   ├── operations.rs            # File move/copy/delete
│   │   │   ├── watcher.rs               # File system monitoring
│   │   │   ├── metadata.rs              # File metadata extraction
│   │   │   └── mod.rs
│   │   ├── 📁 database/                 # SQLite database operations
│   │   │   ├── connection.rs            # Database connection management
│   │   │   ├── migrations.rs            # Schema migrations
│   │   │   ├── models.rs                # Database models
│   │   │   ├── queries.rs               # SQL queries
│   │   │   └── mod.rs
│   │   ├── 📁 security/                 # Security and permissions
│   │   │   ├── permissions.rs           # File permission handling
│   │   │   ├── backup.rs                # Backup creation/restoration
│   │   │   ├── validation.rs            # Input validation
│   │   │   └── mod.rs
│   │   ├── 📁 system/                   # System integration
│   │   │   ├── platform.rs              # Platform-specific code
│   │   │   ├── resources.rs             # Resource management
│   │   │   ├── notifications.rs         # System notifications
│   │   │   └── mod.rs
│   │   ├── 📁 commands/                 # Tauri command handlers
│   │   │   ├── file_commands.rs         # File operation commands
│   │   │   ├── ai_commands.rs           # AI service commands
│   │   │   ├── settings_commands.rs     # Settings commands
│   │   │   ├── system_commands.rs       # System commands
│   │   │   └── mod.rs
│   │   ├── lib.rs                       # Library root
│   │   └── main.rs                      # Application entry point
│   │
│   ├── 📁 bundled/                      # Bundled resources
│   │   ├── 📁 ollama/                   # Ollama binaries (platform-specific)
│   │   │   ├── darwin-arm64/
│   │   │   ├── darwin-x64/
│   │   │   ├── linux-x64/
│   │   │   └── windows-x64/
│   │   └── 📁 models/                   # Pre-downloaded AI models
│   │       ├── llama3.2-1b/
│   │       ├── qwen2.5-1.5b/
│   │       └── gemma2-2b/
│   │
│   ├── 📁 icons/                        # Application icons
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── icon.icns                    # macOS
│   │   ├── icon.ico                     # Windows
│   │   └── icon.png                     # Linux
│   │
│   ├── Cargo.toml                       # Rust dependencies
│   ├── tauri.conf.json                  # Tauri configuration
│   └── build.rs                         # Build script
│
├── 📁 scripts/                          # Development and build scripts
│   ├── 📁 setup/                        # Setup scripts
│   │   ├── install-ollama.sh            # Ollama installation
│   │   ├── download-models.sh           # Model downloading
│   │   └── setup-dev.sh                 # Development environment
│   ├── 📁 build/                        # Build scripts
│   │   ├── build-bundled.sh             # Create bundled release
│   │   ├── package-installers.sh        # Generate platform installers
│   │   └── sign-binaries.sh             # Code signing
│   └── 📁 testing/                      # Testing scripts
│       ├── e2e-tests.sh                 # End-to-end testing
│       ├── performance-tests.sh         # Performance benchmarks
│       └── cross-platform-tests.sh      # Multi-platform testing
│
├── 📁 tests/                            # Test files
│   ├── 📁 unit/                         # Unit tests
│   ├── 📁 integration/                  # Integration tests
│   ├── 📁 e2e/                          # End-to-end tests
│   └── 📁 fixtures/                     # Test data and fixtures
│
├── 📁 .github/                          # GitHub workflows
│   ├── 📁 workflows/                    # CI/CD workflows
│   │   ├── ci.yml                       # Continuous integration
│   │   ├── release.yml                  # Release automation
│   │   └── security.yml                 # Security scanning
│   └── ISSUE_TEMPLATE/                  # Issue templates
│
├── package.json                         # Node.js dependencies and scripts
├── tsconfig.json                        # TypeScript configuration
├── vite.config.ts                       # Vite configuration
├── tailwind.config.js                   # Tailwind CSS configuration
├── postcss.config.js                    # PostCSS configuration
├── .eslintrc.json                       # ESLint configuration
├── .prettierrc                          # Prettier configuration
├── .gitignore                           # Git ignore rules
├── LICENSE                              # License file
└── README.md                            # Project documentation
```

## 🔧 Component Architecture

### Core Application Components

#### 1. Main Layout System
```typescript
// MainLayout.tsx - Primary application shell
interface MainLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  statusBar?: React.ReactNode;
}

// AppHeader.tsx - Application header with navigation
interface AppHeaderProps {
  currentPath?: string;
  isAnalyzing: boolean;
  onFolderSelect: () => void;
  onAnalyze: () => void;
  onApplyChanges: () => void;
  onSettings: () => void;
}

// StatusBar.tsx - Bottom status information
interface StatusBarProps {
  status: ApplicationStatus;
  progress?: ProgressInfo;
  aiStatus: AIConnectionStatus;
}
```

#### 2. File System Components
```typescript
// DualPaneView.tsx - Side-by-side file system view
interface DualPaneViewProps {
  leftPane: FileSystemTree;
  rightPane: OrganizedStructure;
  isEditMode: boolean;
  onDragDrop: (item: FileItem, target: FolderItem) => void;
  onEditToggle: () => void;
}

// TreeView.tsx - Hierarchical file/folder display
interface TreeViewProps {
  root: TreeNode;
  selectedItems: string[];
  expandedItems: string[];
  isDragTarget: boolean;
  isEditable: boolean;
  onSelect: (itemId: string) => void;
  onExpand: (itemId: string) => void;
  onDragStart: (item: FileItem) => void;
  onDrop: (item: FileItem, target: FolderItem) => void;
}
```

#### 3. Organization Components
```typescript
// OrganizationPanel.tsx - Main organization control panel
interface OrganizationPanelProps {
  organizationType: OrganizationType;
  aiStatus: AIStatus;
  analysisResults: AnalysisResults;
  onOrganizationTypeChange: (type: OrganizationType) => void;
  onRefreshAnalysis: () => void;
  onCreateBackup: () => void;
  onPreviewChanges: () => void;
}

// JohnnyDecimalSetup.tsx - Johnny Decimal system configuration
interface JohnnyDecimalSetupProps {
  existingStructure?: JohnnyDecimalStructure;
  onStructureChange: (structure: JohnnyDecimalStructure) => void;
  onSave: () => void;
}
```

#### 4. AI Integration Components
```typescript
// ModelSelector.tsx - AI model selection and management
interface ModelSelectorProps {
  availableModels: LocalModel[];
  currentModel: string;
  isDownloading: boolean;
  downloadProgress?: DownloadProgress;
  onModelSelect: (modelName: string) => void;
  onModelDownload: (modelName: string) => void;
}

// SuggestionPanel.tsx - AI suggestions display
interface SuggestionPanelProps {
  suggestions: AISuggestion[];
  onAccept: (suggestion: AISuggestion) => void;
  onReject: (suggestion: AISuggestion) => void;
  onModify: (suggestion: AISuggestion, modifications: Partial<AISuggestion>) => void;
}
```

## 🏪 State Management Architecture

### Zustand Store Structure

```typescript
// Global Application Store
interface AppStore {
  // Application State
  isInitialized: boolean;
  currentPath: string | null;
  isAnalyzing: boolean;
  isApplyingChanges: boolean;
  
  // UI State
  activeModal: ModalType | null;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  setCurrentPath: (path: string) => void;
  setAnalyzing: (analyzing: boolean) => void;
  toggleTheme: () => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
}

// File System Store
interface FileSystemStore {
  // Current Structure
  currentStructure: FileSystemTree | null;
  proposedStructure: OrganizedStructure | null;
  selectedItems: string[];
  expandedItems: string[];
  
  // Operations
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  lastScanTimestamp: Date | null;
  
  // Actions
  scanDirectory: (path: string) => Promise<void>;
  selectItem: (itemId: string) => void;
  expandItem: (itemId: string) => void;
  updateStructure: (structure: FileSystemTree) => void;
}

// Organization Store
interface OrganizationStore {
  // Organization State
  organizationType: OrganizationType;
  johnnyDecimalStructure: JohnnyDecimalStructure | null;
  customRules: OrganizationRule[];
  
  // Analysis Results
  analysisResults: AnalysisResults | null;
  suggestedCategories: CategorySuggestion[];
  conflicts: OrganizationConflict[];
  
  // Operations
  isOrganizing: boolean;
  organizationProgress: OrganizationProgress | null;
  
  // Actions
  setOrganizationType: (type: OrganizationType) => void;
  analyzeFiles: (files: FileItem[]) => Promise<void>;
  applyOrganization: (changes: OrganizationChange[]) => Promise<void>;
  createBackup: () => Promise<string>;
  restoreBackup: (backupId: string) => Promise<void>;
}

// AI Store
interface AIStore {
  // Ollama Service State
  isServiceRunning: boolean;
  currentModel: string | null;
  availableModels: LocalModel[];
  
  // Model Management
  isDownloadingModel: boolean;
  downloadProgress: DownloadProgress | null;
  
  // AI Operations
  isAnalyzing: boolean;
  lastAnalysisTime: Date | null;
  
  // Actions
  startOllamaService: () => Promise<void>;
  stopOllamaService: () => Promise<void>;
  selectModel: (modelName: string) => Promise<void>;
  downloadModel: (modelName: string) => Promise<void>;
  analyzeFile: (file: FileItem) => Promise<AISuggestion>;
}
```

## 🔌 Service Layer Architecture

### AI Service Integration
```typescript
// OllamaService.ts - Main AI service interface
class OllamaService {
  private ollamaUrl = 'http://127.0.0.1:11434';
  private currentModel: string | null = null;
  
  async initialize(): Promise<void>;
  async analyzeFile(request: FileAnalysisRequest): Promise<AIAnalysisResult>;
  async getModelInfo(): Promise<ModelInfo>;
  private createFileAnalysisPrompt(request: FileAnalysisRequest): string;
  private parseAnalysisResponse(response: string): AIAnalysisResult;
}

// ModelManager.ts - AI model management
class ModelManager {
  async getAvailableModels(): Promise<LocalModel[]>;
  async downloadModel(modelName: string): Promise<void>;
  async selectModel(modelName: string): Promise<void>;
  async getSystemRequirements(): Promise<SystemRequirements>;
  private selectOptimalModel(systemSpecs: SystemSpecs): LocalModel;
}
```

### File System Service
```typescript
// FileScanner.ts - Directory scanning and analysis
class FileScanner {
  async scanDirectory(path: string): Promise<FileSystemTree>;
  async getFileMetadata(path: string): Promise<FileMetadata>;
  async watchDirectory(path: string): Promise<FileWatcher>;
  private analyzeFileContent(file: FileItem): Promise<FileAnalysis>;
}

// FileOperations.ts - File system operations
class FileOperations {
  async moveFile(source: string, destination: string): Promise<void>;
  async copyFile(source: string, destination: string): Promise<void>;
  async createDirectory(path: string): Promise<void>;
  async deleteFile(path: string): Promise<void>;
  async renameFile(oldPath: string, newPath: string): Promise<void>;
}

// BackupManager.ts - Backup and restore functionality
class BackupManager {
  async createBackup(path: string): Promise<BackupInfo>;
  async restoreBackup(backupId: string): Promise<void>;
  async listBackups(): Promise<BackupInfo[]>;
  async deleteBackup(backupId: string): Promise<void>;
}
```

### Organization Service
```typescript
// JohnnyDecimalEngine.ts - Johnny Decimal system implementation
class JohnnyDecimalEngine {
  async createStructure(files: FileItem[]): Promise<JohnnyDecimalStructure>;
  async categorizeFile(file: FileItem, structure: JohnnyDecimalStructure): Promise<CategoryAssignment>;
  async validateStructure(structure: JohnnyDecimalStructure): Promise<ValidationResult>;
  async suggestCategories(files: FileItem[]): Promise<CategorySuggestion[]>;
}

// RuleEngine.ts - Custom organization rules
class RuleEngine {
  async applyRules(files: FileItem[], rules: OrganizationRule[]): Promise<RuleApplication[]>;
  async createRule(criteria: RuleCriteria, action: RuleAction): Promise<OrganizationRule>;
  async validateRule(rule: OrganizationRule): Promise<ValidationResult>;
  async learnFromUserActions(actions: UserAction[]): Promise<OrganizationRule[]>;
}
```

## 🚀 Performance Optimization Strategy

### Large Folder Handling
```typescript
// Virtualization for large file lists
interface VirtualizedTreeProps {
  itemCount: number;
  itemSize: number;
  renderItem: (index: number) => React.ReactNode;
  overscan?: number;
}

// Chunked processing for file operations
interface ChunkedProcessor {
  chunkSize: number;
  delayBetweenChunks: number;
  processChunk: (items: FileItem[]) => Promise<void>;
  onProgress: (progress: number) => void;
}

// Memory-efficient file scanning
class MemoryEfficientScanner {
  private maxMemoryUsage = 512 * 1024 * 1024; // 512MB
  private currentMemoryUsage = 0;
  
  async scanLargeDirectory(path: string): Promise<AsyncIterator<FileItem>>;
  private monitorMemoryUsage(): void;
  private flushToDatabase(): Promise<void>;
}
```

### Caching Strategy
```typescript
// File metadata caching
interface FileMetadataCache {
  get(path: string): FileMetadata | null;
  set(path: string, metadata: FileMetadata): void;
  invalidate(path: string): void;
  clear(): void;
  size(): number;
}

// AI analysis result caching
interface AIAnalysisCache {
  getAnalysis(fileHash: string): AIAnalysisResult | null;
  cacheAnalysis(fileHash: string, result: AIAnalysisResult): void;
  invalidateOldCache(maxAgeMs: number): void;
}
```

## 🔒 Security Considerations

### File System Security
- Validate all file paths to prevent directory traversal
- Implement permission checks before file operations
- Sandbox file operations within selected directories
- Create secure backups with integrity checks

### AI Integration Security
- Local-only AI processing (no data sent externally)
- Validate AI responses before applying suggestions
- Rate limiting for AI requests
- Secure model downloads with checksum verification

### Data Privacy
- No telemetry or analytics without explicit consent
- Local storage of all user data and preferences
- Encrypted backup files
- Clear data deletion capabilities

## 🧪 Testing Strategy

### Unit Testing
- React component testing with React Testing Library
- Rust unit tests for business logic
- Service layer testing with mocked dependencies
- Utility function testing

### Integration Testing
- Tauri command testing
- File system operation testing
- AI service integration testing
- Database operation testing

### End-to-End Testing
- Complete user workflow testing
- Cross-platform compatibility testing
- Performance benchmarking
- Error handling and recovery testing

## 📦 Build and Distribution

### Development Build
```bash
npm run dev          # Start development server
npm run dev:tauri    # Start Tauri development mode
npm run test         # Run all tests
npm run lint         # Run linting
```

### Production Build
```bash
npm run build        # Build frontend
npm run build:tauri  # Build Tauri application
npm run bundle       # Create platform-specific bundles
npm run sign         # Code signing (release builds)
```

### Distribution Strategy
- **macOS**: `.dmg` installer with code signing
- **Windows**: `.msi` installer with code signing
- **Linux**: `.deb`, `.rpm`, and `.AppImage` packages
- **Updates**: Built-in update mechanism via Tauri updater

## 🎯 Next Steps for Implementation

1. **Initialize Tauri Project** - Set up basic Tauri + React structure
2. **Configure Development Environment** - ESLint, Prettier, TypeScript configs
3. **Implement Core Types** - Define TypeScript interfaces and types
4. **Build State Management** - Set up Zustand stores
5. **Create Component Library** - Build reusable UI components
6. **Implement File System Layer** - File scanning and operations
7. **Integrate AI Services** - Ollama setup and integration
8. **Build Organization Engine** - Johnny Decimal implementation
9. **Add Safety Features** - Backup and restore functionality
10. **Polish UI/UX** - Animations, themes, accessibility

This specification provides a comprehensive roadmap for implementing the AI File Organizer with clear architectural decisions, detailed project structure, and implementation guidelines.