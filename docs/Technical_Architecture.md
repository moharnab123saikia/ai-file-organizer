# AI File Organizer - Technical Architecture

## 🏗️ System Architecture Overview

### Core Technology Stack
- **Frontend**: React 18+ with TypeScript 5+
- **Desktop Framework**: Tauri 2.0 (Rust backend)
- **AI/ML**: Bundled Ollama + Local lightweight models
- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS with custom design system
- **File Operations**: Native Tauri APIs with Rust backend
- **Database**: SQLite (via Tauri) for metadata and settings

## 🤖 Bundled Ollama + Local Model Strategy

### Ollama Integration Architecture
```typescript
interface LocalAIConfig {
  ollamaVersion: string;
  ollamaBinaryPath: string;
  defaultModel: string;
  modelLibrary: LocalModel[];
  servicePort: number;
  maxMemoryMB: number;
}

interface LocalModel {
  name: string;
  displayName: string;
  size: string;
  memoryRequirement: number; // MB
  contextLength: number;
  downloadUrl: string;
  modelfile?: string; // Custom configuration
}

// Optimized models for 16GB RAM laptops
const LOCAL_MODELS: LocalModel[] = [
  {
    name: "llama3.2:1b",
    displayName: "Llama 3.2 1B (Fastest)",
    size: "0.7GB",
    memoryRequirement: 1536, // 1.5GB
    contextLength: 4096,
    downloadUrl: "registry.ollama.ai/library/llama3.2:1b",
    modelfile: `FROM llama3.2:1b
PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER stop "</s>"
SYSTEM "You are a helpful file organization assistant. Analyze files and suggest categories concisely."`
  },
  {
    name: "qwen2.5:1.5b",
    displayName: "Qwen 2.5 1.5B (Balanced)",
    size: "0.9GB", 
    memoryRequirement: 2048, // 2GB
    contextLength: 32768,
    downloadUrl: "registry.ollama.ai/library/qwen2.5:1.5b",
    modelfile: `FROM qwen2.5:1.5b
PARAMETER temperature 0.1
PARAMETER top_p 0.9
SYSTEM "You are an expert file organization assistant. Categorize files efficiently and provide clear reasoning."`
  },
  {
    name: "gemma2:2b",
    displayName: "Gemma 2 2B (Most Capable)",
    size: "1.6GB",
    memoryRequirement: 3072, // 3GB
    contextLength: 8192,
    downloadUrl: "registry.ollama.ai/library/gemma2:2b",
    modelfile: `FROM gemma2:2b
PARAMETER temperature 0.1
PARAMETER top_p 0.9
SYSTEM "You are a professional file organization expert. Analyze files and suggest optimal categorization with confidence scores."`
  }
];
```

