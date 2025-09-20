use crate::error::{AppError, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use tokio::time::{timeout, Duration};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisRequest {
    pub file_path: String,
    pub file_name: String,
    pub file_extension: String,
    pub file_size: u64,
    pub mime_type: Option<String>,
    pub existing_structure: Option<serde_json::Value>,
    pub organization_scheme: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub suggested_category: String,
    pub confidence: f64,
    pub reasoning: String,
    pub alternative_categories: Vec<String>,
    pub tags: Vec<String>,
}


#[allow(dead_code)]
pub struct OllamaService {
    client: Client,
    base_url: String,
    current_model: Option<String>,
    is_running: bool,
}

#[allow(dead_code)]
impl OllamaService {
    pub async fn new() -> Result<Self> {
        let client = Client::new();
        let base_url = "http://127.0.0.1:11434".to_string();

        Ok(Self {
            client,
            base_url,
            current_model: None,
            is_running: false,
        })
    }

    pub async fn start(&mut self) -> Result<String> {
        // Check if Ollama is already running
        if self.is_service_available().await {
            self.is_running = true;
            return Ok("Ollama service is already running".to_string());
        }

        // Try to start Ollama service
        match self.start_ollama_process().await {
            Ok(_) => {
                // Wait a bit for the service to start
                tokio::time::sleep(Duration::from_secs(3)).await;

                if self.is_service_available().await {
                    self.is_running = true;

                    // Try to load default model
                    if let Err(e) = self.ensure_model_available("llama3.2:1b").await {
                        log::warn!("Failed to ensure default model: {}", e);
                    }

                    Ok("Ollama service started successfully".to_string())
                } else {
                    Err(AppError::AiService(
                        "Failed to start Ollama service".to_string(),
                    ))
                }
            }
            Err(e) => Err(AppError::AiService(format!(
                "Failed to start Ollama: {}",
                e
            ))),
        }
    }

    pub async fn stop(&mut self) -> Result<()> {
        // Note: In a real implementation, we might want to gracefully shutdown
        // For now, we just mark it as not running
        self.is_running = false;
        self.current_model = None;
        Ok(())
    }

    pub async fn get_status(&self) -> Result<serde_json::Value> {
        if !self.is_running {
            return Ok(serde_json::json!({
                "status": "stopped",
                "model": null,
                "available": false
            }));
        }

        match self.get_available_models().await {
            Ok(models) => Ok(serde_json::json!({
                "status": "running",
                "model": self.current_model,
                "available": true,
                "models": models
            })),
            Err(_) => Ok(serde_json::json!({
                "status": "error",
                "model": null,
                "available": false
            })),
        }
    }

    pub async fn analyze_file(&self, request: AnalysisRequest) -> Result<AnalysisResult> {
        if !self.is_running {
            return Err(AppError::AiService(
                "Ollama service is not running".to_string(),
            ));
        }

        // First try AI analysis, then fallback to rule-based
        match self.ai_analyze_file(&request).await {
            Ok(result) => Ok(result),
            Err(e) => {
                log::warn!("AI analysis failed: {}, falling back to rule-based", e);
                self.rule_based_analysis(&request)
            }
        }
    }

    async fn ai_analyze_file(&self, request: &AnalysisRequest) -> Result<AnalysisResult> {
        let model = self
            .current_model
            .as_ref()
            .ok_or_else(|| AppError::AiService("No model loaded".to_string()))?;

        let prompt = self.build_analysis_prompt(request);

        let payload = serde_json::json!({
            "model": model,
            "prompt": prompt,
            "stream": false,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
                "max_tokens": 500
            }
        });

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(format!("{}/api/generate", self.base_url))
                .json(&payload)
                .send(),
        )
        .await
        .map_err(|_| AppError::AiService("Request timeout".to_string()))?
        .map_err(AppError::Http)?;

        if !response.status().is_success() {
            return Err(AppError::AiService(format!(
                "HTTP error: {}",
                response.status()
            )));
        }

        let response_data: serde_json::Value = response.json().await.map_err(AppError::Http)?;

        let ai_response = response_data["response"]
            .as_str()
            .ok_or_else(|| AppError::AiService("Invalid response format".to_string()))?;

        self.parse_ai_response(ai_response)
    }

    fn rule_based_analysis(&self, request: &AnalysisRequest) -> Result<AnalysisResult> {
        let category = match request.file_extension.to_lowercase().as_str() {
            "pdf" | "doc" | "docx" | "txt" | "rtf" => "20-29 Documents/21 Text Documents",
            "xls" | "xlsx" | "csv" => "20-29 Documents/22 Spreadsheets",
            "ppt" | "pptx" => "20-29 Documents/23 Presentations",
            "jpg" | "jpeg" | "png" | "gif" | "bmp" | "svg" => "30-39 Media/31 Images",
            "mp4" | "avi" | "mkv" | "mov" | "wmv" => "30-39 Media/32 Videos",
            "mp3" | "wav" | "flac" | "aac" => "30-39 Media/33 Audio",
            "zip" | "rar" | "7z" | "tar" | "gz" => "40-49 Archives/41 Compressed Files",
            "exe" | "msi" | "dmg" | "pkg" => "40-49 Archives/42 Installers",
            _ => "90-99 Miscellaneous/91 Other Files",
        };

        Ok(AnalysisResult {
            suggested_category: category.to_string(),
            confidence: 0.75, // Rule-based has moderate confidence
            reasoning: format!(
                "File categorized based on extension '{}' using rule-based fallback",
                request.file_extension
            ),
            alternative_categories: vec!["90-99 Miscellaneous/91 Other Files".to_string()],
            tags: vec![request.file_extension.clone(), "rule-based".to_string()],
        })
    }

    fn build_analysis_prompt(&self, request: &AnalysisRequest) -> String {
        format!(
            r#"You are a file organization assistant using the Johnny Decimal system. 
Analyze the following file and suggest the most appropriate category:

File: {}
Extension: {}
Size: {} bytes
Type: {}

Johnny Decimal areas (10-19, 20-29, 30-39, etc.) should be used for broad categories.
Categories (11, 12, 13, etc.) should be specific within each area.

Respond with JSON:
{{
    "category": "Area Name/Category Name",
    "confidence": 0.0-1.0,
    "reasoning": "explanation",
    "alternatives": ["alt1", "alt2"],
    "tags": ["tag1", "tag2"]
}}

Be concise and practical in your categorization."#,
            request.file_name,
            request.file_extension,
            request.file_size,
            request.mime_type.as_deref().unwrap_or("unknown")
        )
    }

    fn parse_ai_response(&self, response: &str) -> Result<AnalysisResult> {
        // Try to extract JSON from the response
        if let Some(start) = response.find('{') {
            if let Some(end) = response.rfind('}') {
                let json_str = &response[start..=end];

                match serde_json::from_str::<serde_json::Value>(json_str) {
                    Ok(data) => {
                        return Ok(AnalysisResult {
                            suggested_category: data["category"]
                                .as_str()
                                .unwrap_or("90-99 Miscellaneous/91 Other Files")
                                .to_string(),
                            confidence: data["confidence"].as_f64().unwrap_or(0.5),
                            reasoning: data["reasoning"]
                                .as_str()
                                .unwrap_or("AI analysis")
                                .to_string(),
                            alternative_categories: data["alternatives"]
                                .as_array()
                                .map(|arr| {
                                    arr.iter()
                                        .filter_map(|v| v.as_str())
                                        .map(|s| s.to_string())
                                        .collect()
                                })
                                .unwrap_or_default(),
                            tags: data["tags"]
                                .as_array()
                                .map(|arr| {
                                    arr.iter()
                                        .filter_map(|v| v.as_str())
                                        .map(|s| s.to_string())
                                        .collect()
                                })
                                .unwrap_or_default(),
                        });
                    }
                    Err(e) => {
                        log::warn!("Failed to parse AI JSON response: {}", e);
                    }
                }
            }
        }

        // Fallback: extract category from text
        let category = if response.contains("Documents") {
            "20-29 Documents/21 Text Documents"
        } else if response.contains("Media") || response.contains("Images") {
            "30-39 Media/31 Images"
        } else {
            "90-99 Miscellaneous/91 Other Files"
        };

        Ok(AnalysisResult {
            suggested_category: category.to_string(),
            confidence: 0.6,
            reasoning: "Parsed from AI text response".to_string(),
            alternative_categories: vec![],
            tags: vec!["ai-parsed".to_string()],
        })
    }

    pub async fn get_available_models(&self) -> Result<Vec<String>> {
        if !self.is_running {
            return Ok(vec![]);
        }

        let response = self
            .client
            .get(format!("{}/api/tags", self.base_url))
            .send()
            .await
            .map_err(AppError::Http)?;

        if !response.status().is_success() {
            return Err(AppError::AiService("Failed to fetch models".to_string()));
        }

        let data: serde_json::Value = response.json().await.map_err(AppError::Http)?;

        let models = data["models"]
            .as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| m["name"].as_str())
                    .map(|s| s.to_string())
                    .collect()
            })
            .unwrap_or_default();

        Ok(models)
    }

    async fn is_service_available(&self) -> bool {
        match self
            .client
            .get(format!("{}/api/tags", self.base_url))
            .timeout(Duration::from_secs(5))
            .send()
            .await
        {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }

    async fn start_ollama_process(&self) -> Result<()> {
        // Try to start Ollama as a subprocess
        let mut cmd = Command::new("ollama");
        cmd.arg("serve").stdout(Stdio::null()).stderr(Stdio::null());

        match cmd.spawn() {
            Ok(_) => Ok(()),
            Err(e) => Err(AppError::AiService(format!(
                "Failed to spawn Ollama process: {}",
                e
            ))),
        }
    }

    async fn ensure_model_available(&mut self, model_name: &str) -> Result<()> {
        let models = self.get_available_models().await?;

        if !models.iter().any(|m| m.contains(model_name)) {
            log::info!("Model {} not found, attempting to pull...", model_name);
            // In a real implementation, we would pull the model here
            // For now, we'll just log and continue
        }

        self.current_model = Some(model_name.to_string());
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_ollama_service_new() {
        let service = OllamaService::new().await.unwrap();
        assert!(!service.is_running);
        assert!(service.current_model.is_none());
    }

    #[tokio::test]
    async fn test_rule_based_analysis() {
        let service = OllamaService::new().await.unwrap();

        let request = AnalysisRequest {
            file_path: "/test/document.pdf".to_string(),
            file_name: "document.pdf".to_string(),
            file_extension: "pdf".to_string(),
            file_size: 1024,
            mime_type: Some("application/pdf".to_string()),
            existing_structure: None,
            organization_scheme: "JOHNNY_DECIMAL".to_string(),
        };

        let result = service.rule_based_analysis(&request).unwrap();
        assert!(result.suggested_category.contains("Documents"));
        assert_eq!(result.confidence, 0.75);
    }
}
