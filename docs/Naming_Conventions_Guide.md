# AI File Organizer - Naming Conventions Guide

## 📋 Overview

This document establishes comprehensive naming conventions for the AI File Organizer project to ensure consistency, readability, and maintainability across all code, files, and documentation.

## 📁 File & Directory Names

### Documentation Files
- **Format**: `PascalCase_With_Underscores.md`
- **Examples**:
  - `Technical_Architecture.md`
  - `TypeScript_Types_Specification.md`
  - `Component_Architecture_Guidelines.md`
  - `TDD_Strategy_Implementation_Guide.md`
  - `Naming_Conventions_Guide.md`

### Source Code Files
- **TypeScript/JavaScript**: `PascalCase.ts` or `PascalCase.tsx`
  - Components: `TreeView.tsx`, `FileExplorer.tsx`, `OrganizationPanel.tsx`
  - Services: `FileScanner.ts`, `OllamaService.ts`, `JohnnyDecimalEngine.ts`
  - Types: `FileSystemTypes.ts`, `OrganizationTypes.ts`, `AITypes.ts`
  - Utilities: `FileUtils.ts`, `ValidationUtils.ts`, `FormatUtils.ts`

- **Rust Files**: `snake_case.rs`
  - `file_operations.rs`, `ai_service.rs`, `johnny_decimal.rs`

### Test Files
- **Format**: `[ComponentName].test.ts` or `[ComponentName].test.tsx`
- **Examples**:
  - `FileScanner.test.ts`
  - `TreeView.test.tsx`
  - `OllamaService.test.ts`
  - `JohnnyDecimalEngine.test.ts`

### Configuration Files
- **Format**: `lowercase.config.extension`
- **Examples**:
  - `vitest.config.ts`
  - `tailwind.config.js`
  - `playwright.config.ts`
  - `tsconfig.json`

### Directory Structure
- **Root Directories**: `kebab-case`
  - `ai-file-organizer/`
  - `src-tauri/`
  - `public/`
  - `docs/`

- **Source Directories**: `kebab-case`
  - `src/components/`
  - `src/services/`
  - `src/types/`
  - `src/utils/`
  - `src/stores/`
  - `src/hooks/`

## 🏗️ TypeScript/JavaScript Naming

### Variables & Functions
- **Format**: `camelCase`
- **Examples**:
  ```typescript
  const fileScanner = new FileScanner();
  const isAnalyzing = false;
  const selectedFiles = [];
  
  function scanDirectory(path: string): Promise<FileSystemTree> {}
  function analyzeFile(request: FileAnalysisRequest): Promise<AnalysisResult> {}
  function validateStructure(structure: JohnnyDecimalStructure): ValidationResult {}
  ```

### Constants
- **Format**: `SCREAMING_SNAKE_CASE`
- **Examples**:
  ```typescript
  const MAX_FILE_SIZE = 1024 * 1024 * 100; // 100MB
  const DEFAULT_OLLAMA_PORT = 11434;
  const JOHNNY_DECIMAL_AREA_RANGE = { MIN: 10, MAX: 99 };
  const AI_MODEL_NAMES = {
    LLAMA_3_2_1B: 'llama3.2:1b',
    QWEN_1_5_1_8B: 'qwen:1.8b'
  } as const;
  ```

### Interfaces & Types
- **Format**: `PascalCase`
- **Naming Patterns**:
  - Interfaces: Descriptive nouns (`FileItem`, `DirectoryItem`, `AnalysisResult`)
  - Types: Descriptive with suffix (`OrganizationType`, `FileSystemEventType`)
  - Enums: Descriptive with suffix (`JDErrorType`, `AIModelStatus`)
  
- **Examples**:
  ```typescript
  interface FileItem {
    id: string;
    name: string;
    path: string;
  }
  
  type OrganizationType = 'JOHNNY_DECIMAL' | 'FILE_TYPE' | 'DATE_BASED' | 'CUSTOM';
  
  enum JDErrorType {
    DUPLICATE_NUMBER = 'DUPLICATE_NUMBER',
    INVALID_RANGE = 'INVALID_RANGE',
    MISSING_CATEGORY = 'MISSING_CATEGORY'
  }
  ```

