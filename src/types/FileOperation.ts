export type OperationType = 'move' | 'copy' | 'delete' | 'rename';

export type OperationStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

export interface FileOperation {
  id: string;
  type: OperationType;
  sourcePath: string;
  destinationPath?: string;
  status: OperationStatus;
  error?: string;
}