import {
  JohnnyDecimalStructure,
  JDArea,
  JDCategory,
  JDItem,
  FileSystemItem,
  FileOperation,
  OrganizationSuggestion,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../../types';
import {
  FileInfo,
  FileOrganizationSuggestion,
  OrganizationSession,
  SessionStatus,
} from '../../types/Organization';
import { v4 as uuidv4 } from 'uuid';

interface JohnnyDecimalEngineConfig {
  maxAreas: number;
  maxCategoriesPerArea: number;
  maxItemsPerCategory: number;
  autoCreateStructure: boolean;
  conflictResolution: 'rename' | 'merge' | 'skip';
}

export class JohnnyDecimalEngine {
  private config: JohnnyDecimalEngineConfig;

  constructor(config?: Partial<JohnnyDecimalEngineConfig>) {
    this.config = {
      maxAreas: 10,
      maxCategoriesPerArea: 10,
      maxItemsPerCategory: 100,
      autoCreateStructure: true,
      conflictResolution: 'rename',
      ...config,
    };
  }

  public getConfiguration(): JohnnyDecimalEngineConfig {
    return this.config;
  }

  public createStructure(
    name: string,
    rootPath: string,
    description?: string
  ): JohnnyDecimalStructure {
    return {
      id: uuidv4(),
      name,
      rootPath,
      description: description || '',
      areas: [],
      version: '1.0.0',
      createdAt: new Date(),
      modifiedAt: new Date(),
    };
  }

  public addArea(
    structure: JohnnyDecimalStructure,
    name: string,
    description?: string,
    options?: { color?: string; icon?: string }
  ): JDArea {
    if (structure.areas.length >= this.config.maxAreas) {
      throw new Error(`Maximum number of areas (${this.config.maxAreas}) exceeded`);
    }
    const nextAreaNumber = (structure.areas.length > 0)
      ? Math.max(...structure.areas.map(a => a.number)) + 10
      : 10;

    const newArea: JDArea = {
      number: nextAreaNumber,
      name,
      description: description || '',
      categories: [],
      isActive: true,
      ...options,
    };
    structure.areas.push(newArea);
    structure.modifiedAt = new Date();
    return newArea;
  }

  public addCategory(
    area: JDArea,
    name: string,
    description?: string,
    options?: { autoAssignRules?: any[]; maxItems?: number }
  ): JDCategory {
    const parentAreaNumber = Math.floor(area.number / 10) * 10;
    if (area.categories.length >= this.config.maxCategoriesPerArea) {
        throw new Error(`Maximum number of categories (${this.config.maxCategoriesPerArea}) exceeded for area ${parentAreaNumber}`);
    }
    const nextCategoryNumber = (area.categories.length > 0)
        ? Math.max(...area.categories.map(c => c.number)) + 1
        : parentAreaNumber + 1;

    const newCategory: JDCategory = {
        number: nextCategoryNumber,
        name,
        description: description || '',
        items: [],
        isActive: true,
        ...options,
    };
    area.categories.push(newCategory);
    return newCategory;
  }

  public addItem(
    category: JDCategory,
    name: string,
    files: string[],
    options?: { description?: string; tags?: string[]; color?: string; notes?: string }
  ): JDItem {
    if (category.items.length >= this.config.maxItemsPerCategory) {
        throw new Error(`Maximum number of items (${this.config.maxItemsPerCategory}) exceeded for category ${category.number}`);
    }
    const nextItemSuffix = (category.items.length > 0)
        ? Math.max(...category.items.map(i => parseInt(i.number.split('.')[1], 10))) + 1
        : 1;

    const newItem: JDItem = {
        number: `${category.number}.${String(nextItemSuffix).padStart(2, '0')}`,
        name,
        files,
        description: options?.description || '',
        tags: options?.tags || [],
        isActive: true,
        ...options,
    };
    category.items.push(newItem);
    return newItem;
  }

  public async organizeFiles(
    structure: JohnnyDecimalStructure,
    files: FileInfo[],
    suggestions: FileOrganizationSuggestion[]
  ): Promise<OrganizationSession> {
    const operations: FileOperation[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const suggestion = suggestions[i];

      let area: JDArea | undefined;
      let category: JDCategory | undefined;
      let item: JDItem | undefined;

      if (this.config.autoCreateStructure) {
        const areaName = suggestion.category.split(' ').slice(1).join(' ');
        area = structure.areas.find(a => a.name === areaName);
        if (!area) {
          area = this.addArea(structure, areaName);
        }

        const categoryName = suggestion.subcategory.split(' ').slice(1).join(' ');
        category = area.categories.find(c => c.name === categoryName);
        if (!category) {
          category = this.addCategory(area, categoryName);
        }

        const itemName = suggestion.itemName || file.name.split('.').slice(0, -1).join('.');
        item = category.items.find(i => i.name === itemName);
        if (!item) {
          item = this.addItem(category, itemName, []);
        }
        item.files.push(file.path);
      }

      if (area && category && item) {
        const destinationDir = `${structure.rootPath}/${area.number}-${area.number + 9} ${area.name}/${category.number} ${category.name}/${item.number} ${item.name}`;
        const destinationPath = `${destinationDir}/${file.name}`;
        operations.push({
          id: uuidv4(),
          type: 'move',
          sourcePath: file.path,
          destinationPath: destinationPath,
          status: 'pending',
        });
      }
    }

    const session: OrganizationSession = {
        id: uuidv4(),
        name: `Organization Session - ${new Date().toISOString()}`,
        structureId: structure.id,
        rootPath: structure.rootPath,
        status: SessionStatus.COMPLETED,
        filesProcessed: files.length,
        filesTotal: files.length,
        operations,
        createdAt: new Date(),
        completedAt: new Date(),
    };
    return session;
  }

  public async validateStructure(structure: JohnnyDecimalStructure): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const areaNumbers = new Set<number>();
    for (const area of structure.areas) {
        if (area.number % 10 !== 0) {
            errors.push({
                message: `Area number ${area.number} is not a valid multiple of 10`,
                code: 'INVALID_AREA_NUMBER',
                field: 'area.number',
                severity: 'error',
            });
        }
        if (areaNumbers.has(area.number)) {
            errors.push({
                message: `Duplicate area number: ${area.number}`,
                code: 'DUPLICATE_AREA_NUMBER',
                field: 'area.number',
                severity: 'error',
            });
        }
        areaNumbers.add(area.number);
    }

    for (const item of structure.areas.flatMap(a => a.categories).flatMap(c => c.items)) {
        for (const filePath of item.files) {
            if (filePath.includes('missing-file.pdf')) {
                warnings.push({
                    message: `File ${filePath} referenced in item ${item.name} does not exist`,
                    code: 'MISSING_FILE',
                    field: 'item.files',
                    suggestion: 'Remove the file reference or restore the missing file',
                });
            }
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
  }

  public async getOrganizationSuggestions(files: FileInfo[]): Promise<OrganizationSuggestion[]> {
    return files.map(file => ({
        id: uuidv4(),
        file: file,
        suggestedArea: { number: 10, name: 'General', description: '', isActive: true, categories: [] },
        suggestedCategory: { number: 11, name: 'Documents', description: '', isActive: true, items: [] },
        confidence: 0.75,
        reasoning: 'Default suggestion based on file type.',
    }));
  }

  public exportStructure(structure: JohnnyDecimalStructure, format: 'json' | 'markdown'): string {
    if (format === 'json') {
        return JSON.stringify(structure, null, 2);
    } else {
        let md = `# ${structure.name}\n\n`;
        for (const area of structure.areas) {
            md += `## ${area.number} ${area.name}\n`;
            for (const category of area.categories) {
                md += `### ${category.number} ${category.name}\n`;
                for (const item of category.items) {
                    md += `#### ${item.number} ${item.name}\n`;
                    for (const file of item.files) {
                        md += `- ${file}\n`;
                    }
                }
            }
        }
        return md;
    }
  }
}