### Classes
- **Format**: `PascalCase`
- **Patterns**: Descriptive nouns or noun phrases
- **Examples**:
  ```typescript
  class FileScanner {}
  class OllamaService {}
  class JohnnyDecimalEngine {}
  class FileOperations {}
  class ValidationEngine {}
  ```

### React Components
- **Format**: `PascalCase`
- **File Structure**: Component per file
- **Examples**:
  ```typescript
  // TreeView.tsx
  export const TreeView: React.FC<TreeViewProps> = ({ ... }) => { ... };
  
  // FileExplorer.tsx
  export const FileExplorer: React.FC<FileExplorerProps> = ({ ... }) => { ... };
  
  // OrganizationPanel.tsx
  export const OrganizationPanel: React.FC<OrganizationPanelProps> = ({ ... }) => { ... };
  ```

### React Hooks
- **Format**: `use` + `PascalCase`
- **Examples**:
  ```typescript
  const useFileSystem = () => { ... };
  const useAIAnalysis = () => { ... };
  const useJohnnyDecimal = () => { ... };
  const useOrganization = () => { ... };
  const useKeyboardShortcuts = () => { ... };
  ```

### Props Interfaces
- **Format**: `[ComponentName]Props`
- **Examples**:
  ```typescript
  interface TreeViewProps {
    data: FileSystemTree;
    selectedItems: string[];
    onSelect: (id: string, multiSelect: boolean) => void;
  }
  
  interface FileExplorerProps {
    rootPath: string;
    onFileSelect: (files: FileItem[]) => void;
  }
  ```

## 🦀 Rust Naming Conventions

### Functions & Variables
- **Format**: `snake_case`
- **Examples**:
  ```rust
  fn scan_directory(path: &str) -> Result<FileTree, ScanError> {}
  fn get_file_metadata(path: &str) -> Result<FileMetadata, MetadataError> {}
  
  let file_scanner = FileScanner::new();
  let analysis_result = analyze_with_ai(&file_path).await?;
  ```

### Structs & Enums
- **Format**: `PascalCase`
- **Examples**:
  ```rust
  struct FileMetadata {
      name: String,
      size: u64,
      created: SystemTime,
  }
  
  enum ScanError {
      PermissionDenied(String),
      PathNotFound(String),
      IoError(std::io::Error),
  }
  ```

### Constants
- **Format**: `SCREAMING_SNAKE_CASE`
- **Examples**:
  ```rust
  const MAX_SCAN_DEPTH: usize = 10;
  const DEFAULT_BUFFER_SIZE: usize = 8192;
  const OLLAMA_DEFAULT_PORT: u16 = 11434;
  ```

### Modules
- **Format**: `snake_case`
- **Examples**:
  ```rust
  mod file_operations;
  mod ai_service;
  mod johnny_decimal;
  mod error_handling;
  ```

### Tauri Commands
- **Format**: `snake_case`
- **Examples**:
  ```rust
  #[tauri::command]
  async fn scan_directory(path: String) -> Result<FileTree, String> {}
  
  #[tauri::command]
  async fn move_file(source: String, destination: String) -> Result<(), String> {}
  
  #[tauri::command]
  async fn start_ollama_service() -> Result<String, String> {}
  ```

## 🎨 CSS & Styling

### CSS Classes (Tailwind)
- **Format**: Standard Tailwind utility classes
- **Custom Classes**: `kebab-case`
- **Examples**:
  ```css
  .tree-view-container {
    @apply flex flex-col h-full overflow-hidden;
  }
  
  .file-item-selected {
    @apply bg-blue-100 border-blue-300;
  }
  
  .organization-panel {
    @apply p-4 bg-white rounded-lg shadow-sm;
  }
  ```