### Installation-Time Ollama Setup
```rust
// Tauri backend - src-tauri/src/ai/ollama_manager.rs
use std::process::{Command, Stdio};
use std::path::PathBuf;
use tokio::time::{timeout, Duration};
use reqwest::Client;
use serde_json::json;

pub struct OllamaManager {
    ollama_path: PathBuf,
    models_dir: PathBuf,
    service_port: u16,
    process_handle: Option<tokio::process::Child>,
}

impl OllamaManager {
    pub fn new(app_data_dir: &PathBuf) -> Self {
        Self {
            ollama_path: app_data_dir.join("ollama").join("ollama"),
            models_dir: app_data_dir.join("models"),
            service_port: 11434,
            process_handle: None,
        }
    }
    
    pub async fn install_ollama(&self) -> Result<(), OllamaError> {
        // 1. Download Ollama binary for the current platform
        let ollama_url = self.get_ollama_download_url()?;
        log::info!("Downloading Ollama from: {}", ollama_url);
        
        self.download_and_extract_ollama(&ollama_url).await?;
        
        // 2. Make executable (Unix systems)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&self.ollama_path)?.permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&self.ollama_path, perms)?;
        }
        
        // 3. Test Ollama installation
        self.verify_ollama_installation().await?;
        
        Ok(())
    }
    
    pub async fn start_ollama_service(&mut self) -> Result<(), OllamaError> {
        if self.is_service_running().await {
            log::info!("Ollama service already running");
            return Ok(());
        }
        
        log::info!("Starting Ollama service on port {}", self.service_port);
        
        // Set environment variables
        let mut cmd = tokio::process::Command::new(&self.ollama_path);
        cmd.arg("serve")
           .env("OLLAMA_HOST", format!("127.0.0.1:{}", self.service_port))
           .env("OLLAMA_MODELS", &self.models_dir)
           .env("OLLAMA_KEEP_ALIVE", "5m") // Keep models loaded for 5 minutes
           .env("OLLAMA_MAX_LOADED_MODELS", "1") // Only one model at a time
           .stdout(Stdio::piped())
           .stderr(Stdio::piped());
        
        let child = cmd.spawn()?;
        self.process_handle = Some(child);
        
        // Wait for service to be ready
        self.wait_for_service_ready().await?;
        
        log::info!("Ollama service started successfully");
        Ok(())
    }
    
    pub async fn install_default_model(&self) -> Result<String, OllamaError> {
        // Detect system RAM and select appropriate model
        let system_ram_gb = self.get_system_ram_gb().await?;
        let selected_model = self.select_optimal_model(system_ram_gb)?;
        
        log::info!("Installing model: {} (System RAM: {}GB)", 
                   selected_model.displayName, system_ram_gb);
        
        // Pull the model through Ollama API
        self.pull_model(&selected_model).await?;
        
        // Create custom modelfile if specified
        if let Some(modelfile) = &selected_model.modelfile {
            self.create_custom_model(&selected_model.name, modelfile).await?;
        }
        
        // Test model functionality
        self.test_model(&selected_model.name).await?;
        
        Ok(selected_model.name.clone())
    }
    
    async fn pull_model(&self, model: &LocalModel) -> Result<(), OllamaError> {
        let client = Client::new();
        let url = format!("http://127.0.0.1:{}/api/pull", self.service_port);
        
        let mut response = client
            .post(&url)
            .json(&json!({
                "name": model.name,
                "stream": true
            }))
            .send()
            .await?;
        
        // Stream progress updates
        while let Some(chunk) = response.chunk().await? {
            if let Ok(text) = String::from_utf8(chunk.to_vec()) {
                for line in text.lines() {
                    if let Ok(progress) = serde_json::from_str::<serde_json::Value>(line) {
                        if let Some(status) = progress.get("status") {
                            log::info!("Model download: {}", status);
                            
                            // Emit progress to frontend
                            if let (Some(completed), Some(total)) = 
                                (progress.get("completed"), progress.get("total")) {
                                let percentage = (completed.as_u64().unwrap_or(0) as f64 / 
                                                total.as_u64().unwrap_or(1) as f64) * 100.0;
                                // Emit progress event to frontend
                                self.emit_progress(percentage, status.as_str().unwrap_or("")).await;
                            }
                        }
                    }
                }
            }
        }
        
        Ok(())
    }
    
    async fn test_model(&self, model_name: &str) -> Result<(), OllamaError> {
        let client = Client::new();
        let url = format!("http://127.0.0.1:{}/api/generate", self.service_port);
        
        let test_response = client
            .post(&url)
            .json(&json!({
                "model": model_name,
                "prompt": "Categorize this file: document.pdf",
                "stream": false,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 50
                }
            }))
            .send()
            .await?;
        
        if test_response.status().is_success() {
            log::info!("Model {} test successful", model_name);
            Ok(())
        } else {
            Err(OllamaError::ModelTestFailed(model_name.to_string()))
        }
    }
    
    fn select_optimal_model(&self, system_ram_gb: f64) -> Result<&LocalModel, OllamaError> {
        // Leave plenty of RAM for the system and other applications
        // Use conservative estimates: 12GB for system, 4GB available for AI
        let available_ai_ram_mb = if system_ram_gb >= 16.0 { 4096.0 } else { 2048.0 };
        
        // Find the largest model that fits comfortably
        for model in &LOCAL_MODELS {
            if (model.memoryRequirement as f64) <= available_ai_ram_mb {
                return Ok(model);
            }
        }
        
        // Fallback to smallest model
        Ok(&LOCAL_MODELS[0])
    }
    
    async fn get_system_ram_gb(&self) -> Result<f64, OllamaError> {
        // Platform-specific RAM detection
        #[cfg(target_os = "macos")]
        {
            let output = Command::new("sysctl")
                .arg("-n")
                .arg("hw.memsize")
                .output()?;
            let bytes = String::from_utf8(output.stdout)?
                .trim()
                .parse::<u64>()?;
            Ok(bytes as f64 / (1024.0 * 1024.0 * 1024.0))
        }
        
        #[cfg(target_os = "windows")]
        {
            // Use Windows API to get total RAM
            // Implementation would use windows-sys crate
            Ok(16.0) // Placeholder
        }
        
        #[cfg(target_os = "linux")]
        {
            let meminfo = std::fs::read_to_string("/proc/meminfo")?;
            for line in meminfo.lines() {
                if line.starts_with("MemTotal:") {
                    let kb = line.split_whitespace()
                        .nth(1)
                        .and_then(|s| s.parse::<u64>().ok())
                        .unwrap_or(0);
                    return Ok(kb as f64 / (1024.0 * 1024.0));
                }
            }
            Ok(16.0) // Fallback
        }
    }
}
```

