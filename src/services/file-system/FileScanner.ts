import { invoke } from '@tauri-apps/api/core';
import { FileSystemItem, FileMetadata } from '../../types';

export interface FileSystemTree {
  root: FileSystemItem;
  nodes: Map<string, FileSystemItem>;
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  lastScanned: Date;
  scanDuration: number;
}

export interface ScanProgress {
  progress: number;
  currentPath?: string;
  filesProcessed?: number;
  totalFiles?: number;
}

export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted';
  path: string;
  item?: FileSystemItem;
}

export class FileScanner {
  private progressCallback?: (progress: ScanProgress) => void;
  private changeCallback?: (event: FileChangeEvent) => void;
  private watchedPaths: Set<string> = new Set();

  /**
   * Set a callback to receive progress updates during scanning
   */
  onProgress(callback: (progress: ScanProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Scan a directory and return a complete file system tree
   */
  async scanDirectory(path: string): Promise<FileSystemTree> {
    try {
      const startTime = Date.now();
      
      // Call the Tauri backend to scan the directory
      const rawData = await invoke<{
        files: any[];
        directories: any[];
      }>('scan_directory', { path });
      
      // Transform raw data into FileSystemTree
      const tree = this.transformToFileSystemTree(rawData, path);
      
      // Calculate scan duration
      tree.scanDuration = Date.now() - startTime;
      tree.lastScanned = new Date();
      
      return tree;
    } catch (error) {
      throw new Error(`Failed to scan directory: ${error}`);
    }
  }

  /**
   * Get detailed metadata for a specific file
   */
  async getFileMetadata(path: string): Promise<FileMetadata> {
    try {
      return await invoke<FileMetadata>('get_file_metadata', { path });
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }

  /**
   * Start watching a directory for changes
   */
  async watchDirectory(
    path: string, 
    changeCallback: (event: FileChangeEvent) => void
  ): Promise<void> {
    try {
      this.changeCallback = changeCallback;
      this.watchedPaths.add(path);
      
      // Call the Tauri backend to start watching
      await invoke('watch_directory', { path });
      
      // Note: In a real implementation, we would also set up event listeners
      // to receive file change notifications from the backend
    } catch (error) {
      this.watchedPaths.delete(path);
      throw new Error(`Failed to start watching directory: ${error}`);
    }
  }

  /**
   * Stop watching a directory for changes
   */
  async stopWatching(path: string): Promise<void> {
    try {
      await invoke('stop_watching', { path });
      this.watchedPaths.delete(path);
    } catch (error) {
      throw new Error(`Failed to stop watching directory: ${error}`);
    }
  }

  /**
   * Stop watching all directories
   */
  async stopAllWatching(): Promise<void> {
    const paths = Array.from(this.watchedPaths);
    await Promise.all(paths.map(path => this.stopWatching(path)));
  }

  /**
   * Get the list of currently watched paths
   */
  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths);
  }

  /**
   * Transform raw scan data into a structured FileSystemTree
   */
  private transformToFileSystemTree(rawData: any, rootPath: string): FileSystemTree {
    const nodes = new Map<string, FileSystemItem>();
    const files = rawData.files || [];
    const directories = rawData.directories || [];
    
    // Process files
    files.forEach((file: any) => {
      const fileItem: FileSystemItem = {
        id: file.id || `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        path: file.path,
        type: 'file',
        size: file.size,
        extension: file.extension,
        mimeType: file.mimeType,
        modifiedAt: new Date(file.modifiedAt),
        createdAt: new Date(file.createdAt),
        isHidden: file.isHidden || false,
        permissions: file.permissions || {
          readable: true,
          writable: true,
          executable: false
        },
        metadata: file.metadata || {
          tags: []
        }
      };
      nodes.set(fileItem.id, fileItem);
    });

    // Process directories
    directories.forEach((dir: any) => {
      const dirItem: FileSystemItem = {
        id: dir.id || `dir-${Date.now()}-${Math.random()}`,
        name: dir.name,
        path: dir.path,
        type: 'directory',
        size: dir.size || 4096,
        modifiedAt: new Date(dir.modifiedAt),
        createdAt: new Date(dir.createdAt),
        isHidden: dir.isHidden || false,
        permissions: dir.permissions || {
          readable: true,
          writable: true,
          executable: true
        },
        children: [],
        metadata: {
          tags: []
        }
      };
      nodes.set(dirItem.id, dirItem);
    });

    // Create root directory item
    const rootName = rootPath.split('/').pop() || 'root';
    const root: FileSystemItem = {
      id: 'root',
      name: rootName,
      path: rootPath,
      type: 'directory',
      size: 4096,
      modifiedAt: new Date(),
      createdAt: new Date(),
      isHidden: false,
      permissions: {
        readable: true,
        writable: true,
        executable: true
      },
      children: [],
      metadata: {
        tags: []
      }
    };

    // Calculate totals
    const totalFiles = files.length;
    const totalDirectories = directories.length;
    const totalSize = files.reduce((sum: number, file: any) => sum + (file.size || 0), 0) +
                     directories.reduce((sum: number, dir: any) => sum + (dir.size || 4096), 0);

    return {
      root,
      nodes,
      totalFiles,
      totalDirectories,
      totalSize,
      lastScanned: new Date(),
      scanDuration: 0 // Will be set by the calling function
    };
  }

  /**
   * Emit progress update if callback is set
   */
  private emitProgress(progress: ScanProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  /**
   * Emit file change event if callback is set
   */
  private emitChange(event: FileChangeEvent): void {
    if (this.changeCallback) {
      this.changeCallback(event);
    }
  }
}