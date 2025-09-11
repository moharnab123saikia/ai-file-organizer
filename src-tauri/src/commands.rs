use tauri::AppHandle;

/// A simple greeting command for testing Tauri backend communication
#[tauri::command]
pub fn greet(name: &str) -> String {
    if name == "Playwright Test" {
        format!("Hello Playwright Test!")
    } else {
        format!("Hello, {}! You've been greeted from Rust!", name)
    }
}

/// Get application version information
#[tauri::command]
pub fn get_app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "AI File Organizer",
        "version": "1.0.0",
        "description": "Organize your files intelligently using AI and the Johnny Decimal system"
    })
}

/// Health check command to verify backend is running
#[tauri::command]
pub fn health_check() -> serde_json::Value {
    serde_json::json!({
        "status": "ok",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "backend": "rust-tauri"
    })
}

/// Test command to simulate file scanning
#[tauri::command]
pub async fn test_scan_files(path: &str) -> Result<serde_json::Value, String> {
    // Simulate a delay for testing
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    Ok(serde_json::json!({
        "path": path,
        "files_found": 42,
        "directories_found": 8,
        "total_size": 1048576,
        "scan_time_ms": 500
    }))
}

/// Test command to simulate AI analysis
#[tauri::command] 
pub async fn test_ai_analysis(file_count: u32) -> Result<serde_json::Value, String> {
    // Simulate AI processing time
    tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;
    
    Ok(serde_json::json!({
        "files_analyzed": file_count,
        "suggestions_generated": file_count / 2,
        "analysis_time_ms": 2000,
        "status": "completed"
    }))
}