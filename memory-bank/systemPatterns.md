# AI File Organizer - System Patterns

## Architecture Overview

### High-Level Pattern: Layered Architecture
```
┌─────────────────────────────────────┐
│          React Frontend             │ ← UI Components, State Management
├─────────────────────────────────────┤
│         Service Layer               │ ← Business Logic, AI Integration
├─────────────────────────────────────┤
│         Tauri Commands              │ ← API Bridge Layer
├─────────────────────────────────────┤
│         Rust Backend               │ ← File Operations, Native APIs
└─────────────────────────────────────┘
```

### Key Design Patterns

#### 1. Command Pattern (Tauri Integration)
- **Purpose**: Decouple frontend requests from backend operations
- **Implementation**: Tauri commands with structured request/response
- **Example**: `scan_directory`, `move_files`, `get_file_metadata`

#### 2. Service Pattern (Business Logic) - IMPLEMENTED
- **FileScanner**: Directory analysis and metadata extraction ✅
- **OllamaService**: AI integration and model management ✅
- **JohnnyDecimalEngine**: Organization logic and structure generation ✅
- **FileOperations**: Safe file manipulation with backup/undo (planned)

#### 3. Observer Pattern (Progress Tracking)
- **Purpose**: Real-time feedback during long operations
- **Implementation**: Callback-based progress reporting
- **Usage**: File scanning, AI analysis, organization operations

#### 4. Strategy Pattern (AI Models)
- **Purpose**: Pluggable AI model backends
- **Implementation**: Common interface for different Ollama models
- **Future**: Support for additional AI providers

## Component Relationships

### Core Service Dependencies
```
FileScanner ──→ Tauri Commands ──→ Rust File APIs
     │
     ├─→ OllamaService ──→ HTTP Calls ──→ Local Ollama
     │
     └─→ JohnnyDecimalEngine ──→ Organization Logic
```

### Frontend Component Hierarchy (PLANNED)
```
App
├── TreeView (file system visualization)
├── OrganizationPanel (AI suggestions)
├── ProgressIndicator (operation status)
├── SettingsPanel (configuration)
└── StatusBar (connection/model info)
```

## Critical Implementation Paths

### 1. File System Analysis Flow - IMPLEMENTED
```
User Selects Directory
     ↓
FileScanner.scanDirectory() ✅
     ↓
Tauri: scan_directory command
     ↓
Rust: Walk directory tree
     ↓
Extract metadata per file
     ↓
Return structured FileSystemTree
     ↓
Update React UI state
```

### 2. AI Analysis Flow - IMPLEMENTED
```
FileSystemTree Available
     ↓
OllamaService.analyzeFileForOrganization() ✅
     ↓
Generate context-aware prompts
     ↓
HTTP POST to Ollama API
     ↓
Parse AI response
     ↓
JohnnyDecimalEngine.generateStructure() ✅
     ↓
Present suggestions to user
```

### 3. Organization Execution Flow - PARTIALLY IMPLEMENTED
```
User Approves Suggestions
     ↓
FileOperations.createBackup() [planned]
     ↓
FileOperations.executeOrganization() [planned]
     ↓
Tauri: move_files command
     ↓
Rust: Safe file operations
     ↓
Progress callbacks to UI
     ↓
Update FileSystemTree state
```

## Error Handling Patterns

### 1. Graceful Degradation
- **File Access Errors**: Continue with accessible files, report failures
- **AI Service Unavailable**: Fall back to rule-based organization
- **Network Issues**: Cache previous AI responses, work offline

### 2. Recovery Mechanisms
- **Backup System**: Automatic backup before any file operations
- **Undo Operations**: Complete operation rollback capability
- **State Persistence**: Save work progress, recover after crashes

### 3. User Communication
- **Clear Error Messages**: User-friendly error descriptions
- **Actionable Guidance**: Suggest concrete steps to resolve issues
- **Progress Transparency**: Show what succeeded/failed in batch operations

## State Management Patterns

### 1. Frontend State (React) - PLANNED
```typescript
interface AppState {
  fileSystem: FileSystemTree | null;
  aiSuggestions: OrganizationSuggestion[];
  operationProgress: OperationProgress;
  settings: AppSettings;
  connectionStatus: ConnectionStatus;
}
```

### 2. Service State (Persistent)
- **Configuration**: AI model preferences, organization settings
- **History**: Previous organization operations for undo
- **Cache**: AI responses for similar file patterns

### 3. Backend State (Rust)
- **File Watchers**: Active directory monitoring
- **Operation Queue**: Pending file operations
- **Database**: SQLite for persistence and caching

## Performance Patterns

### 1. Lazy Loading
- **Large Directories**: Progressive scanning with pagination
- **File Metadata**: On-demand extraction for visible items
- **AI Analysis**: Batch processing with priority queuing

### 2. Caching Strategies
- **AI Responses**: Cache similar file analysis results
- **Metadata**: Store frequently accessed file information
- **Directory Structure**: Cache scanned directory trees

### 3. Background Processing
- **File Watching**: Monitor directories for changes
- **AI Pre-analysis**: Analyze files before user requests
- **Backup Maintenance**: Clean old backups automatically

## Security Patterns

### 1. File System Safety
- **Permission Checks**: Verify read/write access before operations
- **Path Validation**: Prevent directory traversal attacks
- **Atomic Operations**: Ensure file operations complete or rollback

### 2. AI Integration Security
- **Local Processing**: No file content sent to external services
- **Input Sanitization**: Clean prompts before sending to Ollama
- **Resource Limits**: Prevent AI requests from consuming excessive resources

### 3. Data Privacy
- **Local Storage**: All data remains on user's machine
- **No Telemetry**: No usage data collection or transmission
- **Secure Deletion**: Proper cleanup of temporary files and caches

## Implementation Status

### Core Services ✅ COMPLETE
1. **FileScanner**: Full implementation with comprehensive tests (28 tests)
2. **OllamaService**: Complete AI integration with model management
3. **JohnnyDecimalEngine**: Full Johnny Decimal system implementation (28 tests)

### Architecture Patterns ✅ ESTABLISHED
- Test-Driven Development methodology
- Type-safe TypeScript implementation
- Async/await patterns for non-blocking operations
- Configuration-driven design
- Comprehensive error handling and validation

### Next Implementation Phase 🔄 IN PROGRESS
- React UI components with TDD approach
- Frontend state management
- User interface patterns
- Integration testing