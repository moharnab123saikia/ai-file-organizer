import { FileSystemItem } from './FileSystemItem';
import { FileOperation } from './FileOperation';
import { JDArea, JDCategory } from './JohnnyDecimal';

export interface FileInfo extends FileSystemItem {
  content?: string;
  extension?: string;
}

export interface FileOrganizationSuggestion {
  category: string;
  subcategory: string;
  itemName?: string;
  confidence: number;
  reasoning: string;
}

export interface OrganizationSession {
  id: string;
  name: string;
  structureId: string;
  rootPath: string;
  status: SessionStatus;
  filesProcessed: number;
  filesTotal: number;
  operations: FileOperation[];
  createdAt: Date;
  completedAt?: Date;
}

export enum SessionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}