### CSS Custom Properties
- **Format**: `--kebab-case`
- **Examples**:
  ```css
  :root {
    --primary-color: #3b82f6;
    --secondary-color: #64748b;
    --background-color: #f8fafc;
    --text-color: #1e293b;
    --border-radius: 0.5rem;
    --transition-duration: 0.2s;
  }
  ```

## 🧪 Testing Naming

### Test Suites
- **Format**: `describe('[ComponentName/ServiceName]', () => {})`
- **Examples**:
  ```typescript
  describe('FileScanner', () => {});
  describe('TreeView', () => {});
  describe('OllamaService', () => {});
  ```

### Test Cases
- **Format**: `it('should [expected behavior]', () => {})`
- **Examples**:
  ```typescript
  it('should scan directory and return FileSystemTree', async () => {});
  it('should handle permission denied errors gracefully', async () => {});
  it('should emit progress events during scanning', async () => {});
  ```

### Test Data & Mocks
- **Format**: `mock[ComponentName]` or `test[DataType]`
- **Examples**:
  ```typescript
  const mockFileSystemTree = createMockFileSystemTree();
  const testFiles = createTestFileList();
  const mockOllamaResponse = { model: 'llama3.2:1b', response: '...' };
  ```

### Test Utilities
- **Format**: `create[TestHelper]` or `setup[TestEnvironment]`
- **Examples**:
  ```typescript
  function createMockFile(name: string, mimeType: string): FileItem {}
  function setupTestEnvironment(): TestContext {}
  function createLargeFileSystemTree(size: number): FileSystemTree {}
  ```

## 📝 Git & Version Control

### Branch Names
- **Format**: `type/description-in-kebab-case`
- **Types**: `feature`, `bugfix`, `hotfix`, `release`, `chore`
- **Examples**:
  - `feature/file-system-scanner`
  - `feature/ai-integration`
  - `bugfix/tree-view-selection`
  - `chore/update-dependencies`

### Commit Messages
- **Format**: `type(scope): description`
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- **Examples**:
  - `feat(scanner): implement directory scanning with progress tracking`
  - `fix(tree-view): resolve selection state synchronization issue`
  - `test(ai): add comprehensive tests for Ollama service integration`
  - `docs(architecture): update component guidelines with naming conventions`

### Tags
- **Format**: `v[MAJOR].[MINOR].[PATCH]` (Semantic Versioning)
- **Examples**: `v1.0.0`, `v1.1.0`, `v1.1.1`

## 🗃️ Database & Storage

### SQLite Table Names
- **Format**: `snake_case`
- **Examples**:
  ```sql
  CREATE TABLE file_metadata (...);
  CREATE TABLE organization_history (...);
  CREATE TABLE johnny_decimal_structures (...);
  CREATE TABLE user_preferences (...);
  ```

### SQLite Column Names
- **Format**: `snake_case`
- **Examples**:
  ```sql
  CREATE TABLE file_metadata (
      id INTEGER PRIMARY KEY,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      created_at DATETIME,
      last_modified DATETIME,
      mime_type TEXT,
      checksum TEXT
  );
  ```

### JSON Keys (API/Storage)
- **Format**: `camelCase`
- **Examples**:
  ```json
  {
    "fileName": "document.pdf",
    "filePath": "/path/to/document.pdf",
    "fileSize": 1024,
    "lastModified": "2024-01-01T00:00:00Z",
    "analysisResult": {
      "suggestedCategory": "20-29 Documents",
      "confidence": 0.89
    }
  }
  ```

## 🔧 Environment & Configuration

### Environment Variables
- **Format**: `SCREAMING_SNAKE_CASE`
- **Examples**:
  ```bash
  VITE_APP_NAME=AI_File_Organizer
  VITE_OLLAMA_PORT=11434
  VITE_AI_MODEL_DEFAULT=llama3.2:1b
  RUST_LOG=debug
  TAURI_DEV_PORT=1420
  ```

### Configuration Keys
- **Format**: `camelCase` in JSON, `snake_case` in TOML
- **JSON Examples**:
  ```json
  {
    "aiSettings": {
      "defaultModel": "llama3.2:1b",
      "analysisTimeout": 30000,
      "enableAutoAnalysis": true
    },
    "organizationSettings": {
      "defaultScheme": "JOHNNY_DECIMAL",
      "createBackups": true,
      "confirmOperations": true
    }
  }
  ```

