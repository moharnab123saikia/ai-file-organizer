# AI File Organizer - Component Architecture & Development Guidelines

## 📋 Overview

This document defines the component architecture patterns, development guidelines, and implementation standards for the AI File Organizer React application. It establishes conventions for component design, state management, and code organization to ensure consistency and maintainability.

## 🏗️ Component Architecture Patterns

### 1. Component Hierarchy Structure

```
Application Layer
├── App.tsx (Root Application)
├── Layout Components (Shell & Navigation)
├── Feature Components (Business Logic)
├── UI Components (Reusable Elements)
└── Utility Components (Specialized Functions)
```

### 2. Component Classification

#### **Layout Components** - Application Shell
- **Purpose**: Define application structure and navigation
- **Examples**: `MainLayout`, `AppHeader`, `Sidebar`, `StatusBar`
- **Characteristics**: 
  - Handle global UI state
  - Manage routing and navigation
  - Provide consistent spacing and structure

#### **Feature Components** - Business Logic
- **Purpose**: Implement specific application features
- **Examples**: `FileExplorer`, `OrganizationPanel`, `AIAnalysis`
- **Characteristics**:
  - Connect to business logic stores
  - Handle complex user interactions
  - Orchestrate multiple UI components

#### **UI Components** - Reusable Elements
- **Purpose**: Provide consistent, reusable interface elements
- **Examples**: `Button`, `Modal`, `TreeView`, `ProgressBar`
- **Characteristics**:
  - Pure or nearly pure components
  - Highly configurable via props
  - No direct business logic

#### **Utility Components** - Specialized Functions
- **Purpose**: Provide specific functionality or integrations
- **Examples**: `ErrorBoundary`, `LazyLoader`, `VirtualizedList`
- **Characteristics**:
  - Single responsibility
  - Often wrapping third-party libraries
  - Performance or functionality focused

## 🧩 Component Design Patterns

### 1. Compound Component Pattern

```typescript
// TreeView.tsx - Main compound component
export const TreeView = {
  Root: TreeViewRoot,
  Node: TreeViewNode,
  Folder: TreeViewFolder,
  File: TreeViewFile,
  Actions: TreeViewActions
};

// Usage
<TreeView.Root data={fileTree}>
  <TreeView.Node>
    <TreeView.Folder>
      <TreeView.File />
      <TreeView.Actions />
    </TreeView.Folder>
  </TreeView.Node>
</TreeView.Root>
```

### 2. Render Props Pattern

```typescript
// VirtualizedList.tsx
interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  height: number;
  itemHeight: number;
}

export const VirtualizedList = <T,>({ 
  items, 
  renderItem, 
  height, 
  itemHeight 
}: VirtualizedListProps<T>) => {
  // Virtualization logic
  return (
    <div style={{ height }}>
      {visibleItems.map((item, index) => 
        renderItem(item, index)
      )}
    </div>
  );
};
```

### 3. Custom Hook Pattern

```typescript
// useFileExplorer.ts
export const useFileExplorer = (rootPath: string) => {
  const [tree, setTree] = useState<FileSystemTree | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const scanDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const result = await invoke('scan_directory', { path });
      setTree(result);
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectItem = useCallback((itemId: string, multiSelect = false) => {
    setSelectedItems(prev => 
      multiSelect 
        ? [...prev, itemId]
        : [itemId]
    );
  }, []);

  return {
    tree,
    selectedItems,
    isLoading,
    scanDirectory,
    selectItem,
    // Other methods...
  };
};
```

### 4. Higher-Order Component Pattern

```typescript
// withErrorBoundary.tsx
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return class WithErrorBoundary extends React.Component<
    P,
    { hasError: boolean; error?: Error }
  > {
    constructor(props: P) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Component error:', error, errorInfo);
      // Log to error reporting service
    }

    render() {
      if (this.state.hasError) {
        return <ErrorFallback error={this.state.error} />;
      }

      return <Component {...this.props} />;
    }
  };
};
```

## 🎯 Specific Component Architectures

### 1. File Explorer Component System

