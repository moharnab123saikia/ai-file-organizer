import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaService } from '../OllamaService';
import type { OllamaModel, OllamaRequest, OllamaResponse, FileInfo } from '../../../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OllamaService', () => {
  let service: OllamaService;

  beforeEach(() => {
    service = new OllamaService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(service).toBeInstanceOf(OllamaService);
      expect(service.getConfiguration()).toEqual({
        baseUrl: 'http://localhost:11434',
        timeout: 30000,
        defaultModel: 'llama2',
        temperature: 0.7,
        maxTokens: 2048,
        retryAttempts: 3,
        retryDelay: 1000
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        baseUrl: 'http://custom-host:8080',
        timeout: 60000,
        defaultModel: 'codellama'
      };
      const customService = new OllamaService(customConfig);
      expect(customService.getConfiguration()).toEqual({
        baseUrl: 'http://custom-host:8080',
        timeout: 60000,
        defaultModel: 'codellama',
        temperature: 0.7,
        maxTokens: 2048,
        retryAttempts: 3,
        retryDelay: 1000
      });
    });
  });

  describe('updateConfiguration', () => {
    it('should update configuration with partial options', () => {
      service.updateConfiguration({ defaultModel: 'codellama', timeout: 45000 });
      const config = service.getConfiguration();
      expect(config.timeout).toBe(45000);
      expect(config.defaultModel).toBe('codellama');
    });

    it('should maintain existing values when updating with partial config', () => {
      service.updateConfiguration({ baseUrl: 'http://new-host:8080' });
      const config = service.getConfiguration();
      expect(config.baseUrl).toBe('http://new-host:8080');
    });
  });

  describe('isConnected', () => {
    it('should return true when Ollama service is available', async () => {
      mockFetch.mockResolvedValue(new Response('Ollama is running', { status: 200 }));
      const result = await service.isConnected();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/version', {
        method: 'GET',
        signal: expect.any(AbortSignal)
      });
    });

    it('should return false when Ollama service is not available', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));
      const result = await service.isConnected();
      expect(result).toBe(false);
    });

    it('should return false when response is not ok', async () => {
      mockFetch.mockResolvedValue(new Response('Service Unavailable', { status: 503 }));
      const result = await service.isConnected();
      expect(result).toBe(false);
    });

    it('should handle timeout correctly', async () => {
      service.updateConfiguration({ timeout: 100 });
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));
      
      const result = await service.isConnected();
      expect(result).toBe(false);
    });
  });

  describe('getAvailableModels', () => {
    it('should fetch and return available models', async () => {
      const mockModels: OllamaModel[] = [
        {
          name: 'llama2',
          model: 'llama2',
          size: 3800000000,
          digest: 'sha256:abc123',
          details: {
            parent_model: '',
            format: 'gguf',
            family: 'llama',
            families: ['llama'],
            parameter_size: '7B',
            quantization_level: 'Q4_0'
          },
          expires_at: '2024-02-01T00:00:00Z',
          size_vram: 0
        },
        {
          name: 'codellama',
          model: 'codellama',
          size: 7300000000,
          digest: 'sha256:def456',
          details: {
            parent_model: '',
            format: 'gguf',
            family: 'llama',
            families: ['llama'],
            parameter_size: '13B',
            quantization_level: 'Q4_0'
          },
          expires_at: '2024-02-02T00:00:00Z',
          size_vram: 0
        }
      ];

      mockFetch.mockResolvedValue(new Response(JSON.stringify({ models: mockModels }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      const result = await service.getAvailableModels();
      expect(result).toEqual(mockModels);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: expect.any(AbortSignal)
      });
    });

    it('should throw error when request fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      await expect(service.getAvailableModels()).rejects.toThrow('Failed to fetch available models: Network error');
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValue(new Response('Internal Server Error', { status: 500 }));
      await expect(service.getAvailableModels()).rejects.toThrow('Failed to fetch available models: HTTP 500');
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValue(new Response('invalid json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      await expect(service.getAvailableModels()).rejects.toThrow('Failed to fetch available models:');
    });
  });

  describe('generateResponse', () => {
    it('should generate response for valid request', async () => {
      const mockResponse: OllamaResponse = {
        model: 'llama2',
        created_at: '2024-01-01T00:00:00Z',
        response: 'This is a test response',
        done: true,
        context: [1, 2, 3],
        total_duration: 5000000000,
        load_duration: 1000000000,
        prompt_eval_count: 10,
        prompt_eval_duration: 2000000000,
        eval_count: 20,
        eval_duration: 2000000000
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      const request: OllamaRequest = {
        model: 'llama2',
        prompt: 'Test prompt',
        stream: false
      };

      const result = await service.generateResponse(request);
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: expect.any(AbortSignal)
      });
    });

    it('should use configured model when none specified in request', async () => {
      service.updateConfiguration({ defaultModel: 'codellama' });

      const mockResponse: OllamaResponse = {
        model: 'codellama',
        created_at: '2024-01-01T00:00:00Z',
        response: 'Response with default model',
        done: true
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      const request = { prompt: 'Test prompt', stream: false };
      await service.generateResponse(request);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, model: 'codellama' }),
        signal: expect.any(AbortSignal)
      });
    });

    it('should handle generation errors', async () => {
      mockFetch.mockRejectedValue(new Error('Generation failed'));
      const request: OllamaRequest = {
        model: 'llama2',
        prompt: 'Test prompt',
        stream: false
      };

      await expect(service.generateResponse(request)).rejects.toThrow('Failed to generate response: Generation failed');
    });

    it('should handle non-ok responses', async () => {
      mockFetch.mockResolvedValue(new Response('Model not found', { status: 404 }));
      const request: OllamaRequest = {
        model: 'non-existent-model',
        prompt: 'Test prompt',
        stream: false
      };

      await expect(service.generateResponse(request)).rejects.toThrow('Failed to generate response: HTTP 404');
    });
  });

  describe('analyzeFileForOrganization', () => {
    it('should analyze file and return organization suggestions', async () => {
      const mockResponse: OllamaResponse = {
        model: 'llama2',
        created_at: '2024-01-01T00:00:00Z',
        response: JSON.stringify({
          category: '10-19 Administration',
          subcategory: '11 Correspondence',
          confidence: 0.85,
          reasoning: 'This appears to be a business letter based on the formal structure and content.'
        }),
        done: true
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      const fileInfo: FileInfo = {
        id: 'file-1',
        name: 'business-letter.txt',
        path: '/path/to/business-letter.txt',
        size: 1024,
        type: 'file',
        extension: '.txt',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        modifiedAt: new Date('2024-01-01T00:00:00Z'),
        lastModified: new Date('2024-01-01T00:00:00Z'),
        content: 'Dear Sir/Madam, This is a formal business letter...'
      };

      const result = await service.analyzeFileForOrganization(fileInfo);
      
      expect(result).toEqual({
        category: '10-19 Administration',
        subcategory: '11 Correspondence',
        confidence: 0.85,
        reasoning: 'This appears to be a business letter based on the formal structure and content.'
      });

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('business-letter.txt'),
        signal: expect.any(AbortSignal)
      });
    });

    it('should handle files without content', async () => {
      const mockResponse: OllamaResponse = {
        model: 'llama2',
        created_at: '2024-01-01T00:00:00Z',
        response: JSON.stringify({
          category: '90-99 Archive',
          subcategory: '90 General Archive',
          confidence: 0.3,
          reasoning: 'Cannot determine content-based categorization without file content.'
        }),
        done: true
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      const fileInfo: FileInfo = {
        id: 'file-2',
        name: 'unknown-file.dat',
        path: '/path/to/unknown-file.dat',
        size: 2048,
        type: 'file',
        extension: '.dat',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        modifiedAt: new Date('2024-01-01T00:00:00Z'),
        lastModified: new Date('2024-01-01T00:00:00Z')
      };

      const result = await service.analyzeFileForOrganization(fileInfo);
      
      expect(result.confidence).toBeLessThan(0.5);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle analysis errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Analysis failed'));
      
      const fileInfo: FileInfo = {
        id: 'file-3',
        name: 'test-file.txt',
        path: '/path/to/test-file.txt',
        size: 1024,
        type: 'file',
        extension: '.txt',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        modifiedAt: new Date('2024-01-01T00:00:00Z'),
        lastModified: new Date('2024-01-01T00:00:00Z'),
        content: 'Test content'
      };

      await expect(service.analyzeFileForOrganization(fileInfo)).rejects.toThrow('Failed to analyze file: Analysis failed');
    });

    it('should handle malformed AI response', async () => {
      const mockResponse: OllamaResponse = {
        model: 'llama2',
        created_at: '2024-01-01T00:00:00Z',
        response: 'Invalid JSON response',
        done: true
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      const fileInfo: FileInfo = {
        id: 'file-4',
        name: 'test-file.txt',
        path: '/path/to/test-file.txt',
        size: 1024,
        type: 'file',
        extension: '.txt',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        modifiedAt: new Date('2024-01-01T00:00:00Z'),
        lastModified: new Date('2024-01-01T00:00:00Z'),
        content: 'Test content'
      };

      await expect(service.analyzeFileForOrganization(fileInfo)).rejects.toThrow('Failed to analyze file:');
    });
  });
});