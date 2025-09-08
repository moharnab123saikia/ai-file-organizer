import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileScanner } from '../FileScanner';
import { FileSystemItem } from '../../../types';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

describe('FileScanner', () => {
  let fileScanner: FileScanner;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the mocked module to get access to the mocked function
    const { invoke } = await import('@tauri-apps/api/core');
    const mockInvoke = vi.mocked(invoke);
    mockInvoke.mockClear();
    
    fileScanner = new FileScanner();
  });

  describe('scanDirectory', () => {
    it('should scan a directory and return a FileSystemTree', async () => {
      // Arrange
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      
      const testPath = '/test/directory';
      const mockRawData = {
        files: [
          {
            id: 'file-1',
            name: 'test.txt',
            path: '/test/directory/test.txt',
            size: 100,
            extension: 'txt',
            mimeType: 'text/plain',
            modifiedAt: '2025-01-01T12:00:00Z',
            createdAt: '2025-01-01T10:00:00Z'
          },
          {
            id: 'file-2',
            name: 'image.jpg',
            path: '/test/directory/image.jpg',
            size: 500,
            extension: 'jpg',
            mimeType: 'image/jpeg',
            modifiedAt: '2025-01-01T12:00:00Z',
            createdAt: '2025-01-01T10:00:00Z'
          }
        ],
        directories: [
          {
            id: 'dir-1',
            name: 'subfolder',
            path: '/test/directory/subfolder',
            size: 4096,
            modifiedAt: '2025-01-01T12:00:00Z',
            createdAt: '2025-01-01T10:00:00Z'
          }
        ]
      };

      mockInvoke.mockResolvedValue(mockRawData);

      // Act
      const result = await fileScanner.scanDirectory(testPath);

      // Assert
      expect(result).toMatchObject({
        root: expect.objectContaining({
          name: 'directory',
          path: testPath,
          type: 'directory'
        }),
        totalFiles: expect.any(Number),
        totalDirectories: expect.any(Number)
      });
      
      expect(mockInvoke).toHaveBeenCalledWith('scan_directory', {
        path: testPath
      });
    });

    it('should handle permission denied errors gracefully', async () => {
      // Arrange
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      
      const testPath = '/restricted/directory';
      mockInvoke.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(fileScanner.scanDirectory(testPath))
        .rejects
        .toThrow('Permission denied');
    });

    it('should emit progress events during scanning', async () => {
      // Arrange
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      
      const testPath = '/large/directory';
      const progressCallback = vi.fn();
      fileScanner.onProgress(progressCallback);

      mockInvoke.mockImplementation(() =>
        new Promise(resolve => {
          // Simulate progress events
          setTimeout(() => progressCallback({ progress: 50 }), 10);
          setTimeout(() => progressCallback({ progress: 100 }), 20);
          setTimeout(() => resolve({ files: [], directories: [] }), 30);
        })
      );

      // Act
      await fileScanner.scanDirectory(testPath);

      // Assert
      expect(progressCallback).toHaveBeenCalledWith({ progress: 50 });
      expect(progressCallback).toHaveBeenCalledWith({ progress: 100 });
    });
  });

  describe('getFileMetadata', () => {
    it('should extract metadata from file', async () => {
      // Arrange
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      
      const filePath = '/test/document.pdf';
      const expectedMetadata = {
        hash: 'abc123',
        encoding: 'binary',
        tags: ['document', 'pdf'],
        customProperties: {
          title: 'Test Document',
          author: 'John Doe',
          pageCount: 10
        }
      };

      mockInvoke.mockResolvedValue(expectedMetadata);

      // Act
      const result = await fileScanner.getFileMetadata(filePath);

      // Assert
      expect(result).toEqual(expectedMetadata);
      expect(mockInvoke).toHaveBeenCalledWith('get_file_metadata', {
        path: filePath
      });
    });

    it('should handle metadata extraction errors', async () => {
      // Arrange
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      
      const filePath = '/test/corrupted.pdf';
      mockInvoke.mockRejectedValue(new Error('File corrupted'));

      // Act & Assert
      await expect(fileScanner.getFileMetadata(filePath))
        .rejects
        .toThrow('File corrupted');
    });
  });

  describe('watchDirectory', () => {
    it('should start watching a directory for changes', async () => {
      // Arrange
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(undefined);
      
      const testPath = '/test/directory';
      const changeCallback = vi.fn();

      // Act
      await fileScanner.watchDirectory(testPath, changeCallback);

      // Assert
      expect(mockInvoke).toHaveBeenCalledWith('watch_directory', {
        path: testPath
      });
    });

    it('should handle watch setup errors', async () => {
      // Arrange
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockClear();
      
      const testPath = '/invalid/directory';
      const changeCallback = vi.fn();
      mockInvoke.mockRejectedValue(new Error('Directory does not exist'));

      // Act & Assert
      await expect(fileScanner.watchDirectory(testPath, changeCallback))
        .rejects
        .toThrow('Directory does not exist');
    });
  });

  describe('stopWatching', () => {
    it('should stop watching a directory', async () => {
      // Arrange
      const { invoke } = await import('@tauri-apps/api/core');
      const mockInvoke = vi.mocked(invoke);
      mockInvoke.mockClear();
      mockInvoke.mockResolvedValue(undefined);
      
      const testPath = '/test/directory';

      // Act
      await fileScanner.stopWatching(testPath);

      // Assert
      expect(mockInvoke).toHaveBeenCalledWith('stop_watching', {
        path: testPath
      });
    });
  });
});