### Frontend AI Service Integration
```typescript
// Frontend AI service - src/services/OllamaService.ts
interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface FileAnalysisRequest {
  fileName: string;
  filePath: string;
  fileExtension: string;
  fileSize: number;
  existingStructure: FolderStructure;
  organizationScheme: OrganizationScheme;
}

class OllamaAIService {
  private ollamaUrl = 'http://127.0.0.1:11434';
  private currentModel: string | null = null;
  private isServiceReady = false;
  
  async initialize(): Promise<void> {
    try {
      // Ensure Ollama service is running
      await invoke('start_ollama_service');
      
      // Wait for service to be ready
      await this.waitForService();
      
      // Get the active model
      this.currentModel = await invoke<string>('get_active_model');
      this.isServiceReady = true;
      
      log.info(`Ollama service ready with model: ${this.currentModel}`);
    } catch (error) {
      log.error('Failed to initialize Ollama service:', error);
      throw error;
    }
  }
  
  async analyzeFile(request: FileAnalysisRequest): Promise<AIAnalysisResult> {
    if (!this.isServiceReady) {
      await this.initialize();
    }
    
    const prompt = this.createFileAnalysisPrompt(request);
    
    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.currentModel,
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.9,
            num_predict: 200,
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const result: OllamaResponse = await response.json();
      return this.parseAnalysisResponse(result.response, request);
      
    } catch (error) {
      log.error('AI analysis failed:', error);
      // Fallback to rule-based categorization
      return this.fallbackCategorization(request);
    }
  }
  
  private createFileAnalysisPrompt(request: FileAnalysisRequest): string {
    const { fileName, fileExtension, existingStructure, organizationScheme } = request;
    
    let prompt = `Analyze this file and suggest the best category for organization:

File: ${fileName}
Extension: ${fileExtension}
Size: ${this.formatFileSize(request.fileSize)}

`;

    if (organizationScheme === 'johnny-decimal') {
      prompt += `Organization System: Johnny Decimal
Current structure:
${this.formatExistingStructure(existingStructure)}

Rules:
- Use existing categories when appropriate
- Maintain consistency with current organization
- Prefer specific subcategories over general ones

