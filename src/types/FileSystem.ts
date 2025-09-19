export interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
  isHidden: boolean;
  permissions: string;
  mimeType?: string;
  encoding?: string;
  checksum?: string;
}

export interface DirectoryInfo {
  path: string;
  name: string;
  size: number;
  fileCount: number;
  directoryCount: number;
  createdAt: Date;
  modifiedAt: Date;
  isHidden: boolean;
  permissions: string;
}

export interface ScanProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
  errors: string[];
}

export interface ScanOptions {
  maxDepth: number;
  followSymlinks: boolean;
  includeHidden: boolean;
  excludePatterns: string[];
  maxFileSize: number;
  enableChecksums: boolean;
}