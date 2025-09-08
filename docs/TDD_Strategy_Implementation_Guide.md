# AI File Organizer - Test-Driven Development Strategy & Implementation Guide

## 📋 Overview

This document outlines our Test-Driven Development (TDD) approach for the AI File Organizer project. We'll follow the Red-Green-Refactor cycle to ensure robust, well-tested code that meets requirements from the ground up.

## 🔄 TDD Philosophy & Process

### Red-Green-Refactor Cycle

1. **🔴 Red**: Write a failing test that describes the desired functionality
2. **🟢 Green**: Write the minimal code to make the test pass
3. **🔵 Refactor**: Improve the code while keeping tests green

### Testing Pyramid

```
        Unit Tests (70%)
       ─────────────────
      Integration Tests (20%)
     ─────────────────────────
    End-to-End Tests (10%)
   ─────────────────────────────
```

## 🧪 Testing Stack & Tools

### Frontend Testing
- **Test Runner**: Vitest (faster than Jest, better Vite integration)
- **React Testing**: @testing-library/react + @testing-library/jest-dom
- **User Interactions**: @testing-library/user-event
- **Mocking**: vi (Vitest's built-in mocking)
- **Component Testing**: @testing-library/react-hooks

### Backend (Rust) Testing
- **Unit Tests**: Built-in Rust testing framework
- **Integration Tests**: Tauri's testing utilities
- **Mocking**: mockall crate for Rust mocking

### E2E Testing
- **Framework**: Playwright (cross-browser support)
- **Test Runner**: Playwright Test Runner
- **Visual Testing**: Playwright visual comparisons

## 🏗️ TDD Implementation by Feature

### Phase 1: Core File System Operations

#### 1.1 File Scanner Component (TDD)

**Step 1: Write Failing Tests**

```typescript
// src/services/file-system/__tests__/FileScanner.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileScanner } from '../FileScanner';
import { FileSystemTree, FileItem, DirectoryItem } from '../../../types';

describe('FileScanner', () => {
  let fileScanner: FileScanner;
  let mockTauriInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockTauriInvoke = vi.fn();
    vi.mock('@tauri-apps/api/tauri', () => ({
      invoke: mockTauriInvoke
    }));
    fileScanner = new FileScanner();
  });

  describe('scanDirectory', () => {
    it('should scan a directory and return a FileSystemTree', async () => {
      // Arrange
      const testPath = '/test/directory';
      const expectedTree: FileSystemTree = {
        root: {
          id: 'root',
          name: 'directory',
          path: testPath,
          type: 'directory',
          size: 1024,
          lastModified: new Date('2025-01-01'),
          created: new Date('2025-01-01'),
          childCount: 2,
          totalSize: 1024,
          isEmpty: false,
          isExpanded: false,
          isWatched: false
        },
        nodes: new Map(),
        totalFiles: 5,
        totalDirectories: 2,
        totalSize: 2048,
        lastScanned: expect.any(Date),
        scanDuration: expect.any(Number)
      };

      mockTauriInvoke.mockResolvedValue({
        files: [
          { name: 'test.txt', path: '/test/directory/test.txt', size: 100 },
          { name: 'image.jpg', path: '/test/directory/image.jpg', size: 500 }
        ],
        directories: [
          { name: 'subfolder', path: '/test/directory/subfolder' }
        ]
      });

      // Act
      const result = await fileScanner.scanDirectory(testPath);

      // Assert
      expect(result).toMatchObject({
        root: expect.objectContaining({
          name: 'directory',
          path: testPath,
          type: 'directory'
        }),
        totalFiles: expect.any(Number),
        totalDirectories: expect.any(Number)
      });
      expect(mockTauriInvoke).toHaveBeenCalledWith('scan_directory', {
        path: testPath
      });
    });

    it('should handle permission denied errors gracefully', async () => {
      // Arrange
      const testPath = '/restricted/directory';
      mockTauriInvoke.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(fileScanner.scanDirectory(testPath))
        .rejects
        .toThrow('Permission denied');
    });

    it('should emit progress events during scanning', async () => {
      // Arrange
      const testPath = '/large/directory';
      const progressCallback = vi.fn();
      fileScanner.onProgress(progressCallback);

      mockTauriInvoke.mockImplementation(() => 
        new Promise(resolve => {
          // Simulate progress events
          setTimeout(() => progressCallback({ progress: 50 }), 10);
          setTimeout(() => progressCallback({ progress: 100 }), 20);
          setTimeout(() => resolve({ files: [], directories: [] }), 30);
        })
      );

      // Act
      await fileScanner.scanDirectory(testPath);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith({ progress: 50 });
      expect(progressCallback).toHaveBeenCalledWith({ progress: 100 });
    });
  });

  describe('getFileMetadata', () => {
    it('should extract metadata from file', async () => {
      // Arrange
      const filePath = '/test/document.pdf';
      const expectedMetadata = {
        title: 'Test Document',
        author: 'John Doe',
        pageCount: 10,
        size: 1024
      };

      mockTauriInvoke.mockResolvedValue(expectedMetadata);

      // Act
      const result = await fileScanner.getFileMetadata(filePath);

      // Assert
      expect(result).toEqual(expectedMetadata);
      expect(mockTauriInvoke).toHaveBeenCalledWith('get_file_metadata', {
        path: filePath
      });
    });
  });
});
```

**Step 2: Implement Minimal Code (Green)**

```typescript
// src/services/file-system/FileScanner.ts
import { invoke } from '@tauri-apps/api/tauri';
import { FileSystemTree, FileMetadata, ScanProgress } from '../../types';

export class FileScanner {
  private progressCallback?: (progress: ScanProgress) => void;

  onProgress(callback: (progress: ScanProgress) => void): void {
    this.progressCallback = callback;
  }

  async scanDirectory(path: string): Promise<FileSystemTree> {
    try {
      const rawData = await invoke('scan_directory', { path });
      
      // Transform raw data into FileSystemTree
      const tree = this.transformToFileSystemTree(rawData, path);
      
      return tree;
    } catch (error) {
      throw new Error(`Failed to scan directory: ${error}`);
    }
  }

  async getFileMetadata(path: string): Promise<FileMetadata> {
    return await invoke('get_file_metadata', { path });
  }

  private transformToFileSystemTree(rawData: any, path: string): FileSystemTree {
    // Implementation to transform raw data to FileSystemTree
    // This would be the minimal implementation to pass tests
    return {
      root: {
        id: 'root',
        name: path.split('/').pop() || 'root',
        path,
        type: 'directory',
        size: 0,
        lastModified: new Date(),
        created: new Date(),
        childCount: rawData.files?.length || 0,
        totalSize: 0,
        isEmpty: false,
        isExpanded: false,
        isWatched: false
      },
      nodes: new Map(),
      totalFiles: rawData.files?.length || 0,
      totalDirectories: rawData.directories?.length || 0,
      totalSize: 0,
      lastScanned: new Date(),
      scanDuration: 0
    };
  }
}
```

#### 1.2 File Operations Service (TDD)

```typescript
// src/services/file-system/__tests__/FileOperations.test.ts
describe('FileOperations', () => {
  let fileOperations: FileOperations;

  beforeEach(() => {
    fileOperations = new FileOperations();
  });

  describe('moveFile', () => {
    it('should move a file from source to destination', async () => {
      // Arrange
      const source = '/source/file.txt';
      const destination = '/destination/file.txt';
      
      const mockInvoke = vi.fn().mockResolvedValue(undefined);
      vi.mocked(invoke).mockImplementation(mockInvoke);

      // Act
      await fileOperations.moveFile(source, destination);

      // Assert
      expect(mockInvoke).toHaveBeenCalledWith('move_file', {
        source,
        destination
      });
    });

    it('should throw error if destination already exists', async () => {
      // Arrange
      const source = '/source/file.txt';
      const destination = '/destination/file.txt';
      
      vi.mocked(invoke).mockRejectedValue(new Error('File already exists'));

      // Act & Assert
      await expect(fileOperations.moveFile(source, destination))
        .rejects
        .toThrow('File already exists');
    });

    it('should create destination directory if it does not exist', async () => {
      // Arrange
      const source = '/source/file.txt';
      const destination = '/new/destination/file.txt';
      
      const mockInvoke = vi.fn()
        .mockResolvedValueOnce(undefined) // create_directory
        .mockResolvedValueOnce(undefined); // move_file
      
      vi.mocked(invoke).mockImplementation(mockInvoke);

      // Act
      await fileOperations.moveFile(source, destination, { createDestinationDir: true });

      // Assert
      expect(mockInvoke).toHaveBeenCalledWith('create_directory', {
        path: '/new/destination'
      });
      expect(mockInvoke).toHaveBeenCalledWith('move_file', {
        source,
        destination
      });
    });
  });

  describe('copyFile', () => {
    it('should copy a file preserving original', async () => {
      // Test implementation
    });
  });

  describe('createDirectory', () => {
    it('should create a new directory', async () => {
      // Test implementation
    });
  });
});
```

### Phase 2: AI Integration (TDD)

#### 2.1 Ollama Service Tests

```typescript
// src/services/ai/__tests__/OllamaService.test.ts
describe('OllamaService', () => {
  let ollamaService: OllamaService;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    ollamaService = new OllamaService();
  });

  describe('initialize', () => {
    it('should start Ollama service and verify connection', async () => {
      // Arrange
      const mockInvoke = vi.fn()
        .mockResolvedValueOnce(undefined) // start_ollama_service
        .mockResolvedValueOnce('llama3.2:1b'); // get_active_model

      vi.mocked(invoke).mockImplementation(mockInvoke);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      });

      // Act
      await ollamaService.initialize();

      // Assert
      expect(mockInvoke).toHaveBeenCalledWith('start_ollama_service');
      expect(ollamaService.isReady).toBe(true);
      expect(ollamaService.currentModel).toBe('llama3.2:1b');
    });

    it('should handle service startup failure', async () => {
      // Arrange
      vi.mocked(invoke).mockRejectedValue(new Error('Failed to start Ollama'));

      // Act & Assert
      await expect(ollamaService.initialize()).rejects.toThrow('Failed to start Ollama');
      expect(ollamaService.isReady).toBe(false);
    });
  });

  describe('analyzeFile', () => {
    it('should analyze file and return categorization suggestion', async () => {
      // Arrange
      const fileRequest: FileAnalysisRequest = {
        fileName: 'document.pdf',
        filePath: '/test/document.pdf',
        fileExtension: 'pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        existingStructure: mockJohnnyDecimalStructure,
        organizationScheme: OrganizationType.JOHNNY_DECIMAL
      };

      const expectedResponse = {
        suggestedCategory: '20-29 Documents/21 Reports',
        confidence: 0.89,
        reasoning: 'PDF document with formal structure suggests business report',
        alternativeCategories: [],
        tags: ['document', 'pdf', 'business']
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            category: '20-29 Documents/21 Reports',
            confidence: 0.89,
            reasoning: 'PDF document with formal structure suggests business report'
          })
        })
      });

      // Act
      const result = await ollamaService.analyzeFile(fileRequest);

      // Assert
      expect(result).toMatchObject({
        suggestedCategory: '20-29 Documents/21 Reports',
        confidence: 0.89,
        reasoning: expect.any(String)
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('document.pdf')
        })
      );
    });

    it('should fallback to rule-based categorization on AI failure', async () => {
      // Arrange
      const fileRequest: FileAnalysisRequest = {
        fileName: 'image.jpg',
        filePath: '/test/image.jpg',
        fileExtension: 'jpg',
        fileSize: 2048,
        mimeType: 'image/jpeg',
        existingStructure: mockJohnnyDecimalStructure,
        organizationScheme: OrganizationType.JOHNNY_DECIMAL
      };

      mockFetch.mockRejectedValue(new Error('AI service unavailable'));

      // Act
      const result = await ollamaService.analyzeFile(fileRequest);

      // Assert
      expect(result).toMatchObject({
        suggestedCategory: expect.stringContaining('Images'),
        confidence: expect.any(Number),
        reasoning: expect.stringContaining('fallback')
      });
    });
  });

  describe('getModelInfo', () => {
    it('should return current model information', async () => {
      // Test implementation
    });
  });
});
```

### Phase 3: Organization Engine (TDD)

#### 3.1 Johnny Decimal Engine Tests

```typescript
// src/services/organization/__tests__/JohnnyDecimalEngine.test.ts
describe('JohnnyDecimalEngine', () => {
  let engine: JohnnyDecimalEngine;

  beforeEach(() => {
    engine = new JohnnyDecimalEngine();
  });

  describe('createStructure', () => {
    it('should create Johnny Decimal structure from file analysis', async () => {
      // Arrange
      const files: FileItem[] = [
        {
          id: '1',
          name: 'document.pdf',
          path: '/test/document.pdf',
          type: 'file',
          size: 1024,
          extension: 'pdf',
          mimeType: 'application/pdf',
          lastModified: new Date(),
          created: new Date(),
          checksum: 'abc123',
          isHidden: false,
          permissions: mockPermissions
        },
        {
          id: '2',
          name: 'photo.jpg',
          path: '/test/photo.jpg',
          type: 'file',
          size: 2048,
          extension: 'jpg',
          mimeType: 'image/jpeg',
          lastModified: new Date(),
          created: new Date(),
          checksum: 'def456',
          isHidden: false,
          permissions: mockPermissions
        }
      ];

      // Act
      const structure = await engine.createStructure(files);

      // Assert
      expect(structure).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        rootPath: expect.any(String),
        areas: expect.arrayContaining([
          expect.objectContaining({
            number: expect.any(Number),
            name: expect.any(String),
            categories: expect.any(Array)
          })
        ])
      });

      // Verify areas are in valid Johnny Decimal ranges
      structure.areas.forEach(area => {
        expect(area.number).toBeGreaterThanOrEqual(10);
        expect(area.number).toBeLessThanOrEqual(99);
        expect(area.number % 10).toBe(0); // Should be 10, 20, 30, etc.
      });
    });

    it('should group similar files into same categories', async () => {
      // Arrange
      const pdfFiles: FileItem[] = [
        createMockFile('report1.pdf', 'application/pdf'),
        createMockFile('report2.pdf', 'application/pdf'),
        createMockFile('manual.pdf', 'application/pdf')
      ];

      // Act
      const structure = await engine.createStructure(pdfFiles);

      // Assert
      const documentArea = structure.areas.find(area => 
        area.name.toLowerCase().includes('document')
      );
      
      expect(documentArea).toBeDefined();
      expect(documentArea!.categories).toHaveLength(expect.any(Number));
      
      // All PDFs should be in the same category
      const pdfCategory = documentArea!.categories.find(cat =>
        cat.items.some(item => item.files.length === 3)
      );
      expect(pdfCategory).toBeDefined();
    });
  });

  describe('categorizeFile', () => {
    it('should assign file to appropriate Johnny Decimal category', async () => {
      // Arrange
      const file = createMockFile('spreadsheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const structure = createMockJohnnyDecimalStructure();

      // Act
      const assignment = await engine.categorizeFile(file, structure);

      // Assert
      expect(assignment).toMatchObject({
        areaNumber: expect.any(Number),
        categoryNumber: expect.any(Number),
        itemNumber: expect.any(Number),
        confidence: expect.any(Number),
        reasoning: expect.any(String)
      });

      // Verify valid Johnny Decimal numbering
      expect(assignment.categoryNumber).toBeGreaterThanOrEqual(assignment.areaNumber);
      expect(assignment.categoryNumber).toBeLessThan(assignment.areaNumber + 10);
    });
  });

  describe('validateStructure', () => {
    it('should validate Johnny Decimal structure rules', async () => {
      // Arrange
      const validStructure = createValidJohnnyDecimalStructure();
      const invalidStructure = createInvalidJohnnyDecimalStructure();

      // Act
      const validResult = await engine.validateStructure(validStructure);
      const invalidResult = await engine.validateStructure(invalidStructure);

      // Assert
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(expect.any(Number));
      expect(invalidResult.errors[0]).toMatchObject({
        type: expect.any(String),
        message: expect.any(String),
        severity: expect.stringMatching(/error|warning/)
      });
    });

    it('should detect duplicate numbers', async () => {
      // Arrange
      const structureWithDuplicates = createStructureWithDuplicateNumbers();

      // Act
      const result = await engine.validateStructure(structureWithDuplicates);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: JDErrorType.DUPLICATE_NUMBER,
          message: expect.stringContaining('duplicate')
        })
      );
    });
  });
});
```

### Phase 4: React Components (TDD)

#### 4.1 TreeView Component Tests

```typescript
// src/components/file-explorer/__tests__/TreeView.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreeView } from '../TreeView';
import { mockFileSystemTree } from '../__mocks__/fileSystemTree';

describe('TreeView', () => {
  const defaultProps = {
    data: mockFileSystemTree,
    selectedItems: [],
    expandedItems: [],
    onSelect: vi.fn(),
    onExpand: vi.fn(),
    onDragStart: vi.fn(),
    onDrop: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tree structure correctly', () => {
    render(<TreeView {...defaultProps} />);
    
    // Should render root node
    expect(screen.getByText(mockFileSystemTree.root.name)).toBeInTheDocument();
    
    // Should render virtual list container
    expect(screen.getByTestId('tree-view-container')).toBeInTheDocument();
  });

  it('handles node selection', async () => {
    const user = userEvent.setup();
    render(<TreeView {...defaultProps} />);
    
    const firstNode = screen.getByTestId('tree-node-file-1');
    await user.click(firstNode);
    
    expect(defaultProps.onSelect).toHaveBeenCalledWith('file-1', false);
  });

  it('handles multi-selection with ctrl+click', async () => {
    const user = userEvent.setup();
    render(<TreeView {...defaultProps} />);
    
    const firstNode = screen.getByTestId('tree-node-file-1');
    await user.click(firstNode, { ctrlKey: true });
    
    expect(defaultProps.onSelect).toHaveBeenCalledWith('file-1', true);
  });

  it('handles node expansion', async () => {
    const user = userEvent.setup();
    render(<TreeView {...defaultProps} />);
    
    const expandButton = screen.getByTestId('expand-button-dir-1');
    await user.click(expandButton);
    
    expect(defaultProps.onExpand).toHaveBeenCalledWith('dir-1');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<TreeView {...defaultProps} />);
    
    const treeView = screen.getByTestId('tree-view-container');
    treeView.focus();
    
    // Navigate with arrow keys
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    
    expect(defaultProps.onSelect).toHaveBeenCalled();
  });

  it('handles drag and drop operations', async () => {
    const user = userEvent.setup();
    render(<TreeView {...defaultProps} />);
    
    const sourceNode = screen.getByTestId('tree-node-file-1');
    const targetNode = screen.getByTestId('tree-node-dir-1');
    
    // Start drag
    fireEvent.dragStart(sourceNode, {
      dataTransfer: { setData: vi.fn() }
    });
    
    expect(defaultProps.onDragStart).toHaveBeenCalled();
    
    // Drop
    fireEvent.drop(targetNode, {
      dataTransfer: { getData: vi.fn().mockReturnValue('{"id":"file-1"}') }
    });
    
    expect(defaultProps.onDrop).toHaveBeenCalled();
  });

  it('virtualizes large lists for performance', () => {
    const largeTree = createLargeFileSystemTree(1000);
    render(<TreeView {...defaultProps} data={largeTree} />);
    
    // Should only render visible items
    const renderedNodes = screen.getAllByTestId(/tree-node-/);
    expect(renderedNodes.length).toBeLessThan(50); // Assuming 50 is overscan
  });
});
```

#### 4.2 Organization Panel Component Tests

```typescript
// src/components/organization/__tests__/OrganizationPanel.test.tsx
describe('OrganizationPanel', () => {
  const defaultProps = {
    files: mockFiles,
    currentStructure: mockJohnnyDecimalStructure,
    onOrganize: vi.fn(),
    onPreview: vi.fn()
  };

  it('renders organization type selector', () => {
    render(<OrganizationPanel {...defaultProps} />);
    
    expect(screen.getByText('Organization Type')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /johnny decimal/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /file type/i })).toBeInTheDocument();
  });

  it('shows AI status and model information', () => {
    render(<OrganizationPanel {...defaultProps} />);
    
    expect(screen.getByText(/ai status/i)).toBeInTheDocument();
    expect(screen.getByText(/model:/i)).toBeInTheDocument();
  });

  it('handles organization type change', async () => {
    const user = userEvent.setup();
    render(<OrganizationPanel {...defaultProps} />);
    
    const fileTypeRadio = screen.getByRole('radio', { name: /file type/i });
    await user.click(fileTypeRadio);
    
    // Should trigger organization type change
    expect(fileTypeRadio).toBeChecked();
  });

  it('enables analyze button when files are selected', () => {
    render(<OrganizationPanel {...defaultProps} />);
    
    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    expect(analyzeButton).not.toBeDisabled();
  });

  it('shows analysis progress when analyzing', () => {
    const store = createMockStore({ isAnalyzing: true });
    
    render(
      <StoreProvider store={store}>
        <OrganizationPanel {...defaultProps} />
      </StoreProvider>
    );
    
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays AI suggestions after analysis', async () => {
    const user = userEvent.setup();
    const mockAnalyze = vi.fn().mockResolvedValue(mockAnalysisResults);
    
    render(<OrganizationPanel {...defaultProps} />);
    
    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    await user.click(analyzeButton);
    
    await waitFor(() => {
      expect(screen.getByText(/suggestions/i)).toBeInTheDocument();
    });
  });
});
```

## 🚀 TDD Implementation Phases

### Phase 1: Foundation Layer (Week 1-2)
1. **File System Services**
   - Write tests for FileScanner
   - Implement FileScanner to pass tests
   - Write tests for FileOperations
   - Implement FileOperations to pass tests

2. **Basic Type System**
   - Write tests for type validation utilities
   - Implement type guards and validators

3. **Rust Backend Commands**
   - Write Rust unit tests for file operations
   - Implement Tauri commands to pass tests

### Phase 2: AI Integration (Week 3-4)
1. **Ollama Service**
   - Write tests for service initialization
   - Implement service connection logic
   - Write tests for file analysis
   - Implement AI analysis pipeline

2. **Model Management**
   - Write tests for model download/installation
   - Implement model management features

### Phase 3: Organization Engine (Week 5-6)
1. **Johnny Decimal Engine**
   - Write tests for structure creation
   - Implement categorization logic
   - Write tests for validation
   - Implement validation rules

2. **Rule Engine**
   - Write tests for custom rules
   - Implement rule application system

### Phase 4: UI Components (Week 7-8)
1. **Core Components**
   - Write tests for TreeView component
   - Implement TreeView with virtualization
   - Write tests for file operations
   - Implement drag & drop functionality

2. **Organization Interface**
   - Write tests for OrganizationPanel
   - Implement AI suggestions UI
   - Write tests for settings
   - Implement configuration interface

### Phase 5: Integration & E2E (Week 9-10)
1. **Integration Tests**
   - Write tests for complete workflows
   - Test file system + AI integration
   - Test organization engine integration

2. **End-to-End Tests**
   - Write E2E tests for user journeys
   - Test cross-platform compatibility
   - Performance testing with large datasets

## 📊 Testing Scripts & Configuration

### Package.json Test Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:rust": "cd src-tauri && cargo test",
    "test:all": "npm run test && npm run test:rust && npm run test:e2e"
  }
}
```

### Vitest Configuration
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    },
    globals: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
```

### Test Setup File
```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
  emit: vi.fn()
}));

// Global test utilities
global.createMockFile = (name: string, mimeType: string) => ({
  id: `mock-${Date.now()}`,
  name,
  path: `/mock/${name}`,
  type: 'file' as const,
  size: 1024,
  extension: name.split('.').pop() || '',
  mimeType,
  lastModified: new Date(),
  created: new Date(),
  checksum: 'mock-checksum',
  isHidden: false,
  permissions: {
    readable: true,
    writable: true,
    executable: false,
    owner: 'user',
    group: 'user',
    mode: '644'
  }
});
```

## 🔄 Continuous Testing Workflow

### Pre-commit Hooks
```json
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test:coverage
npm run test:rust
npm run lint
npm run type-check
```

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - run: cd src-tauri && cargo test

  test-cross-platform:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:e2e
```

This comprehensive TDD strategy ensures that every feature is thoroughly tested before implementation, leading to more reliable code, better design decisions, and easier maintenance throughout the project lifecycle.