`;
    }
    
    prompt += `Respond in this exact JSON format:
{
  "category": "specific_category_path",
  "confidence": 0.85,
  "reasoning": "Brief explanation"
}`;

    return prompt;
  }
  
  private parseAnalysisResponse(response: string, request: FileAnalysisRequest): AIAnalysisResult {
    try {
      // Extract JSON from response (handle potential markdown formatting)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        suggestedCategory: parsed.category || 'Uncategorized',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        reasoning: parsed.reasoning || 'No reasoning provided',
        alternativeCategories: []
      };
    } catch (error) {
      log.error('Failed to parse AI response:', error);
      return this.fallbackCategorization(request);
    }
  }
  
  private async waitForService(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`${this.ollamaUrl}/api/tags`, {
          method: 'GET'
        });
        
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Ollama service failed to start within timeout');
  }
  
  async getModelInfo(): Promise<ModelInfo> {
    const response = await fetch(`${this.ollamaUrl}/api/show`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: this.currentModel
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get model info: ${response.status}`);
    }
    
    const info = await response.json();
    return {
      name: info.details?.name || this.currentModel,
      size: info.size || 0,
      parameter_size: info.details?.parameter_size || 'Unknown',
      quantization_level: info.details?.quantization_level || 'Unknown'
    };
  }
}
```

### Installation Wizard with Ollama Setup
```typescript
// Enhanced installation component for Ollama setup
const OllamaSetupStep: React.FC = () => {
  const [setupPhase, setSetupPhase] = useState<SetupPhase>('detecting');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [selectedModel, setSelectedModel] = useState<LocalModel | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  
  useEffect(() => {
    initializeOllamaSetup();
  }, []);
  
  const initializeOllamaSetup = async () => {
    try {
      setSetupPhase('detecting');
      
      // 1. Detect system capabilities
      const specs = await invoke<SystemInfo>('detect_system_specs');
      setSystemInfo(specs);
      
      // 2. Check if Ollama is already installed
      const ollamaStatus = await invoke<OllamaStatus>('check_ollama_installation');
      
      if (ollamaStatus.isInstalled && ollamaStatus.hasModel) {
        setSetupPhase('complete');
        return;
      }
      
      // 3. Install Ollama if needed
      if (!ollamaStatus.isInstalled) {
        setSetupPhase('installing-ollama');
        await invoke('install_ollama');
      }
      
      // 4. Start Ollama service
      setSetupPhase('starting-service');
      await invoke('start_ollama_service');
      
      // 5. Select and install model
      const model = selectModelForSystem(specs);
      setSelectedModel(model);
      
      setSetupPhase('downloading-model');
      
      // Listen for download progress
      const unlisten = await listen<DownloadProgress>('model-download-progress', (event) => {
        setDownloadProgress(event.payload);
      });
      
      await invoke('install_default_model');
      unlisten();
      
      setSetupPhase('testing');
      await invoke('test_model_functionality');
      
      setSetupPhase('complete');
      
    } catch (error) {
      console.error('Ollama setup failed:', error);
      setSetupPhase('error');
    }
  };
  
  return (
    <div className="ollama-setup-container">
      <div className="setup-header">
        <h2>Setting up AI Assistant</h2>
        <p>Installing Ollama and downloading a local AI model for file organization</p>
      </div>
      
      {systemInfo && (
        <div className="system-info">
          <h4>System Configuration:</h4>
          <div className="info-grid">
            <span>RAM: {systemInfo.totalRamGB}GB</span>
            <span>CPU: {systemInfo.cpuCores} cores</span>
            <span>Storage: {systemInfo.availableStorageGB}GB available</span>
          </div>
        </div>
      )}
      
      {setupPhase === 'installing-ollama' && (
        <div className="phase-content">
          <Spinner />
          <h3>Installing Ollama Runtime</h3>
          <p>Setting up the local AI service...</p>
        </div>
      )}
      
      {setupPhase === 'downloading-model' && selectedModel && (
        <div className="phase-content">
          <h3>Downloading {selectedModel.displayName}</h3>
          <p className="model-info">
            Size: {selectedModel.size} | Memory: {selectedModel.memoryRequirement}MB
          </p>
          
          {downloadProgress && (
            <div className="download-progress">
              <ProgressBar percentage={downloadProgress.percentage} />
              <div className="progress-text">
                <span>{downloadProgress.status}</span>
                <span>{downloadProgress.percentage.toFixed(1)}%</span>
              </div>
            </div>
          )}
          
          <div className="benefits-list">
            <h4>Benefits of Local AI:</h4>
            <ul>
              <li>🔒 Complete privacy - your files never leave your device</li>
              <li>⚡ Instant responses - no internet required</li>
              <li>🎯 Optimized for file organization tasks</li>
              <li>💰 No API costs or usage limits</li>
            </ul>
          </div>
        </div>
      )}
      
      {setupPhase === 'complete' && (
        <div className="phase-content">
          <CheckIcon className="success-icon" />
          <h3>AI Assistant Ready!</h3>
          <p>Ollama and {selectedModel?.displayName} are installed and running.</p>
          
          <div className="completion-summary">
            <h4>Setup Complete:</h4>
            <ul>
              <li>✅ Ollama service running on localhost</li>
              <li>✅ {selectedModel?.displayName} model loaded</li>
              <li>✅ File analysis ready</li>
              <li>✅ Privacy-first configuration</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
```

This architecture provides:

1. **🎯 Local-Only**: Ollama bundled with app, no external dependencies
2. **🚀 Optimized Models**: Lightweight models specifically chosen for 16GB RAM systems
3. **🔒 Privacy**: Everything runs locally, no data ever leaves the device
4. **⚡ Performance**: Direct Ollama API communication for fast responses
5. **🛠️ Self-Contained**: Complete AI stack bundled with the application
6. **📦 Easy Installation**: Automated setup during app installation

The app will bundle Ollama and handle all AI processing locally through the standard Ollama API, making it reliable and privacy-focused.