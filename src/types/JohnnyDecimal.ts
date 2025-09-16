export interface JDItem {
  number: string;
  name: string;
  description?: string;
  files: string[];
  tags: string[];
  isActive: boolean;
  color?: string;
  notes?: string;
}

export interface JDCategory {
  number: number;
  name: string;
  description?: string;
  isActive: boolean;
  items: JDItem[];
  autoAssignRules?: any[];
  maxItems?: number;
}

export interface JDArea {
  number: number;
  name: string;
  description?: string;
  isActive: boolean;
  categories: JDCategory[];
  color?: string;
  icon?: string;
}

export interface JohnnyDecimalStructure {
  id: string;
  name: string;
  rootPath: string;
  createdAt: Date;
  modifiedAt: Date;
  version: string;
  description: string;
  areas: JDArea[];
}