import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
  emit: vi.fn(),
  once: vi.fn()
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
  message: vi.fn(),
  ask: vi.fn(),
  confirm: vi.fn()
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  rename: vi.fn(),
  copyFile: vi.fn(),
  metadata: vi.fn()
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
  Command: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
    spawn: vi.fn(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() }
  }))
}));

// Global test utilities
declare global {
  function createMockFile(name: string, mimeType: string): import('../types').FileSystemItem;
  function createMockDirectory(name: string, childCount?: number): import('../types').FileSystemItem;
  function createMockJohnnyDecimalStructure(): import('../types').JohnnyDecimalStructure;
}

global.createMockFile = (name: string, mimeType: string) => ({
  id: `mock-file-${Date.now()}-${Math.random()}`,
  name,
  path: `/mock/${name}`,
  type: 'file' as const,
  size: 1024,
  extension: name.split('.').pop() || '',
  mimeType,
  modifiedAt: new Date('2025-01-01T12:00:00Z'),
  createdAt: new Date('2025-01-01T10:00:00Z'),
  isHidden: false,
  permissions: {
    readable: true,
    writable: true,
    executable: false
  },
  metadata: {
    hash: 'mock-checksum-' + name.replace(/[^a-zA-Z0-9]/g, ''),
    encoding: 'utf-8',
    lineCount: mimeType.includes('text') ? 100 : undefined,
    wordCount: mimeType.includes('document') ? 1000 : undefined,
    characterCount: mimeType.includes('text') ? 5000 : undefined,
    isSymlink: false,
    tags: ['test', 'mock'],
    notes: `Mock ${mimeType} file`,
    customProperties: {
      title: name.split('.')[0],
      author: 'Test Author',
      description: `Mock ${mimeType} file`,
      pageCount: mimeType.includes('pdf') ? 10 : undefined
    }
  }
});

global.createMockDirectory = (name: string, childCount: number = 0) => ({
  id: `mock-dir-${Date.now()}-${Math.random()}`,
  name,
  path: `/mock/${name}`,
  type: 'directory' as const,
  size: 4096,
  modifiedAt: new Date('2025-01-01T12:00:00Z'),
  createdAt: new Date('2025-01-01T10:00:00Z'),
  isHidden: false,
  permissions: {
    readable: true,
    writable: true,
    executable: true
  },
  children: [],
  metadata: {
    tags: ['test', 'mock', 'directory'],
    customProperties: {
      childCount,
      totalSize: 4096 + (childCount * 1024),
      isEmpty: childCount === 0
    }
  }
});

global.createMockJohnnyDecimalStructure = () => ({
  id: 'mock-structure-' + Date.now(),
  name: 'Mock Johnny Decimal Structure',
  rootPath: '/mock/organized',
  createdAt: new Date('2025-01-01T10:00:00Z'),
  modifiedAt: new Date('2025-01-01T12:00:00Z'),
  version: '1.0.0',
  areas: [
    {
      number: 10,
      name: 'Administration',
      description: 'Administrative and business documents',
      color: '#3B82F6',
      icon: 'folder-open',
      isActive: true,
      categories: [
        {
          number: 11,
          name: 'Correspondence',
          description: 'Letters, emails, and communication',
          isActive: true,
          items: [
            {
              number: '11.01',
              name: 'Business Letters',
              description: 'Formal business correspondence',
              files: [],
              tags: [],
              isActive: true
            }
          ]
        }
      ]
    },
    {
      number: 20,
      name: 'Documents',
      description: 'Important documents and reports',
      color: '#10B981',
      icon: 'file-text',
      isActive: true,
      categories: [
        {
          number: 21,
          name: 'Reports',
          description: 'Business and project reports',
          isActive: true,
          items: [
            {
              number: '21.01',
              name: 'Annual Reports',
              description: 'Yearly business reports',
              files: [],
              tags: [],
              isActive: true
            }
          ]
        }
      ]
    }
  ]
});

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver for virtualization tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver for responsive components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Setup console overrides for test environment
const originalError = console.error;
// Note: Remove the beforeAll/afterAll hooks as they're causing TypeScript issues
// They're not essential for the basic test setup