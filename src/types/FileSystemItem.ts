export interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  children?: FileSystemItem[];
}