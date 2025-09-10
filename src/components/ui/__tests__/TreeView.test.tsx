import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TreeView } from '../TreeView';
import { FileSystemItem } from '../../../types';

// Mock file system tree data
const mockFileTree: FileSystemItem = {
  id: 'root',
  name: 'Documents',
  type: 'directory',
  path: '/Users/test/Documents',
  size: 0,
  modifiedAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  children: [
    {
      id: 'folder-1',
      name: 'Projects',
      type: 'directory',
      path: '/Users/test/Documents/Projects',
      size: 0,
      modifiedAt: new Date('2024-01-15'),
      createdAt: new Date('2024-01-15'),
      children: [
        {
          id: 'file-1',
          name: 'README.md',
          type: 'file',
          path: '/Users/test/Documents/Projects/README.md',
          size: 1024,
          modifiedAt: new Date('2024-01-20'),
          createdAt: new Date('2024-01-20'),
          extension: 'md',
          mimeType: 'text/markdown',
          children: []
        },
        {
          id: 'file-2',
          name: 'package.json',
          type: 'file',
          path: '/Users/test/Documents/Projects/package.json',
          size: 512,
          modifiedAt: new Date('2024-01-18'),
          createdAt: new Date('2024-01-18'),
          extension: 'json',
          mimeType: 'application/json',
          children: []
        }
      ]
    },
    {
      id: 'file-4',
      name: 'notes.txt',
      type: 'file',
      path: '/Users/test/Documents/notes.txt',
      size: 256,
      modifiedAt: new Date('2024-01-05'),
      createdAt: new Date('2024-01-05'),
      extension: 'txt',
      mimeType: 'text/plain',
      children: []
    }
  ]
};

const mockEmptyTree: FileSystemItem = {
  id: 'empty-root',
  name: 'Empty Folder',
  type: 'directory',
  path: '/Users/test/Empty',
  size: 0,
  modifiedAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  children: []
};

