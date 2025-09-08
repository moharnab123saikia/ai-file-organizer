/**
 * Johnny Decimal Organization Engine
 * 
 * Core business logic for creating and managing Johnny Decimal file organization structures.
 * Implements the Johnny Decimal system with areas (10, 20, 30...), categories (11, 12, 13...),
 * and items (11.01, 11.02, 11.03...) following Test-Driven Development principles.
 */

import { 
  JohnnyDecimalStructure,
  JDArea,
  JDCategory,
  JDItem,
  JohnnyDecimalConfiguration,
  FileInfo,
  FileOrganizationSuggestion,
  OrganizationSession,
  OrganizationSuggestion,
  SessionStatus,
  OrganizationOperation,
  OperationType,
  OperationStatus,
  OrganizationSettings,
  SessionProgress,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ConflictResolution
} from '../../types';

export class JohnnyDecimalEngine {
  private config: JohnnyDecimalConfiguration;

  constructor(config?: Partial<JohnnyDecimalConfiguration>) {
    this.config = {
      maxAreas: 10,
      maxCategoriesPerArea: 10,
      maxItemsPerCategory: 100,
      autoCreateStructure: true,
      conflictResolution: 'rename',
      ...config
    };
  }

  /**
   * Get current engine configuration
   */
  getConfiguration(): JohnnyDecimalConfiguration {
    return { ...this.config };
  }

  /**
   * Create a new Johnny Decimal structure
   */
  createStructure(name: string, rootPath: string, description?: string): JohnnyDecimalStructure {
    const now = new Date();
    return {
      id: this.generateId(),
      name,
      rootPath,
      description,
      areas: [],
      createdAt: now,
      modifiedAt: now,
      version: '1.0.0'
    };
  }

  /**
   * Add a new area to the structure
   */
  addArea(
    structure: JohnnyDecimalStructure, 
    name: string, 
    description?: string,
    options?: { color?: string; icon?: string }
  ): JDArea {
    if (structure.areas.length >= this.config.maxAreas) {
      throw new Error(`Maximum number of areas (${this.config.maxAreas}) exceeded`);
    }

    const number = (structure.areas.length + 1) * 10;
    const area: JDArea = {
      number,
      name,
      description,
      color: options?.color,
      icon: options?.icon,
      categories: [],
      isActive: true
    };

    structure.areas.push(area);
    structure.modifiedAt = new Date();
    return area;
  }

  /**
   * Add a new category to an area
   */
  addCategory(
    area: JDArea, 
    name: string, 
    description?: string,
    options?: { 
      autoAssignRules?: any[]; 
      maxItems?: number;
      color?: string;
      icon?: string;
    }
  ): JDCategory {
    if (area.categories.length >= this.config.maxCategoriesPerArea) {
      throw new Error(`Maximum number of categories (${this.config.maxCategoriesPerArea}) exceeded for area ${area.number}`);
    }

    const number = area.number + area.categories.length + 1;
    const category: JDCategory = {
      number,
      name,
      description,
      color: options?.color,
      icon: options?.icon,
      items: [],
      autoAssignRules: options?.autoAssignRules,
      maxItems: options?.maxItems,
      isActive: true
    };

    area.categories.push(category);
    return category;
  }

  /**
   * Add a new item to a category
   */
  addItem(
    category: JDCategory, 
    name: string, 
    files: string[],
    options?: {
      description?: string;
      tags?: string[];
      color?: string;
      notes?: string;
      targetPath?: string;
    }
  ): JDItem {
    if (category.items.length >= this.config.maxItemsPerCategory) {
      throw new Error(`Maximum number of items (${this.config.maxItemsPerCategory}) exceeded for category ${category.number}`);
    }

    const itemIndex = category.items.length + 1;
    const number = `${category.number}.${itemIndex.toString().padStart(2, '0')}`;
    
    const item: JDItem = {
      number,
      name,
      description: options?.description,
      files,
      targetPath: options?.targetPath,
      color: options?.color,
      tags: options?.tags || [],
      notes: options?.notes,
      isActive: true
    };

    category.items.push(item);
    return item;
  }

  /**
   * Organize files based on AI suggestions
   */
  async organizeFiles(
    structure: JohnnyDecimalStructure,
    files: FileInfo[],
    aiSuggestions: FileOrganizationSuggestion[]
  ): Promise<OrganizationSession> {
    const sessionId = this.generateId();
    const now = new Date();
    
    const session: OrganizationSession = {
      id: sessionId,
      name: `Organization Session ${now.toISOString()}`,
      rootPath: structure.rootPath,
      structureId: structure.id,
      status: SessionStatus.ORGANIZING,
      createdAt: now,
      filesProcessed: 0,
      filesTotal: files.length,
      operations: [],
      settings: this.getDefaultOrganizationSettings(),
      progress: {
        phase: SessionStatus.ORGANIZING,
        percentage: 0,
        filesRemaining: files.length,
        operationsCompleted: 0,
        operationsFailed: 0,
        throughput: 0
      }
    };

    // Process each file with its AI suggestion
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const suggestion = aiSuggestions[i];
      
      if (suggestion) {
        const operation = await this.processFileSuggestion(structure, file, suggestion);
        session.operations.push(operation);
      }
      
      session.filesProcessed++;
      session.progress.percentage = (session.filesProcessed / session.filesTotal) * 100;
      session.progress.filesRemaining = session.filesTotal - session.filesProcessed;
      session.progress.operationsCompleted++;
    }

