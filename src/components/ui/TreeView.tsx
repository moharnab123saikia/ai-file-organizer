import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { FileSystemItem } from '../../types';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import './TreeView.css';

export interface TreeViewProps {
  data: FileSystemItem | null;
  selectedItems: string[];
  expandedItems: string[];
  onSelect: (itemId: string, multiSelect: boolean) => void;
  onExpand: (itemId: string) => void;
  onDragStart?: (item: FileSystemItem) => void;
  onDrop?: (draggedItem: FileSystemItem, targetItem: FileSystemItem) => void;
  height: number;
  className?: string;
}

interface TreeNodeProps {
  node: FileSystemItem;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  isDragOver: boolean;
  isFocused: boolean;
  onSelect: (itemId: string, multiSelect: boolean) => void;
  onExpand: (itemId: string) => void;
  onDragStart?: (item: FileSystemItem) => void;
  onDrop?: (draggedItem: FileSystemItem, targetItem: FileSystemItem) => void;
  onFocus: (itemId: string) => void;
  setDraggedItem: (item: FileSystemItem | null) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isSelected,
  isExpanded,
  isDragOver,
  isFocused,
  onSelect,
  onExpand,
  onDragStart,
  onDrop,
  onFocus,
  setDraggedItem
}) => {
  const { draggedItem } = useTreeViewContext();
  const nodeRef = useRef<HTMLDivElement>(null);

  const hasChildren = node.children && node.children.length > 0;
  const isDirectory = node.type === 'directory';

  const handleClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const multiSelect = event.ctrlKey || event.metaKey;
    onSelect(node.id, multiSelect);
    onFocus(node.id);
  }, [node.id, onSelect, onFocus]);

  const handleExpandClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onExpand(node.id);
  }, [node.id, onExpand]);

  const handleDragStart = useCallback((event: React.DragEvent) => {
    // Check if dataTransfer is available (JSDOM limitation in tests)
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify(node));
      event.dataTransfer.effectAllowed = 'move';
    }
    setDraggedItem(node);
    onDragStart?.(node);
  }, [node, onDragStart, setDraggedItem]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    // Check if dataTransfer is available (JSDOM limitation in tests)
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      let draggedData: FileSystemItem;
      
      // Check if dataTransfer is available (JSDOM limitation in tests)
      if (event.dataTransfer) {
        draggedData = JSON.parse(event.dataTransfer.getData('application/json'));
      } else {
        // Fallback for tests - use the dragged item from state
        draggedData = draggedItem!;
      }
      
      if (draggedData && draggedData.id !== node.id) {
        onDrop?.(draggedData, node);
      }
    } catch (error) {
      console.warn('Failed to parse dropped data:', error);
    }
    
    setDraggedItem(null);
  }, [node, isDirectory, onDrop, draggedItem, setDraggedItem]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
        if (isDirectory && !isExpanded) {
          event.preventDefault();
          onExpand(node.id);
        }
        break;
      case 'ArrowLeft':
        if (isDirectory && isExpanded) {
          event.preventDefault();
          onExpand(node.id);
        }
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        onSelect(node.id, event.ctrlKey || event.metaKey);
        break;
    }
  }, [node.id, isDirectory, isExpanded, onExpand, onSelect]);

  const nodeClasses = [
    'tree-node',
    `tree-node--${node.type}`,
    isSelected && 'tree-node--selected',
    isDragOver && 'tree-node--drag-over',
    isFocused && 'tree-node--focused'
  ].filter(Boolean).join(' ');

  return (
    <div>
      <div
        ref={nodeRef}
        className={nodeClasses}
        style={{ paddingLeft: `${level * 20}px` }}
        draggable
        tabIndex={0}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-level={level + 1}
        data-testid={`tree-node-${node.id}`}
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocus(node.id)}
      >
        <div className="tree-node__content">
          {isDirectory && (
            <button
              className="tree-node__expand-toggle"
              onClick={handleExpandClick}
              aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              tabIndex={-1}
            >
              {isExpanded ? (
                <ChevronDown className="tree-node__expand-icon tree-node__expand-icon--expanded" />
              ) : (
                <ChevronRight className="tree-node__expand-icon" />
              )}
            </button>
          )}
          
          <div className="tree-node__icon">
            {isDirectory ? (
              <Folder className="tree-node__folder-icon" />
            ) : (
              <File className="tree-node__file-icon" />
            )}
          </div>
          
          <span className="tree-node__name">{node.name}</span>
          
          {node.type === 'file' && (
            <span className="tree-node__size">
              {formatFileSize(node.size)}
            </span>
          )}
        </div>
      </div>
      
      {isDirectory && isExpanded && hasChildren && (
        <div className="tree-node__children">
          {node.children!.map((child) => (
            <TreeNodeContainer
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onExpand={onExpand}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onFocus={onFocus}
              setDraggedItem={setDraggedItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface TreeNodeContainerProps {
  node: FileSystemItem;
  level: number;
  onSelect: (itemId: string, multiSelect: boolean) => void;
  onExpand: (itemId: string) => void;
  onDragStart?: (item: FileSystemItem) => void;
  onDrop?: (draggedItem: FileSystemItem, targetItem: FileSystemItem) => void;
  onFocus: (itemId: string) => void;
  setDraggedItem: (item: FileSystemItem | null) => void;
}

const TreeNodeContainer: React.FC<TreeNodeContainerProps> = React.memo(({
  node,
  level,
  onSelect,
  onExpand,
  onDragStart,
  onDrop,
  onFocus,
  setDraggedItem
}) => {
  const {
    selectedItems,
    expandedItems,
    dragOverItem,
    focusedItem
  } = useTreeViewContext();

  const isSelected = selectedItems.includes(node.id);
  const isExpanded = expandedItems.includes(node.id);
  const isDragOver = dragOverItem === node.id;
  const isFocused = focusedItem === node.id;

  return (
    <TreeNode
      node={node}
      level={level}
      isSelected={isSelected}
      isExpanded={isExpanded}
      isDragOver={isDragOver}
      isFocused={isFocused}
      onSelect={onSelect}
      onExpand={onExpand}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onFocus={onFocus}
      setDraggedItem={setDraggedItem}
    />
  );
});

TreeNodeContainer.displayName = 'TreeNodeContainer';

// Context for tree view state
const TreeViewContext = React.createContext<{
  selectedItems: string[];
  expandedItems: string[];
  dragOverItem: string | null;
  focusedItem: string | null;
  draggedItem: FileSystemItem | null;
}>({
  selectedItems: [],
  expandedItems: [],
  dragOverItem: null,
  focusedItem: null,
  draggedItem: null
});

const useTreeViewContext = () => React.useContext(TreeViewContext);

export const TreeView: React.FC<TreeViewProps> = ({
  data,
  selectedItems,
  expandedItems,
  onSelect,
  onExpand,
  onDragStart,
  onDrop,
  height,
  className = ''
}) => {
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<FileSystemItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const contextValue = useMemo(() => ({
    selectedItems,
    expandedItems,
    dragOverItem,
    focusedItem,
    draggedItem
  }), [selectedItems, expandedItems, dragOverItem, focusedItem, draggedItem]);

  const handleFocus = useCallback((itemId: string) => {
    setFocusedItem(itemId);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!data) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        // Focus on first visible node
        setFocusedItem(data.id);
        break;
      case 'Tab':
        // Allow default tab behavior
        break;
    }
  }, [data]);

  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      const target = event.target as HTMLElement;
      const nodeElement = target.closest('[data-testid^="tree-node-"]');
      if (nodeElement) {
        const nodeId = nodeElement.getAttribute('data-testid')?.replace('tree-node-', '');
        setDragOverItem(nodeId || null);
      } else {
        setDragOverItem(null);
      }
    };

    const handleDragLeave = () => {
      setDragOverItem(null);
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDragLeave);

    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDragLeave);
    };
  }, []);

  if (!data) {
    return (
      <div 
        className={`tree-view tree-view--empty ${className}`}
        style={{ height }}
        data-testid="tree-view-container"
      >
        <div className="tree-view__empty-state">
          <p>No files to display</p>
        </div>
      </div>
    );
  }

  return (
    <TreeViewContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={`tree-view ${className}`}
        style={{ height, overflow: 'auto' }}
        role="tree"
        tabIndex={0}
        data-testid="tree-view"
        onKeyDown={handleKeyDown}
      >
        <TreeNodeContainer
          node={data}
          level={0}
          onSelect={onSelect}
          onExpand={onExpand}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onFocus={handleFocus}
          setDraggedItem={setDraggedItem}
        />
      </div>
    </TreeViewContext.Provider>
  );
};

// Utility function for formatting file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;
  const digitIndex = Math.floor(Math.log(bytes) / Math.log(base));
  const unitIndex = Math.min(digitIndex, units.length - 1);
  
  return `${(bytes / Math.pow(base, unitIndex)).toFixed(1)} ${units[unitIndex]}`;
}

TreeView.displayName = 'TreeView';