```typescript
// FileExplorer/index.tsx - Main feature component
export const FileExplorer: React.FC<FileExplorerProps> = ({
  rootPath,
  onSelectionChange,
  onFileAction
}) => {
  const {
    tree,
    selectedItems,
    expandedItems,
    isLoading,
    error,
    scanDirectory,
    selectItem,
    expandItem,
    performAction
  } = useFileExplorer(rootPath);

  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop
  } = useDragDrop({
    onDrop: (item, target) => performAction('move', item, target)
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!tree) return <EmptyState />;

  return (
    <div className="file-explorer">
      <FileExplorerHeader
        path={rootPath}
        onRefresh={() => scanDirectory(rootPath)}
        onViewChange={setViewMode}
      />
      
      <FileExplorerContent>
        <TreeView
          data={tree}
          selectedItems={selectedItems}
          expandedItems={expandedItems}
          onSelect={selectItem}
          onExpand={expandItem}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          renderNode={(node) => (
            <FileNode
              node={node}
              isSelected={selectedItems.includes(node.id)}
              isDragOver={dragState.target === node.id}
              onAction={(action) => performAction(action, node)}
            />
          )}
        />
      </FileExplorerContent>
      
      <FileExplorerFooter
        selectedCount={selectedItems.length}
        totalItems={tree.totalFiles + tree.totalDirectories}
      />
    </div>
  );
};

// FileExplorer/components/TreeView.tsx
export const TreeView: React.FC<TreeViewProps> = ({
  data,
  selectedItems,
  expandedItems,
  onSelect,
  onExpand,
  onDragStart,
  onDrop,
  renderNode
}) => {
  const [virtualizer] = useVirtualizer({
    count: getVisibleNodeCount(data, expandedItems),
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 32,
    overscan: 10
  });

  return (
    <div
      ref={scrollElementRef}
      className="tree-view"
      style={{ height: '100%', overflow: 'auto' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const node = getNodeAtIndex(data, expandedItems, virtualItem.index);
          
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              {renderNode(node)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// FileExplorer/components/FileNode.tsx
export const FileNode: React.FC<FileNodeProps> = ({
  node,
  level = 0,
  isSelected,
  isExpanded,
  isDragOver,
  onSelect,
  onExpand,
  onAction,
  onDragStart,
  onDrop
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.name);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (event.detail === 2) {
      // Double click
      if (node.type === 'directory') {
        onExpand?.(node.id);
      } else {
        onAction?.('open', node);
      }
    } else {
      // Single click
      onSelect?.(node.id, event.ctrlKey || event.metaKey);
    }
  }, [node, onSelect, onExpand, onAction]);

  const handleDragStart = useCallback((event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify(node));
    onDragStart?.(node);
  }, [node, onDragStart]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const draggedNode = JSON.parse(
      event.dataTransfer.getData('application/json')
    );
    onDrop?.(draggedNode, node);
  }, [node, onDrop]);

  const handleRename = useCallback(() => {
    if (editValue !== node.name) {
      onAction?.('rename', node, { newName: editValue });
    }
    setIsEditing(false);
  }, [editValue, node, onAction]);

  return (
    <div
      ref={nodeRef}
      className={classNames(
        'file-node',
        {
          'file-node--selected': isSelected,
          'file-node--drag-over': isDragOver,
          'file-node--directory': node.type === 'directory',
          'file-node--file': node.type === 'file'
        }
      )}
      style={{ paddingLeft: `${level * 20}px` }}
      draggable
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      data-testid={`file-node-${node.id}`}
    >
      <div className="file-node__content">
        {node.type === 'directory' && (
          <button
            className="file-node__expand-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onExpand?.(node.id);
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronIcon
              className={classNames('file-node__expand-icon', {
                'file-node__expand-icon--expanded': isExpanded
              })}
            />
          </button>
        )}
        
        <FileIcon
          type={node.type}
          extension={node.type === 'file' ? getFileExtension(node.name) : undefined}
          className="file-node__icon"
        />
        
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditValue(node.name);
                setIsEditing(false);
              }
            }}
            className="file-node__edit-input"
            autoFocus
          />
        ) : (
          <span
            className="file-node__name"
            onDoubleClick={() => setIsEditing(true)}
          >
            {node.name}
          </span>
        )}
        
        <div className="file-node__metadata">
          {node.type === 'file' && (
            <span className="file-node__size">
              {formatFileSize(node.size)}
            </span>
          )}
          <span className="file-node__modified">
            {formatDate(node.lastModified)}
          </span>
        </div>
      </div>
      
      <FileNodeActions
        node={node}
        onAction={onAction}
        className="file-node__actions"
      />
    </div>
  );
};
```

### 2. Organization Panel Component System

