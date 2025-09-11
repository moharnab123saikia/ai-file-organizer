use crate::error::{AppError, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tokio::fs;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created: DateTime<Utc>,
    pub modified: DateTime<Utc>,
    pub file_type: String,
    pub mime_type: Option<String>,
    pub checksum: Option<String>,
    pub permissions: FilePermissions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilePermissions {
    pub readable: bool,
    pub writable: bool,
    pub executable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub files: Vec<FileMetadata>,
    pub directories: Vec<String>,
    pub total_size: u64,
    pub file_count: usize,
    pub directory_count: usize,
    pub scan_duration: u64,
}

pub struct FileScanner {
    max_depth: Option<usize>,
}

impl FileScanner {
    pub fn new() -> Result<Self> {
        Ok(Self {
            max_depth: Some(10), // Default max depth
        })
    }

    pub async fn scan_directory(&self, path: &str) -> Result<ScanResult> {
        let start_time = std::time::Instant::now();
        let path_buf = PathBuf::from(path);

        if !path_buf.exists() {
            return Err(AppError::PathNotFound(path.to_string()));
        }

        if !path_buf.is_dir() {
            return Err(AppError::InvalidInput(
                "Path is not a directory".to_string(),
            ));
        }

        let mut files = Vec::new();
        let mut directories = Vec::new();
        let mut total_size = 0u64;

        let walker = if let Some(depth) = self.max_depth {
            WalkDir::new(&path_buf).max_depth(depth)
        } else {
            WalkDir::new(&path_buf)
        };

        for entry in walker.into_iter() {
            match entry {
                Ok(entry) => {
                    let entry_path = entry.path();

                    if entry_path.is_dir() {
                        if entry_path != path_buf {
                            directories.push(entry_path.to_string_lossy().to_string());
                        }
                    } else if entry_path.is_file() {
                        match self.get_file_metadata(&entry_path.to_string_lossy()).await {
                            Ok(metadata) => {
                                total_size += metadata.size;
                                files.push(metadata);
                            }
                            Err(e) => {
                                log::warn!(
                                    "Failed to get metadata for {}: {}",
                                    entry_path.display(),
                                    e
                                );
                            }
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Error walking directory: {}", e);
                }
            }
        }

        let scan_duration = start_time.elapsed().as_millis() as u64;

        Ok(ScanResult {
            file_count: files.len(),
            directory_count: directories.len(),
            total_size,
            files,
            directories,
            scan_duration,
        })
    }

    pub async fn get_file_metadata(&self, path: &str) -> Result<FileMetadata> {
        let path_buf = PathBuf::from(path);
        let metadata = fs::metadata(&path_buf).await.map_err(AppError::Io)?;

        let name = path_buf
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        let file_type = path_buf
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("unknown")
            .to_string();

        let mime_type = mime_guess::from_path(&path_buf)
            .first()
            .map(|m| m.to_string());

        let permissions = FilePermissions {
            readable: true, // Simplified for now
            writable: !metadata.permissions().readonly(),
            executable: false, // Simplified for now
        };

        // Get timestamps
        let created = metadata
            .created()
            .map(DateTime::from)
            .unwrap_or_else(|_| Utc::now());

        let modified = metadata
            .modified()
            .map(DateTime::from)
            .unwrap_or_else(|_| Utc::now());

        Ok(FileMetadata {
            name,
            path: path.to_string(),
            size: metadata.len(),
            created,
            modified,
            file_type,
            mime_type,
            checksum: None, // Will be computed on demand
            permissions,
        })
    }

    pub async fn compute_checksum(&self, path: &str) -> Result<String> {
        let content = fs::read(path).await.map_err(AppError::Io)?;

        let mut hasher = Sha256::new();
        hasher.update(&content);
        let result = hasher.finalize();

        Ok(format!("{:x}", result))
    }
}

pub struct FileOperations {}

impl FileOperations {
    pub fn new() -> Result<Self> {
        Ok(Self {})
    }

    pub async fn move_file(
        &self,
        source: &str,
        destination: &str,
        create_destination_dir: bool,
    ) -> Result<()> {
        let source_path = PathBuf::from(source);
        let dest_path = PathBuf::from(destination);

        if !source_path.exists() {
            return Err(AppError::PathNotFound(source.to_string()));
        }

        if create_destination_dir {
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent)
                    .await
                    .map_err(AppError::Io)?;
            }
        }

        fs::rename(&source_path, &dest_path)
            .await
            .map_err(AppError::Io)?;

        Ok(())
    }

    pub async fn copy_file(
        &self,
        source: &str,
        destination: &str,
        create_destination_dir: bool,
    ) -> Result<()> {
        let source_path = PathBuf::from(source);
        let dest_path = PathBuf::from(destination);

        if !source_path.exists() {
            return Err(AppError::PathNotFound(source.to_string()));
        }

        if create_destination_dir {
            if let Some(parent) = dest_path.parent() {
                fs::create_dir_all(parent)
                    .await
                    .map_err(AppError::Io)?;
            }
        }

        fs::copy(&source_path, &dest_path)
            .await
            .map_err(AppError::Io)?;

        Ok(())
    }

    pub async fn create_directory(&self, path: &str) -> Result<()> {
        fs::create_dir_all(path)
            .await
            .map_err(AppError::Io)?;
        Ok(())
    }

    pub async fn delete_file(&self, path: &str) -> Result<()> {
        let path_buf = PathBuf::from(path);

        if path_buf.is_file() {
            fs::remove_file(path).await.map_err(AppError::Io)?;
        } else {
            return Err(AppError::InvalidInput("Path is not a file".to_string()));
        }

        Ok(())
    }

    pub async fn delete_directory(&self, path: &str, recursive: bool) -> Result<()> {
        let path_buf = PathBuf::from(path);

        if !path_buf.is_dir() {
            return Err(AppError::InvalidInput(
                "Path is not a directory".to_string(),
            ));
        }

        if recursive {
            fs::remove_dir_all(path)
                .await
                .map_err(AppError::Io)?;
        } else {
            fs::remove_dir(path).await.map_err(AppError::Io)?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use tokio::fs::File;

    #[tokio::test]
    async fn test_file_scanner_new() {
        let scanner = FileScanner::new().unwrap();
        assert_eq!(scanner.max_depth, Some(10));
    }

    #[tokio::test]
    async fn test_scan_directory() {
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path().to_str().unwrap();

        // Create a test file
        let test_file = temp_dir.path().join("test.txt");
        File::create(&test_file).await.unwrap();

        let scanner = FileScanner::new().unwrap();
        let result = scanner.scan_directory(temp_path).await.unwrap();

        assert_eq!(result.file_count, 1);
        assert_eq!(result.directory_count, 0);
    }

    #[tokio::test]
    async fn test_file_operations() {
        let temp_dir = TempDir::new().unwrap();
        let source = temp_dir.path().join("source.txt");
        let dest = temp_dir.path().join("dest.txt");

        // Create source file
        File::create(&source).await.unwrap();

        let ops = FileOperations::new().unwrap();

        // Test copy
        ops.copy_file(source.to_str().unwrap(), dest.to_str().unwrap(), false)
            .await
            .unwrap();

        assert!(dest.exists());
        assert!(source.exists()); // Should still exist after copy
    }
}
