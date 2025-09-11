use thiserror::Error;

pub type Result<T> = std::result::Result<T, AppError>;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("File system error: {0}")]
    FileSystem(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Path not found: {0}")]
    PathNotFound(String),

    #[error("AI service error: {0}")]
    AiService(String),

    #[error("Ollama error: {0}")]
    Ollama(String),

    #[error("HTTP request error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Johnny Decimal validation error: {0}")]
    JohnnyDecimalValidation(String),

    #[error("Organization error: {0}")]
    Organization(String),

    #[error("Configuration error: {0}")]
    Configuration(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Operation cancelled")]
    Cancelled,

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

// Utility functions for common error scenarios
impl AppError {
    pub fn file_not_found(path: &str) -> Self {
        AppError::PathNotFound(format!("File not found: {}", path))
    }

    pub fn directory_not_found(path: &str) -> Self {
        AppError::PathNotFound(format!("Directory not found: {}", path))
    }

    pub fn permission_error(operation: &str, path: &str) -> Self {
        AppError::PermissionDenied(format!("Permission denied for {} on {}", operation, path))
    }

    pub fn ai_unavailable() -> Self {
        AppError::AiService("AI service is not available".to_string())
    }

    pub fn invalid_johnny_decimal(reason: &str) -> Self {
        AppError::JohnnyDecimalValidation(format!("Invalid Johnny Decimal structure: {}", reason))
    }
}

// Logging helper for errors
pub fn log_error(error: &AppError, context: &str) {
    log::error!("[{}] {}", context, error);
}

// Result helper for operations that might fail
#[allow(dead_code)]
pub fn handle_result<T>(result: Result<T>, context: &str) -> Result<T> {
    match result {
        Ok(value) => Ok(value),
        Err(error) => {
            log_error(&error, context);
            Err(error)
        }
    }
}