- **TOML Examples** (Rust):
  ```toml
  [ai_settings]
  default_model = "llama3.2:1b"
  analysis_timeout = 30000
  enable_auto_analysis = true
  
  [organization_settings]
  default_scheme = "JOHNNY_DECIMAL"
  create_backups = true
  confirm_operations = true
  ```

## 🎯 Johnny Decimal Specific Naming

### Area Naming
- **Format**: `[Number] - [Descriptive Name]`
- **Examples**:
  - `10-19 Administration`
  - `20-29 Documents`
  - `30-39 Media`
  - `40-49 Development`

### Category Naming
- **Format**: `[Number] [Descriptive Name]`
- **Examples**:
  - `11 Legal Documents`
  - `12 Financial Records`
  - `21 Reports`
  - `22 Presentations`

### Item Naming
- **Format**: `[Number].[Sequence] [Descriptive Name]`
- **Examples**:
  - `11.01 Contracts`
  - `11.02 Licenses`
  - `21.01 Monthly Reports`
  - `21.02 Annual Reports`

## 🚀 Build & Deployment

### Asset Names
- **Format**: `kebab-case.extension`
- **Examples**:
  - `app-icon.png`
  - `loading-spinner.svg`
  - `background-pattern.webp`
  - `johnny-decimal-example.pdf`

### Build Artifacts
- **Format**: `[app-name]-[version]-[platform].[extension]`
- **Examples**:
  - `ai-file-organizer-1.0.0-windows-x64.msi`
  - `ai-file-organizer-1.0.0-macos-universal.dmg`
  - `ai-file-organizer-1.0.0-linux-x64.appimage`

## ✅ Validation Rules

### Naming Validation Checklist
- [ ] File names are descriptive and follow format conventions
- [ ] No special characters except hyphens and underscores where specified
- [ ] Component names are clear and self-documenting
- [ ] Test names describe expected behavior
- [ ] Constants use appropriate capitalization
- [ ] Database schema follows SQL naming conventions
- [ ] Git branches and commits follow established patterns
- [ ] TypeScript interfaces and types are properly named
- [ ] Rust code follows language conventions
- [ ] CSS classes are semantic and maintainable

### Linting Rules
```json
{
  "rules": {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "variableLike",
        "format": ["camelCase"]
      },
      {
        "selector": "typeLike",
        "format": ["PascalCase"]
      },
      {
        "selector": "variable",
        "modifiers": ["const"],
        "format": ["camelCase", "UPPER_CASE"]
      }
    ]
  }
}
```

## 📚 Reference Examples

### Complete File Structure Example
```
ai-file-organizer/
├── docs/
│   ├── Technical_Architecture.md
│   ├── Naming_Conventions_Guide.md
│   └── TDD_Strategy_Implementation_Guide.md
├── src/
│   ├── components/
│   │   ├── file-explorer/
│   │   │   ├── TreeView.tsx
│   │   │   ├── TreeView.test.tsx
│   │   │   └── index.ts
│   │   └── organization/
│   │       ├── OrganizationPanel.tsx
│   │       └── OrganizationPanel.test.tsx
│   ├── services/
│   │   ├── file-system/
│   │   │   ├── FileScanner.ts
│   │   │   ├── FileScanner.test.ts
│   │   │   ├── FileOperations.ts
│   │   │   └── FileOperations.test.ts
│   │   └── ai/
│   │       ├── OllamaService.ts
│   │       └── OllamaService.test.ts
│   └── types/
│       ├── FileSystemTypes.ts
│       ├── AITypes.ts
│       └── OrganizationTypes.ts
└── src-tauri/
    └── src/
        ├── file_operations.rs
        ├── ai_service.rs
        └── johnny_decimal.rs
```

This comprehensive naming convention guide ensures consistency across all aspects of the AI File Organizer project, making the codebase more maintainable, readable, and professional.