import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JohnnyDecimalEngine } from '../JohnnyDecimalEngine';
import {
  FileInfo,
  FileOrganizationSuggestion,
  JohnnyDecimalStructure,
  JDArea,
  JDCategory,
  JDItem,
  OrganizationSession,
  SessionStatus
} from '../../../types';

describe('JohnnyDecimalEngine', () => {
  let engine: JohnnyDecimalEngine;

  beforeEach(() => {
    engine = new JohnnyDecimalEngine();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(engine).toBeInstanceOf(JohnnyDecimalEngine);
      expect(engine.getConfiguration()).toEqual({
        maxAreas: 10,
        maxCategoriesPerArea: 10,
        maxItemsPerCategory: 100,
        autoCreateStructure: true,
        conflictResolution: 'rename'
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        maxAreas: 8,
        maxCategoriesPerArea: 8,
        maxItemsPerCategory: 50,
        autoCreateStructure: false,
        conflictResolution: 'merge' as const
      };
      const customEngine = new JohnnyDecimalEngine(customConfig);
      expect(customEngine.getConfiguration()).toEqual(customConfig);
    });
  });

  describe('createStructure', () => {
    it('should create a new Johnny Decimal structure', () => {
      const structure = engine.createStructure('Test Project', '/test/path');
      
      expect(structure).toMatchObject({
        name: 'Test Project',
        rootPath: '/test/path',
        areas: [],
        version: '1.0.0'
      });
      expect(structure.id).toBeDefined();
      expect(structure.createdAt).toBeInstanceOf(Date);
      expect(structure.modifiedAt).toBeInstanceOf(Date);
    });

    it('should create structure with description', () => {
      const structure = engine.createStructure(
        'Test Project', 
        '/test/path', 
        'A test project for organizing files'
      );
      
      expect(structure.description).toBe('A test project for organizing files');
    });
  });

  describe('addArea', () => {
    let structure: JohnnyDecimalStructure;

    beforeEach(() => {
      structure = engine.createStructure('Test', '/test');
    });

    it('should add a new area to the structure', () => {
      const area = engine.addArea(structure, 'Administration', 'Office management and paperwork');
      
      expect(area).toMatchObject({
        number: 10,
        name: 'Administration',
        description: 'Office management and paperwork',
        categories: [],
        isActive: true
      });
      expect(structure.areas).toHaveLength(1);
      expect(structure.areas[0]).toBe(area);
    });

    it('should assign sequential area numbers', () => {
      const area1 = engine.addArea(structure, 'Administration');
      const area2 = engine.addArea(structure, 'Projects');
      const area3 = engine.addArea(structure, 'Archives');
      
      expect(area1.number).toBe(10);
      expect(area2.number).toBe(20);
      expect(area3.number).toBe(30);
    });

    it('should throw error when maximum areas exceeded', () => {
      // Add maximum number of areas
      for (let i = 0; i < 10; i++) {
        engine.addArea(structure, `Area ${i + 1}`);
      }
      
      expect(() => {
        engine.addArea(structure, 'Overflow Area');
      }).toThrow('Maximum number of areas (10) exceeded');
    });

    it('should handle area with custom styling', () => {
      const area = engine.addArea(structure, 'Projects', 'Active projects', {
        color: '#FF5722',
        icon: 'folder-project'
      });
      
      expect(area.color).toBe('#FF5722');
      expect(area.icon).toBe('folder-project');
    });
  });

  describe('addCategory', () => {
    let structure: JohnnyDecimalStructure;
    let area: JDArea;

    beforeEach(() => {
      structure = engine.createStructure('Test', '/test');
      area = engine.addArea(structure, 'Administration');
    });

    it('should add a category to an area', () => {
      const category = engine.addCategory(area, 'Correspondence', 'Letters and emails');
      
      expect(category).toMatchObject({
        number: 11,
        name: 'Correspondence',
        description: 'Letters and emails',
        items: [],
        isActive: true
      });
      expect(area.categories).toHaveLength(1);
      expect(area.categories[0]).toBe(category);
    });

    it('should assign sequential category numbers within area', () => {
      const cat1 = engine.addCategory(area, 'Correspondence');
      const cat2 = engine.addCategory(area, 'Invoices');
      const cat3 = engine.addCategory(area, 'Contracts');
      
      expect(cat1.number).toBe(11);
      expect(cat2.number).toBe(12);
      expect(cat3.number).toBe(13);
    });

    it('should throw error when maximum categories exceeded', () => {
      // Add maximum number of categories
      for (let i = 0; i < 10; i++) {
        engine.addCategory(area, `Category ${i + 1}`);
      }
      
      expect(() => {
        engine.addCategory(area, 'Overflow Category');
      }).toThrow('Maximum number of categories (10) exceeded for area 10');
    });

    it('should handle category with auto-assignment rules', () => {
      const autoRules = [
        { fileExtensions: ['.pdf'], namePatterns: ['invoice*'], confidence: 0.9 }
      ];
      const category = engine.addCategory(area, 'Invoices', 'Financial invoices', {
        autoAssignRules: autoRules,
        maxItems: 50
      });
      
      expect(category.autoAssignRules).toEqual(autoRules);
      expect(category.maxItems).toBe(50);
    });
  });

  describe('addItem', () => {
    let structure: JohnnyDecimalStructure;
    let area: JDArea;
    let category: JDCategory;

    beforeEach(() => {
      structure = engine.createStructure('Test', '/test');
      area = engine.addArea(structure, 'Administration');
      category = engine.addCategory(area, 'Correspondence');
    });

    it('should add an item to a category', () => {
      const item = engine.addItem(category, 'Business Letters', ['letter1.pdf', 'letter2.pdf']);
      
      expect(item).toMatchObject({
        number: '11.01',
        name: 'Business Letters',
        files: ['letter1.pdf', 'letter2.pdf'],
        tags: [],
        isActive: true
      });
      expect(category.items).toHaveLength(1);
      expect(category.items[0]).toBe(item);
    });

    it('should assign sequential item numbers within category', () => {
      const item1 = engine.addItem(category, 'Business Letters', ['file1.pdf']);
      const item2 = engine.addItem(category, 'Personal Letters', ['file2.pdf']);
      const item3 = engine.addItem(category, 'Legal Letters', ['file3.pdf']);
      
      expect(item1.number).toBe('11.01');
      expect(item2.number).toBe('11.02');
      expect(item3.number).toBe('11.03');
    });

    it('should handle item with metadata', () => {
      const item = engine.addItem(
        category, 
        'Important Contracts', 
        ['contract1.pdf'],
        {
          description: 'High-priority legal documents',
          tags: ['legal', 'priority'],
          color: '#F44336',
          notes: 'Review annually'
        }
      );
      
      expect(item.description).toBe('High-priority legal documents');
      expect(item.tags).toEqual(['legal', 'priority']);
      expect(item.color).toBe('#F44336');
      expect(item.notes).toBe('Review annually');
    });

    it('should throw error when maximum items exceeded', () => {
      // Add maximum number of items
      for (let i = 0; i < 100; i++) {
        engine.addItem(category, `Item ${i + 1}`, [`file${i + 1}.txt`]);
      }
      
      expect(() => {
        engine.addItem(category, 'Overflow Item', ['overflow.txt']);
      }).toThrow('Maximum number of items (100) exceeded for category 11');
    });
  });

  describe('organizeFiles', () => {
    let structure: JohnnyDecimalStructure;
    let files: FileInfo[];
    let aiSuggestions: FileOrganizationSuggestion[];

    beforeEach(() => {
      structure = engine.createStructure('Test', '/test');
      
      files = [
        {
          id: 'file-1',
          name: 'invoice-2024-001.pdf',
          path: '/test/invoice-2024-001.pdf',
          size: 1024,
          type: 'file',
          extension: '.pdf',
          createdAt: new Date('2024-01-01'),
          modifiedAt: new Date('2024-01-01'),
          lastModified: new Date('2024-01-01'),
          content: 'Invoice for services rendered...'
        },
        {
          id: 'file-2',
          name: 'meeting-notes.docx',
          path: '/test/meeting-notes.docx',
          size: 2048,
          type: 'file',
          extension: '.docx',
          createdAt: new Date('2024-01-02'),
          modifiedAt: new Date('2024-01-02'),
          lastModified: new Date('2024-01-02')
        }
      ];

      aiSuggestions = [
        {
          category: '10-19 Administration',
          subcategory: '11 Meetings',
          confidence: 0.88,
          reasoning: 'Document appears to be meeting notes based on filename'
        },
        {
          category: '10-19 Administration',
          subcategory: '12 Invoices',
          confidence: 0.95,
          reasoning: 'File appears to be a financial invoice based on name and content'
        }
      ];
    });

    it('should organize files based on AI suggestions', async () => {
      const session = await engine.organizeFiles(structure, files, aiSuggestions);
      
      expect(session).toMatchObject({
        name: expect.stringContaining('Organization Session'),
        rootPath: '/test',
        structureId: structure.id,
        status: SessionStatus.COMPLETED,
        filesProcessed: 2,
        filesTotal: 2
      });
      expect(session.operations).toHaveLength(2);
      expect(structure.areas).toHaveLength(1); // Administration area created
    });

    it('should create areas and categories automatically', async () => {
      await engine.organizeFiles(structure, files, aiSuggestions);
      
      expect(structure.areas).toHaveLength(1);
      expect(structure.areas[0].number).toBe(10);
      expect(structure.areas[0].name).toBe('Administration');
      expect(structure.areas[0].categories).toHaveLength(2);
      
      const categories = structure.areas[0].categories;
      expect(categories.find(c => c.number === 11)?.name).toBe('Meetings');
      expect(categories.find(c => c.number === 12)?.name).toBe('Invoices');
    });

    it('should handle organization with existing structure', async () => {
      // Pre-create some structure
      const area = engine.addArea(structure, 'Administration');
      const category = engine.addCategory(area, 'Invoices');
      
      await engine.organizeFiles(structure, files, aiSuggestions);
      
      // Should reuse existing structures
      expect(structure.areas).toHaveLength(1);
      expect(structure.areas[0].categories).toHaveLength(2); // Invoices + Meetings
    });

    it('should handle conflicting suggestions gracefully', async () => {
      const conflictingSuggestions: FileOrganizationSuggestion[] = [
        {
          category: '10-19 Administration',
          subcategory: '11 Documents',
          confidence: 0.7,
          reasoning: 'Low confidence classification'
        }
      ];

      const session = await engine.organizeFiles(
        structure, 
        [files[0]], 
        conflictingSuggestions
      );
      
      expect(session.status).toBe(SessionStatus.COMPLETED);
      // Should still create structure even with low confidence
      expect(structure.areas).toHaveLength(1);
    });
  });

  describe('validateStructure', () => {
    let structure: JohnnyDecimalStructure;

    beforeEach(() => {
      structure = engine.createStructure('Test', '/test');
    });

    it('should validate a correct structure', async () => {
      const area = engine.addArea(structure, 'Administration');
      const category = engine.addCategory(area, 'Correspondence');
      engine.addItem(category, 'Business Letters', ['file1.pdf']);
      
      const validation = await engine.validateStructure(structure);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect invalid area numbers', async () => {
      // Manually create invalid structure for testing
      structure.areas.push({
        number: 15, // Invalid - should be multiple of 10
        name: 'Invalid Area',
        categories: [],
        isActive: true
      });
      
      const validation = await engine.validateStructure(structure);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContainEqual({
        field: 'area.number',
        message: 'Area number 15 is not a valid multiple of 10',
        code: 'INVALID_AREA_NUMBER',
        severity: 'error'
      });
    });

    it('should detect duplicate area numbers', async () => {
      engine.addArea(structure, 'Area 1');
      // Manually add duplicate for testing
      structure.areas.push({
        number: 10,
        name: 'Duplicate Area',
        categories: [],
        isActive: true
      });
      
      const validation = await engine.validateStructure(structure);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e: any) => e.code === 'DUPLICATE_AREA_NUMBER')).toBe(true);
    });

    it('should detect orphaned files', async () => {
      const area = engine.addArea(structure, 'Administration');
      const category = engine.addCategory(area, 'Correspondence');
      engine.addItem(category, 'Letters', ['missing-file.pdf', 'existing-file.pdf']);
      
      const validation = await engine.validateStructure(structure);
      
      expect(validation.warnings).toContainEqual({
        field: 'item.files',
        message: 'File missing-file.pdf referenced in item Letters does not exist',
        suggestion: 'Remove the file reference or restore the missing file',
        code: 'MISSING_FILE'
      });
    });
  });

  describe('getOrganizationSuggestions', () => {
    it('should suggest organization for unstructured files', async () => {
      const files: FileInfo[] = [
        {
          id: 'file-3',
          name: 'project-proposal.pdf',
          path: '/test/project-proposal.pdf',
          size: 1024,
          type: 'file',
          extension: '.pdf',
          createdAt: new Date(),
          modifiedAt: new Date(),
          lastModified: new Date()
        },
        {
          id: 'file-4',
          name: 'budget-2024.xlsx',
          path: '/test/budget-2024.xlsx',
          size: 2048,
          type: 'file',
          extension: '.xlsx',
          createdAt: new Date(),
          modifiedAt: new Date(),
          lastModified: new Date()
        }
      ];

      const suggestions = await engine.getOrganizationSuggestions(files);
      
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toMatchObject({
        file: files[0],
        suggestedArea: expect.objectContaining({
          number: expect.any(Number),
          name: expect.any(String)
        }),
        suggestedCategory: expect.objectContaining({
          number: expect.any(Number),
          name: expect.any(String)
        }),
        confidence: expect.any(Number)
      });
    });

    it('should group similar files together', async () => {
      const files: FileInfo[] = [
        { id: 'file-5', name: 'invoice1.pdf', path: '/test/invoice1.pdf', size: 1024, type: 'file', extension: '.pdf', createdAt: new Date(), modifiedAt: new Date(), lastModified: new Date() },
        { id: 'file-6', name: 'invoice2.pdf', path: '/test/invoice2.pdf', size: 1024, type: 'file', extension: '.pdf', createdAt: new Date(), modifiedAt: new Date(), lastModified: new Date() },
        { id: 'file-7', name: 'receipt1.pdf', path: '/test/receipt1.pdf', size: 1024, type: 'file', extension: '.pdf', createdAt: new Date(), modifiedAt: new Date(), lastModified: new Date() }
      ];

      const suggestions = await engine.getOrganizationSuggestions(files);
      
      // Should suggest similar categories for invoice files
      const invoiceSuggestions = suggestions.filter((s: any) => s.file.name.includes('invoice'));
      expect(invoiceSuggestions).toHaveLength(2);
      expect(invoiceSuggestions[0].suggestedCategory.name).toBe(invoiceSuggestions[1].suggestedCategory.name);
    });
  });

  describe('exportStructure', () => {
    it('should export structure as JSON', () => {
      const structure = engine.createStructure('Test', '/test');
      const area = engine.addArea(structure, 'Administration');
      const category = engine.addCategory(area, 'Correspondence');
      engine.addItem(category, 'Letters', ['file1.pdf']);
      
      const exported = engine.exportStructure(structure, 'json');
      const parsed = JSON.parse(exported);
      
      expect(parsed).toMatchObject({
        name: 'Test',
        rootPath: '/test',
        areas: [
          {
            number: 10,
            name: 'Administration',
            categories: [
              {
                number: 11,
                name: 'Correspondence',
                items: [
                  {
                    number: '11.01',
                    name: 'Letters',
                    files: ['file1.pdf']
                  }
                ]
              }
            ]
          }
        ]
      });
    });

    it('should export structure as markdown', () => {
      const structure = engine.createStructure('Test', '/test');
      const area = engine.addArea(structure, 'Administration');
      const category = engine.addCategory(area, 'Correspondence');
      engine.addItem(category, 'Letters', ['file1.pdf']);
      
      const exported = engine.exportStructure(structure, 'markdown');
      
      expect(exported).toContain('# Test');
      expect(exported).toContain('## 10 Administration');
      expect(exported).toContain('### 11 Correspondence');
      expect(exported).toContain('#### 11.01 Letters');
      expect(exported).toContain('- file1.pdf');
    });
  });
});