```typescript
// OrganizationPanel/index.tsx
export const OrganizationPanel: React.FC<OrganizationPanelProps> = ({
  files,
  currentStructure,
  onOrganize,
  onPreview
}) => {
  const {
    organizationType,
    setOrganizationType,
    analysisResults,
    isAnalyzing,
    analyzeFiles,
    createPreview
  } = useOrganization();

  const {
    aiStatus,
    currentModel,
    suggestions,
    confidence
  } = useAI();

  return (
    <div className="organization-panel">
      <OrganizationTypeSelector
        value={organizationType}
        onChange={setOrganizationType}
        options={ORGANIZATION_TYPES}
      />
      
      <AIStatusCard
        status={aiStatus}
        model={currentModel}
        confidence={confidence}
      />
      
      {organizationType === OrganizationType.JOHNNY_DECIMAL && (
        <JohnnyDecimalConfig
          structure={currentStructure}
          onStructureChange={setStructure}
        />
      )}
      
      <AnalysisSection
        isAnalyzing={isAnalyzing}
        results={analysisResults}
        onAnalyze={() => analyzeFiles(files)}
      />
      
      <SuggestionsPanel
        suggestions={suggestions}
        onAccept={handleSuggestionAccept}
        onReject={handleSuggestionReject}
        onModify={handleSuggestionModify}
      />
      
      <ActionButtons
        onPreview={() => createPreview(files)}
        onOrganize={() => onOrganize(analysisResults)}
        disabled={!analysisResults || isAnalyzing}
      />
    </div>
  );
};

// OrganizationPanel/components/JohnnyDecimalConfig.tsx
export const JohnnyDecimalConfig: React.FC<JohnnyDecimalConfigProps> = ({
  structure,
  onStructureChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);

  return (
    <Card className="johnny-decimal-config">
      <CardHeader
        title="Johnny Decimal Structure"
        actions={
          <Button
            variant="ghost"
            size="small"
            onClick={() => setIsExpanded(!isExpanded)}
            icon={<ExpandIcon />}
          />
        }
      />
      
      {isExpanded && (
        <CardContent>
          <AreasGrid>
            {structure.areas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                isEditing={editingArea === area.id}
                onEdit={() => setEditingArea(area.id)}
                onSave={(updatedArea) => {
                  handleAreaUpdate(updatedArea);
                  setEditingArea(null);
                }}
                onCancel={() => setEditingArea(null)}
              />
            ))}
            
            <AddAreaButton
              onClick={() => handleAddArea()}
            />
          </AreasGrid>
          
          <StructureValidation
            structure={structure}
            onValidate={validateStructure}
          />
        </CardContent>
      )}
    </Card>
  );
};
```

## 🔄 State Management Integration

### 1. Zustand Store Integration

```typescript
// hooks/useFileSystemStore.ts
export const useFileSystemStore = <T>(
  selector: (state: FileSystemStore) => T
): T => {
  return useStore(fileSystemStore, selector);
};

// Component usage
export const FileExplorer: React.FC = () => {
  const {
    currentStructure,
    selectedItems,
    isScanning,
    scanDirectory,
    selectItem
  } = useFileSystemStore((state) => ({
    currentStructure: state.currentStructure,
    selectedItems: state.selectedItems,
    isScanning: state.isScanning,
    scanDirectory: state.scanDirectory,
    selectItem: state.selectItem
  }));

  // Component logic...
};
```

### 2. Store Subscription Patterns

```typescript
// hooks/useStoreSubscription.ts
export const useStoreSubscription = <T>(
  store: UseBoundStore<any>,
  selector: (state: any) => T,
  equalityFn?: (a: T, b: T) => boolean
) => {
  const [value, setValue] = useState(() => selector(store.getState()));

  useEffect(() => {
    const unsubscribe = store.subscribe(
      (newState) => {
        const newValue = selector(newState);
        if (!equalityFn || !equalityFn(value, newValue)) {
          setValue(newValue);
        }
      }
    );

    return unsubscribe;
  }, [store, selector, equalityFn, value]);

  return value;
};
```

## 🎨 Styling and Theme Integration

### 1. Styled Components with Tailwind