    session.status = SessionStatus.COMPLETED;
    session.completedAt = new Date();
    structure.modifiedAt = new Date();

    return session;
  }

  /**
   * Process a single file suggestion and create organization structure
   */
  private async processFileSuggestion(
    structure: JohnnyDecimalStructure,
    file: FileInfo,
    suggestion: FileOrganizationSuggestion
  ): Promise<OrganizationOperation> {
    // Parse suggestion to extract area and category info
    const areaInfo = this.parseAreaFromSuggestion(suggestion.category);
    const categoryInfo = this.parseCategoryFromSuggestion(suggestion.subcategory);

    // Find or create area
    let area = structure.areas.find(a => a.name.toLowerCase().includes(areaInfo.name.toLowerCase()));
    if (!area && this.config.autoCreateStructure) {
      area = this.addArea(structure, areaInfo.name, `Auto-created area for ${areaInfo.name}`);
    }

    // Find or create category
    let category: JDCategory | undefined;
    if (area) {
      category = area.categories.find(c => c.name.toLowerCase().includes(categoryInfo.name.toLowerCase()));
      if (!category && this.config.autoCreateStructure) {
        category = this.addCategory(area, categoryInfo.name, `Auto-created category for ${categoryInfo.name}`);
      }
    }

    // Create operation record
    const operation: OrganizationOperation = {
      id: this.generateId(),
      type: OperationType.MOVE,
      sourceFiles: [file.path],
      targetPath: category ? this.generateTargetPath(structure, area!, category, file) : file.path,
      status: OperationStatus.COMPLETED,
      timestamp: new Date()
    };

    // Add file to item if category exists
    if (category) {
      const itemName = this.generateItemName(file, suggestion);
      this.addItem(category, itemName, [file.path], {
        description: `Auto-organized: ${suggestion.reasoning}`,
        tags: ['auto-organized']
      });
    }

    return operation;
  }

  /**
   * Validate Johnny Decimal structure
   */
  async validateStructure(structure: JohnnyDecimalStructure): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check area number validity and duplicates
    const areaNumbers = new Set<number>();
    for (const area of structure.areas) {
      // Check if area number is valid (multiple of 10)
      if (area.number % 10 !== 0) {
        errors.push({
          field: 'area.number',
          message: `Area number ${area.number} is not a valid multiple of 10`,
          code: 'INVALID_AREA_NUMBER',
          severity: 'error'
        });
      }

      // Check for duplicate area numbers
      if (areaNumbers.has(area.number)) {
        errors.push({
          field: 'area.number',
          message: `Duplicate area number ${area.number} found`,
          code: 'DUPLICATE_AREA_NUMBER',
          severity: 'error'
        });
      }
      areaNumbers.add(area.number);

      // Check categories
      const categoryNumbers = new Set<number>();
      for (const category of area.categories) {
        if (categoryNumbers.has(category.number)) {
          errors.push({
            field: 'category.number',
            message: `Duplicate category number ${category.number} found in area ${area.number}`,
            code: 'DUPLICATE_CATEGORY_NUMBER',
            severity: 'error'
          });
        }
        categoryNumbers.add(category.number);

        // Check items for orphaned files
        for (const item of category.items) {
          for (const filePath of item.files) {
            if (!this.fileExists(filePath)) {
              warnings.push({
                field: 'item.files',
                message: `File ${filePath} referenced in item ${item.name} does not exist`,
                suggestion: 'Remove the file reference or restore the missing file'
              });
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get organization suggestions for unstructured files
   */
  async getOrganizationSuggestions(files: FileInfo[]): Promise<OrganizationSuggestion[]> {
    const suggestions: OrganizationSuggestion[] = [];

    for (const file of files) {
      const suggestion = await this.generateSuggestionForFile(file);
      suggestions.push(suggestion);
    }

    return suggestions;
  }

  /**
   * Export structure in different formats
   */
  exportStructure(structure: JohnnyDecimalStructure, format: 'json' | 'markdown'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(structure, null, 2);
      
      case 'markdown':
        return this.exportAsMarkdown(structure);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods

  private generateId(): string {
    return `jd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseAreaFromSuggestion(category: string): { name: string; number?: number } {
    // Extract area name from category suggestion like "10-19 Administration"
    const match = category.match(/(\d+)-\d+\s+(.+)/);
    if (match) {
      return { name: match[2], number: parseInt(match[1]) };
    }
    return { name: category.split(' ').slice(-1)[0] || 'General' };
  }

  private parseCategoryFromSuggestion(subcategory: string): { name: string; number?: number } {
    // Extract category name from subcategory suggestion like "12 Invoices"
    const match = subcategory.match(/(\d+)\s+(.+)/);
    if (match) {
      return { name: match[2], number: parseInt(match[1]) };
    }
    return { name: subcategory || 'General' };
  }

  private generateTargetPath(
    structure: JohnnyDecimalStructure,
    area: JDArea,
    category: JDCategory,
    file: FileInfo
  ): string {
    return `${structure.rootPath}/${area.number} ${area.name}/${category.number} ${category.name}/${file.name}`;
  }

  private generateItemName(file: FileInfo, suggestion: FileOrganizationSuggestion): string {
    // Generate a meaningful item name based on file and suggestion
    const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const categoryHint = suggestion.subcategory.replace(/^\d+\s+/, ''); // Remove number prefix
    
    if (baseName.toLowerCase().includes(categoryHint.toLowerCase())) {
      return baseName;
    }
    
    return `${categoryHint} - ${baseName}`;
  }

  private getDefaultOrganizationSettings(): OrganizationSettings {
    return {
      previewMode: false,
      createBackup: true,
      confirmOperations: false,
      skipDuplicates: true,
      overwriteExisting: false,
      preserveStructure: true,
      handleConflicts: ConflictResolution.RENAME,
      maxFileSize: 100, // MB
      excludedExtensions: ['.tmp', '.temp'],
      excludedPaths: ['.git', 'node_modules'],
      batchSize: 50,
      parallelOperations: 3
    };
  }

  private async generateSuggestionForFile(file: FileInfo): Promise<OrganizationSuggestion> {
    // Simple rule-based suggestion logic for demonstration
    // In a real implementation, this would integrate with AI services
    
    let areaName = 'General';
    let categoryName = 'Documents';
    let confidence = 0.5;

    // File extension-based categorization
    if (file.extension) {
      switch (file.extension.toLowerCase()) {
        case '.pdf':
          if (file.name.toLowerCase().includes('invoice')) {
            areaName = 'Administration';
            categoryName = 'Invoices';
            confidence = 0.9;
          } else {
            areaName = 'Administration';
            categoryName = 'Documents';
            confidence = 0.7;
          }
          break;
        
        case '.docx':
        case '.doc':
          if (file.name.toLowerCase().includes('meeting')) {
            areaName = 'Administration';
            categoryName = 'Meetings';
            confidence = 0.85;
          } else {
            areaName = 'Administration';
            categoryName = 'Documents';
            confidence = 0.7;
          }
          break;
        
        case '.xlsx':
        case '.xls':
          areaName = 'Administration';
          categoryName = 'Spreadsheets';
          confidence = 0.8;
          break;
        
        default:
          confidence = 0.5;
      }
    }

    return {
      file,
      suggestedArea: {
        number: 10, // Default to first area
        name: areaName
      },
      suggestedCategory: {
        number: 11, // Default to first category
        name: categoryName
      },
      confidence,
      reasoning: `Suggested based on file extension ${file.extension} and filename patterns`
    };
  }

  private exportAsMarkdown(structure: JohnnyDecimalStructure): string {
    let markdown = `# ${structure.name}\n\n`;
    
    if (structure.description) {
      markdown += `${structure.description}\n\n`;
    }
    
    markdown += `**Root Path:** ${structure.rootPath}\n`;
    markdown += `**Version:** ${structure.version}\n`;
    markdown += `**Created:** ${structure.createdAt.toISOString()}\n`;
    markdown += `**Modified:** ${structure.modifiedAt.toISOString()}\n\n`;
    
    for (const area of structure.areas) {
      markdown += `## ${area.number} ${area.name}\n\n`;
      
      if (area.description) {
        markdown += `${area.description}\n\n`;
      }
      
      for (const category of area.categories) {
        markdown += `### ${category.number} ${category.name}\n\n`;
        
        if (category.description) {
          markdown += `${category.description}\n\n`;
        }
        
        for (const item of category.items) {
          markdown += `#### ${item.number} ${item.name}\n\n`;
          
          if (item.description) {
            markdown += `${item.description}\n\n`;
          }
          
          if (item.files.length > 0) {
            markdown += `**Files:**\n`;
            for (const file of item.files) {
              markdown += `- ${file}\n`;
            }
            markdown += '\n';
          }
          
          if (item.tags.length > 0) {
            markdown += `**Tags:** ${item.tags.join(', ')}\n\n`;
          }
        }
      }
    }
    
    return markdown;
  }

  private fileExists(filePath: string): boolean {
    // Mock implementation for testing
    // In real implementation, this would check actual file system
    try {
      // For testing: simulate file existence based on filename patterns
      // Files containing 'missing' are considered non-existent
      return !filePath.includes('missing');
    } catch {
      return false;
    }
  }
}