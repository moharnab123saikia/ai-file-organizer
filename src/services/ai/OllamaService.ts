import type {
  OllamaModel,
  OllamaRequest,
  OllamaResponse,
  OllamaConfiguration,
  FileInfo,
  FileOrganizationSuggestion
} from '../../types';

const DEFAULT_CONFIG: OllamaConfiguration = {
  host: 'http://localhost:11434',
  model: 'llama2',
  timeout: 30000
};

export class OllamaService {
  private config: OllamaConfiguration;

  constructor(config?: Partial<OllamaConfiguration>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if Ollama server is running and accessible
   */
  async isConnected(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const response = await fetch(`${this.config.host}/api/version`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get list of available models from Ollama
   */
  async getAvailableModels(): Promise<OllamaModel[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.host}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      throw new Error(`Failed to fetch available models: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a response from Ollama using the specified request
   */
  async generateResponse(request: OllamaRequest): Promise<OllamaResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      // Use configured model if none specified in request
      const requestWithModel = {
        ...request,
        model: request.model || this.config.model
      };

      const response = await fetch(`${this.config.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestWithModel),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Analyze a file and suggest organization category
   */
  async analyzeFileForOrganization(file: FileInfo): Promise<FileOrganizationSuggestion> {
    const prompt = this.createFileAnalysisPrompt(file);
    
    const request: OllamaRequest = {
      prompt,
      stream: false
    };

    try {
      const response = await this.generateResponse(request);
      // Parse the AI response to extract organization suggestion
      const suggestion = JSON.parse(response.response);
      return suggestion;
    } catch (error) {
      // Extract the root error message without double-wrapping
      let errorMessage = error instanceof Error ? error.message : String(error);
      // Remove "Failed to generate response: " prefix if present
      if (errorMessage.startsWith('Failed to generate response: ')) {
        errorMessage = errorMessage.replace('Failed to generate response: ', '');
      }
      throw new Error(`Failed to analyze file: ${errorMessage}`);
    }
  }

  /**
   * Suggest Johnny Decimal structure for a collection of files
   */
  async suggestJohnnyDecimalStructure(files: FileInfo[]): Promise<OllamaResponse> {
    const prompt = this.createJohnnyDecimalPrompt(files);
    
    const request: OllamaRequest = {
      prompt,
      stream: false
    };

    try {
      return await this.generateResponse(request);
    } catch (error) {
      throw new Error(`Failed to suggest Johnny Decimal structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): OllamaConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration settings
   */
  updateConfiguration(updates: Partial<OllamaConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Create a prompt for analyzing a single file
   */
  private createFileAnalysisPrompt(file: FileInfo): string {
    return `
Analyze this file and suggest how it should be organized using Johnny Decimal system:

File Details:
- Name: ${file.name}
- Path: ${file.path}
- Type: ${file.type}
- Size: ${file.size} bytes
- Extension: ${file.extension || 'none'}
- Modified: ${file.lastModified}
${file.content ? `- Content Preview: ${file.content.substring(0, 500)}...` : ''}

Please respond with ONLY a valid JSON object containing:
{
  "category": "Area description (e.g., '10-19 Administration')",
  "subcategory": "Category description (e.g., '11 Correspondence')",
  "confidence": 0.85,
  "reasoning": "Explanation of why this categorization was chosen"
}

Do not include any other text, markdown, or formatting - only the JSON object.
    `.trim();
  }

  /**
   * Create a prompt for suggesting Johnny Decimal structure
   */
  private createJohnnyDecimalPrompt(files: FileInfo[]): string {
    if (files.length === 0) {
      return 'No files provided for organization.';
    }

    const fileList = files.map(file =>
      `- ${file.name} (${file.type}, ${file.extension || 'no ext'}, ${file.size} bytes)`
    ).join('\n');

    return `
Please suggest a Johnny Decimal organizational structure for these files.

Johnny Decimal System Rules:
- 10 Areas (10-19, 20-29, 30-39, etc.)
- Each area has up to 10 Categories (11, 12, 13, etc.)
- Each category has items (11.01, 11.02, 11.03, etc.)

Files to organize:
${fileList}

Please provide a structured organization following Johnny Decimal principles:
- Group similar files into logical categories
- Assign appropriate area numbers (10-99)
- Create specific categories within each area
- Assign item numbers to individual files

Format your response as a clear hierarchy showing the complete Johnny Decimal structure.
    `.trim();
  }
}