```typescript
// components/ui/Button.tsx
interface ButtonProps extends BaseComponentProps {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  children,
  className,
  onClick,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-secondary-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-primary-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizeClasses = {
    small: 'px-3 py-2 text-sm rounded',
    medium: 'px-4 py-2 text-base rounded-md',
    large: 'px-6 py-3 text-lg rounded-lg'
  };

  const classes = classNames(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    {
      'opacity-50 cursor-not-allowed': disabled || loading,
      'cursor-wait': loading
    },
    className
  );

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <LoadingSpinner className="mr-2" size="small" />}
      {!loading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};
```

### 2. Theme-Aware Components

```typescript
// hooks/useTheme.ts
export const useTheme = () => {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  
  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark'
  };
};

// Component usage
export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="small"
      icon={theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    />
  );
};
```

## 🧪 Testing Patterns

### 1. Component Testing

```typescript
// __tests__/FileNode.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileNode } from '../FileNode';
import { mockFileNode } from '../__mocks__/fileNode';

describe('FileNode', () => {
  const mockProps = {
    node: mockFileNode,
    onSelect: jest.fn(),
    onExpand: jest.fn(),
    onAction: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders file node correctly', () => {
    render(<FileNode {...mockProps} />);
    
    expect(screen.getByText(mockFileNode.name)).toBeInTheDocument();
    expect(screen.getByTestId(`file-node-${mockFileNode.id}`)).toBeInTheDocument();
  });

  it('handles selection on click', async () => {
    const user = userEvent.setup();
    render(<FileNode {...mockProps} />);
    
    await user.click(screen.getByTestId(`file-node-${mockFileNode.id}`));
    
    expect(mockProps.onSelect).toHaveBeenCalledWith(mockFileNode.id, false);
  });

  it('handles multi-selection with ctrl+click', async () => {
    const user = userEvent.setup();
    render(<FileNode {...mockProps} />);
    
    await user.click(screen.getByTestId(`file-node-${mockFileNode.id}`), {
      ctrlKey: true
    });
    
    expect(mockProps.onSelect).toHaveBeenCalledWith(mockFileNode.id, true);
  });

  it('enters edit mode on double-click of name', async () => {
    const user = userEvent.setup();
    render(<FileNode {...mockProps} />);
    
    await user.dblClick(screen.getByText(mockFileNode.name));
    
    expect(screen.getByDisplayValue(mockFileNode.name)).toBeInTheDocument();
  });

  it('saves new name on enter key', async () => {
    const user = userEvent.setup();
    render(<FileNode {...mockProps} />);
    
    await user.dblClick(screen.getByText(mockFileNode.name));
    
    const input = screen.getByDisplayValue(mockFileNode.name);
    await user.clear(input);
    await user.type(input, 'new-name.txt');
    await user.keyboard('{Enter}');
    
    expect(mockProps.onAction).toHaveBeenCalledWith('rename', mockFileNode, {
      newName: 'new-name.txt'
    });
  });
});
```

### 2. Hook Testing

```typescript
// __tests__/useFileExplorer.test.ts
import { renderHook, act } from '@testing-library/react';
import { useFileExplorer } from '../useFileExplorer';
import { mockInvoke } from '../__mocks__/tauri';

jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn()
}));

describe('useFileExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useFileExplorer('/test/path'));
    
    expect(result.current.tree).toBeNull();
    expect(result.current.selectedItems).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('scans directory and updates tree', async () => {
    const mockTree = { /* mock tree data */ };
    (mockInvoke as jest.Mock).mockResolvedValue(mockTree);
    
    const { result } = renderHook(() => useFileExplorer('/test/path'));
    
    await act(async () => {
      await result.current.scanDirectory('/test/path');
    });
    
    expect(result.current.tree).toEqual(mockTree);
    expect(mockInvoke).toHaveBeenCalledWith('scan_directory', { path: '/test/path' });
  });

  it('handles selection correctly', () => {
    const { result } = renderHook(() => useFileExplorer('/test/path'));
    
    act(() => {
      result.current.selectItem('file-1');
    });
    
    expect(result.current.selectedItems).toEqual(['file-1']);
    
    act(() => {
      result.current.selectItem('file-2', true);
    });
    
    expect(result.current.selectedItems).toEqual(['file-1', 'file-2']);
  });
});
```

## 📱 Responsive Design Patterns

### 1. Responsive Layout Components