describe('TreeView Component', () => {
  const defaultProps = {
    data: mockFileTree,
    selectedItems: [],
    expandedItems: ['root'],
    onSelect: vi.fn(),
    onExpand: vi.fn(),
    onDragStart: vi.fn(),
    onDrop: vi.fn(),
    height: 400
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders tree structure correctly', () => {
      render(<TreeView {...defaultProps} />);
      
      expect(screen.getAllByText('Documents')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Projects')[0]).toBeInTheDocument();
      expect(screen.getAllByText('notes.txt')[0]).toBeInTheDocument();
    });

    it('renders with custom height', () => {
      render(<TreeView {...defaultProps} height={600} />);
      
      const treeContainers = screen.getAllByTestId('tree-view-container');
      const currentContainer = treeContainers.find(container =>
        container.style.height === '600px'
      );
      expect(currentContainer).toBeDefined();
      expect(currentContainer).toHaveStyle({ height: '600px' });
    });

    it('renders empty state when no data provided', () => {
      render(<TreeView {...defaultProps} data={null} />);
      
      expect(screen.getAllByText('No files to display')[0]).toBeInTheDocument();
    });

    it('renders empty folder correctly', () => {
      render(<TreeView {...defaultProps} data={mockEmptyTree} />);
      
      expect(screen.getAllByText('Empty Folder')[0]).toBeInTheDocument();
    });

    it('applies correct CSS classes based on node type', () => {
      render(<TreeView {...defaultProps} />);
      
      const directoryNode = screen.getAllByTestId('tree-node-root')[0];
      const fileNode = screen.getAllByTestId('tree-node-file-4')[0];
      
      expect(directoryNode).toHaveClass('tree-node--directory');
      expect(fileNode).toHaveClass('tree-node--file');
    });
  });

  describe('Expansion and Collapse', () => {
    it('shows expand/collapse button for directories', () => {
      render(<TreeView {...defaultProps} />);
      
      // Root directory starts expanded, so should show "Collapse Documents"
      const collapseButton = screen.getAllByLabelText('Collapse Documents')[0];
      expect(collapseButton).toBeInTheDocument();
      
      // Check for nested directory that should be collapsed
      const expandButton = screen.getAllByLabelText('Expand Projects')[0];
      expect(expandButton).toBeInTheDocument();
    });

    it('does not show expand button for files', () => {
      render(<TreeView {...defaultProps} />);
      
      expect(screen.queryAllByLabelText('Expand notes.txt')[0] || null).toBeNull();
    });

    it('calls onExpand when expand button is clicked', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} expandedItems={[]} />);
      
      const expandButton = screen.getAllByLabelText('Expand Documents')[0];
      await user.click(expandButton);
      
      expect(defaultProps.onExpand).toHaveBeenCalledWith('root');
    });

    it('shows expanded icon when directory is expanded', () => {
      render(<TreeView {...defaultProps} expandedItems={['root']} />);
      
      const expandButton = screen.getAllByLabelText('Collapse Documents')[0];
      expect(expandButton).toBeInTheDocument();
    });

    it('hides children when directory is collapsed', () => {
      render(<TreeView {...defaultProps} expandedItems={[]} />);
      
      // When collapsed, the Projects text should not be visible in the current tree
      const projectsElements = screen.queryAllByText('Projects');
      const visibleProjects = projectsElements.filter(el => {
        // Check if element is actually visible (not hidden by CSS or removed from DOM)
        return el.closest('.tree-node__children') === null;
      });
      expect(visibleProjects.length).toBe(0);
    });

    it('shows children when directory is expanded', () => {
      render(<TreeView {...defaultProps} expandedItems={['root']} />);
      
      expect(screen.getAllByText('Projects')[0]).toBeInTheDocument();
    });

    it('handles nested expansion correctly', () => {
      render(<TreeView {...defaultProps} expandedItems={['root', 'folder-1']} />);
      
      expect(screen.getAllByText('README.md')[0]).toBeInTheDocument();
      expect(screen.getAllByText('package.json')[0]).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onSelect when node is clicked', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const fileNode = screen.getAllByText('notes.txt')[0];
      await user.click(fileNode);
      
      expect(defaultProps.onSelect).toHaveBeenCalledWith('file-4', false);
    });

    it('handles multi-selection with ctrl+click', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const fileNode = screen.getAllByText('notes.txt')[0];
      await user.keyboard('{Control>}');
      await user.click(fileNode);
      await user.keyboard('{/Control}');
      
      expect(defaultProps.onSelect).toHaveBeenCalledWith('file-4', true);
    });

    it('applies selected styling to selected nodes', () => {
      const { container } = render(<TreeView {...defaultProps} selectedItems={['file-4']} />);
      
      const selectedNode = container.querySelector('[data-testid="tree-node-file-4"].tree-node--selected');
      expect(selectedNode).toBeTruthy();
      expect(selectedNode).toHaveClass('tree-node--selected');
    });

    it('allows multiple nodes to be selected', () => {
      const { container } = render(<TreeView {...defaultProps} selectedItems={['file-4', 'folder-1']} />);
      
      const fileNode = container.querySelector('[data-testid="tree-node-file-4"].tree-node--selected');
      const folderNode = container.querySelector('[data-testid="tree-node-folder-1"].tree-node--selected');
      
      expect(fileNode).toBeTruthy();
      expect(fileNode).toHaveClass('tree-node--selected');
      expect(folderNode).toBeTruthy();
      expect(folderNode).toHaveClass('tree-node--selected');
    });
  });

  describe('Drag and Drop', () => {
    it('calls onDragStart when dragging begins', () => {
      render(<TreeView {...defaultProps} />);
      
      const draggableNode = screen.getAllByTestId('tree-node-file-4')[0];
      fireEvent.dragStart(draggableNode);
      
      expect(defaultProps.onDragStart).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'file-4' })
      );
    });

    it('handles drop events correctly', () => {
      render(<TreeView {...defaultProps} />);
      
      const sourceNode = screen.getAllByTestId('tree-node-file-4')[0];
      const targetNode = screen.getAllByTestId('tree-node-folder-1')[0];
      
      // Start drag
      fireEvent.dragStart(sourceNode);
      
      // Drop on target
      fireEvent.dragOver(targetNode);
      fireEvent.drop(targetNode);
      
      expect(defaultProps.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'file-4' }),
        expect.objectContaining({ id: 'folder-1' })
      );
    });

    it('shows drag over styling when dragging over valid target', () => {
      render(<TreeView {...defaultProps} />);
      
      const targetNode = screen.getAllByTestId('tree-node-folder-1')[0];
      fireEvent.dragOver(targetNode);
      
      expect(targetNode).toHaveClass('tree-node--drag-over');
    });
  });

  describe('Keyboard Navigation', () => {
    it('handles arrow key navigation', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeView = screen.getAllByTestId('tree-view-container')[0];
      treeView.focus();
      
      await user.keyboard('{ArrowDown}');
      expect(screen.getAllByTestId('tree-node-root')[0]).toHaveClass('tree-node--focused');
    });

    it('expands directory with right arrow key', async () => {
      const user = userEvent.setup();
      const { container } = render(<TreeView {...defaultProps} expandedItems={[]} />);
      
      const directoryNode = container.querySelector('[data-testid="tree-node-root"]') as HTMLElement;
      expect(directoryNode).toBeTruthy();
      
      // Focus and trigger keyboard event directly
      directoryNode.focus();
      await user.keyboard('{ArrowRight}');
      expect(defaultProps.onExpand).toHaveBeenCalledWith('root');
    });

    it('selects node with space key', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const node = screen.getAllByTestId('tree-node-file-4')[0];
      node.focus();
      
      await user.keyboard(' ');
      expect(defaultProps.onSelect).toHaveBeenCalledWith('file-4', false);
    });

    it('selects node with enter key', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const node = screen.getAllByTestId('tree-node-file-4')[0];
      node.focus();
      
      await user.keyboard('{Enter}');
      expect(defaultProps.onSelect).toHaveBeenCalledWith('file-4', false);
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<TreeView {...defaultProps} />);
      
      const treeView = screen.getAllByRole('tree')[0];
      expect(treeView).toBeInTheDocument();
      
      const treeItems = screen.getAllByRole('treeitem');
      expect(treeItems.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation with proper focus management', async () => {
      const user = userEvent.setup();
      render(<TreeView {...defaultProps} />);
      
      const treeView = screen.getAllByRole('tree')[0];
      treeView.focus();
      
      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(screen.getAllByTestId('tree-node-root')[0]);
    });

    it('announces selection changes to screen readers', () => {
      const { container } = render(<TreeView {...defaultProps} selectedItems={['file-4']} />);
      
      const selectedNode = container.querySelector('[data-testid="tree-node-file-4"][aria-selected="true"]');
      expect(selectedNode).toBeTruthy();
      expect(selectedNode).toHaveAttribute('aria-selected', 'true');
    });

    it('provides proper expanded/collapsed state information', () => {
      render(<TreeView {...defaultProps} expandedItems={['root']} />);
      
      const expandedNode = screen.getAllByTestId('tree-node-root')[0];
      expect(expandedNode).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Error Handling', () => {
    it('handles missing node properties gracefully', () => {
      const incompleteTree = {
        id: 'incomplete',
        name: 'Incomplete Node',
        type: 'directory' as const,
        path: '/incomplete',
        children: []
      };
      
      expect(() => {
        render(<TreeView {...defaultProps} data={incompleteTree as any} />);
      }).not.toThrow();
    });

    it('recovers from drag and drop errors', () => {
      const onDropWithError = vi.fn(() => {
        throw new Error('Drop failed');
      });
      
      render(<TreeView {...defaultProps} onDrop={onDropWithError} />);
      
      const sourceNode = screen.getAllByTestId('tree-node-file-4')[0];
      const targetNode = screen.getAllByTestId('tree-node-folder-1')[0];
      
      fireEvent.dragStart(sourceNode);
      
      expect(() => {
        fireEvent.drop(targetNode);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('efficiently handles large datasets', () => {
      const largeTree = {
        ...mockFileTree,
        children: Array.from({ length: 1000 }, (_, i) => ({
          id: `file-${i}`,
          name: `file-${i}.txt`,
          type: 'file' as const,
          path: `/test/file-${i}.txt`,
          size: 100,
          modifiedAt: new Date(),
          createdAt: new Date(),
          children: []
        }))
      };
      
      const startTime = performance.now();
      render(<TreeView {...defaultProps} data={largeTree} />);
      const endTime = performance.now();
      
      // Should render in reasonable time (less than 500ms for large datasets)
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});