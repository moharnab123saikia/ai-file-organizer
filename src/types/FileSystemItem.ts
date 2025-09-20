export interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  lastModified?: Date; // Alias for modifiedAt for backward compatibility
  children?: FileSystemItem[];
  extension?: string;
  isHidden?: boolean;
  mimeType?: string;
  permissions?: {
    readable: boolean;
    writable: boolean;
    executable: boolean;
  };
  metadata?: {
    hash?: string;
    encoding?: string;
    lineCount?: number;
    wordCount?: number;
    characterCount?: number;
    isSymlink?: boolean;
    tags?: string[];
    notes?: string;
    customProperties?: Record<string, any>;
  };
}