```typescript
// components/layout/ResponsiveLayout.tsx
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  sidebar,
  main,
  footer
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { width } = useWindowSize();
  const isMobile = width < 768;

  return (
    <div className="responsive-layout">
      {isMobile ? (
        <>
          <MobileHeader onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
          <MobileSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          >
            {sidebar}
          </MobileSidebar>
          <main className="responsive-layout__main">{main}</main>
        </>
      ) : (
        <>
          <aside className="responsive-layout__sidebar">{sidebar}</aside>
          <main className="responsive-layout__main">{main}</main>
        </>
      )}
      {footer && <footer className="responsive-layout__footer">{footer}</footer>}
    </div>
  );
};
```

### 2. Adaptive Component Behavior

```typescript
// hooks/useAdaptiveLayout.ts
export const useAdaptiveLayout = () => {
  const { width, height } = useWindowSize();
  
  const breakpoint = useMemo(() => {
    if (width < 640) return 'sm';
    if (width < 768) return 'md';
    if (width < 1024) return 'lg';
    if (width < 1280) return 'xl';
    return '2xl';
  }, [width]);

  const isMobile = breakpoint === 'sm' || breakpoint === 'md';
  const isTablet = breakpoint === 'lg';
  const isDesktop = breakpoint === 'xl' || breakpoint === '2xl';

  const adaptiveProps = useMemo(() => ({
    treeItemHeight: isMobile ? 48 : isTablet ? 40 : 32,
    sidebarWidth: isMobile ? '100%' : isTablet ? 240 : 300,
    maxItemsPerPage: isMobile ? 20 : isTablet ? 50 : 100,
    showPreview: isDesktop,
    stackLayout: isMobile
  }), [isMobile, isTablet, isDesktop]);

  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    adaptiveProps
  };
};
```

## 🚀 Performance Optimization Patterns

### 1. Memoization Strategies

```typescript
// components/FileList.tsx
export const FileList: React.FC<FileListProps> = ({ 
  files, 
  onSelect, 
  selectedItems 
}) => {
  // Memoize expensive calculations
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => 
      a.type === b.type ? a.name.localeCompare(b.name) : 
      a.type === 'directory' ? -1 : 1
    );
  }, [files]);

  // Memoize selection state
  const selectionMap = useMemo(() => {
    return new Set(selectedItems);
  }, [selectedItems]);

  // Memoize callback functions
  const handleItemSelect = useCallback((fileId: string, multiSelect: boolean) => {
    onSelect(fileId, multiSelect);
  }, [onSelect]);

  return (
    <VirtualizedList
      items={sortedFiles}
      renderItem={(file, index) => (
        <FileItem
          key={file.id}
          file={file}
          isSelected={selectionMap.has(file.id)}
          onSelect={handleItemSelect}
        />
      )}
    />
  );
};

// Memoized file item component
export const FileItem = React.memo<FileItemProps>(({ 
  file, 
  isSelected, 
  onSelect 
}) => {
  const handleClick = useCallback((event: React.MouseEvent) => {
    onSelect(file.id, event.ctrlKey || event.metaKey);
  }, [file.id, onSelect]);

  return (
    <div
      className={classNames('file-item', { 'file-item--selected': isSelected })}
      onClick={handleClick}
    >
      <FileIcon type={file.type} />
      <span>{file.name}</span>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom equality check
  return (
    prevProps.file.id === nextProps.file.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.file.lastModified === nextProps.file.lastModified
  );
});
```

### 2. Code Splitting and Lazy Loading

```typescript
// components/LazyModal.tsx
const SettingsModal = lazy(() => import('./modals/SettingsModal'));
const OrganizationPreview = lazy(() => import('./modals/OrganizationPreview'));

export const ModalRenderer: React.FC = () => {
  const activeModal = useUIStore((state) => state.activeModal);

  const renderModal = () => {
    switch (activeModal) {
      case 'settings':
        return <SettingsModal />;
      case 'organization-preview':
        return <OrganizationPreview />;
      default:
        return null;
    }
  };

  return (
    <Suspense fallback={<ModalLoadingSpinner />}>
      {renderModal()}
    </Suspense>
  );
};
```

This comprehensive Component Architecture & Development Guidelines document provides:

1. **Clear component hierarchies** and classification systems
2. **Proven design patterns** for React development
3. **Detailed implementation examples** for complex components
4. **State management integration** patterns with Zustand
5. **Styling and theming** approaches with Tailwind CSS
6. **Testing strategies** for components and hooks
7. **Responsive design** patterns for cross-device compatibility
8. **Performance optimization** techniques and patterns

These guidelines will ensure consistent, maintainable, and performant component development throughout the project.