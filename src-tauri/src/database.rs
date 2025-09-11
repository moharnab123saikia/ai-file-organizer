use crate::error::Result;
use crate::johnny_decimal::JDStructure;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct DatabaseManager {
    db_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: String,
    pub path: String,
    pub filename: String,
    pub extension: String,
    pub size: u64,
    pub modified_at: chrono::DateTime<chrono::Utc>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub mime_type: Option<String>,
    pub hash: Option<String>,
    pub jd_assignment: Option<String>, // JSON serialized CategoryAssignment
    pub tags: Vec<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrganizationSession {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub structure_id: String,
    pub status: SessionStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub files_processed: u32,
    pub files_total: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SessionStatus {
    Created,
    Scanning,
    Analyzing,
    Organizing,
    Completed,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub auto_backup: bool,
    pub backup_location: Option<String>,
    pub ai_provider: String,
    pub ai_model: String,
    pub preview_mode: bool,
    pub confirm_moves: bool,
    pub max_file_size_mb: u64,
    pub excluded_extensions: Vec<String>,
    pub excluded_paths: Vec<String>,
}

#[allow(dead_code)]
impl DatabaseManager {
    pub fn new(db_path: &str) -> Result<Self> {
        let manager = Self {
            db_path: db_path.to_string(),
        };

        manager.initialize_database()?;
        Ok(manager)
    }

    fn initialize_database(&self) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS jd_structures (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                root_path TEXT NOT NULL,
                data TEXT NOT NULL, -- JSON serialized JDStructure
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS file_metadata (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL UNIQUE,
                filename TEXT NOT NULL,
                extension TEXT NOT NULL,
                size INTEGER NOT NULL,
                modified_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                mime_type TEXT,
                hash TEXT,
                jd_assignment TEXT, -- JSON serialized CategoryAssignment
                tags TEXT, -- JSON array
                notes TEXT
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS organization_sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                root_path TEXT NOT NULL,
                structure_id TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                files_processed INTEGER NOT NULL DEFAULT 0,
                files_total INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (structure_id) REFERENCES jd_structures (id)
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create indexes for better performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_file_metadata_path ON file_metadata(path)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_file_metadata_extension ON file_metadata(extension)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_organization_sessions_status ON organization_sessions(status)",
            [],
        )?;

        // Insert default settings if they don't exist
        self.initialize_default_settings(&conn)?;

        Ok(())
    }

    fn initialize_default_settings(&self, conn: &Connection) -> Result<()> {
        let default_settings = AppSettings {
            theme: "system".to_string(),
            auto_backup: true,
            backup_location: None,
            ai_provider: "ollama".to_string(),
            ai_model: "llama3.2:1b".to_string(),
            preview_mode: true,
            confirm_moves: true,
            max_file_size_mb: 1000,
            excluded_extensions: vec!["tmp".to_string(), "cache".to_string(), "log".to_string()],
            excluded_paths: vec![
                ".git".to_string(),
                "node_modules".to_string(),
                ".DS_Store".to_string(),
            ],
        };

        let settings_json = serde_json::to_string(&default_settings)?;

        conn.execute(
            "INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![
                "app_settings",
                settings_json,
                chrono::Utc::now().to_rfc3339()
            ],
        )?;

        Ok(())
    }

    // JD Structure operations
    pub async fn save_structure(&self, structure: &JDStructure) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        let structure_json = serde_json::to_string(structure)?;

        conn.execute(
            "INSERT OR REPLACE INTO jd_structures (id, name, root_path, data, created_at, modified_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                structure.id,
                structure.name,
                structure.root_path,
                structure_json,
                structure.created_at.to_rfc3339(),
                structure.modified_at.to_rfc3339()
            ],
        )?;

        Ok(())
    }

    pub async fn load_structure(&self, structure_id: &str) -> Result<Option<JDStructure>> {
        let conn = Connection::open(&self.db_path)?;

        let mut stmt = conn.prepare("SELECT data FROM jd_structures WHERE id = ?1")?;

        let result = stmt.query_row(params![structure_id], |row| {
            let data: String = row.get(0)?;
            Ok(data)
        });

        match result {
            Ok(data) => {
                let structure: JDStructure = serde_json::from_str(&data)?;
                Ok(Some(structure))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub async fn list_structures(&self) -> Result<Vec<(String, String, String)>> {
        let conn = Connection::open(&self.db_path)?;

        let mut stmt = conn
            .prepare("SELECT id, name, root_path FROM jd_structures ORDER BY modified_at DESC")?;

        let structures = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
            ))
        })?;

        let mut result = Vec::new();
        for structure in structures {
            let structure = structure?;
            result.push(structure);
        }

        Ok(result)
    }

    pub async fn delete_structure(&self, structure_id: &str) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        conn.execute(
            "DELETE FROM jd_structures WHERE id = ?1",
            params![structure_id],
        )?;

        Ok(())
    }

    // File metadata operations
    pub async fn save_file_metadata(&self, metadata: &FileMetadata) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        let tags_json = serde_json::to_string(&metadata.tags)?;

        conn.execute(
            "INSERT OR REPLACE INTO file_metadata 
             (id, path, filename, extension, size, modified_at, created_at, mime_type, hash, jd_assignment, tags, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                metadata.id,
                metadata.path,
                metadata.filename,
                metadata.extension,
                metadata.size,
                metadata.modified_at.to_rfc3339(),
                metadata.created_at.to_rfc3339(),
                metadata.mime_type,
                metadata.hash,
                metadata.jd_assignment,
                tags_json,
                metadata.notes
            ],
        )?;

        Ok(())
    }

    pub async fn load_file_metadata(&self, file_path: &str) -> Result<Option<FileMetadata>> {
        let conn = Connection::open(&self.db_path)?;

        let mut stmt = conn.prepare(
            "SELECT id, path, filename, extension, size, modified_at, created_at, mime_type, hash, jd_assignment, tags, notes
             FROM file_metadata WHERE path = ?1"
        )?;

        let result = stmt.query_row(params![file_path], |row| {
            let tags_json: String = row.get(10)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            Ok(FileMetadata {
                id: row.get(0)?,
                path: row.get(1)?,
                filename: row.get(2)?,
                extension: row.get(3)?,
                size: row.get(4)?,
                modified_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(5)?)
                    .unwrap()
                    .with_timezone(&chrono::Utc),
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(6)?)
                    .unwrap()
                    .with_timezone(&chrono::Utc),
                mime_type: row.get(7)?,
                hash: row.get(8)?,
                jd_assignment: row.get(9)?,
                tags,
                notes: row.get(11)?,
            })
        });

        match result {
            Ok(metadata) => Ok(Some(metadata)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    // Organization session operations
    pub async fn create_session(&self, session: &OrganizationSession) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        let status_str = match session.status {
            SessionStatus::Created => "created",
            SessionStatus::Scanning => "scanning",
            SessionStatus::Analyzing => "analyzing",
            SessionStatus::Organizing => "organizing",
            SessionStatus::Completed => "completed",
            SessionStatus::Error => "error",
        };

        conn.execute(
            "INSERT INTO organization_sessions 
             (id, name, root_path, structure_id, status, created_at, completed_at, files_processed, files_total)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                session.id,
                session.name,
                session.root_path,
                session.structure_id,
                status_str,
                session.created_at.to_rfc3339(),
                session.completed_at.map(|dt| dt.to_rfc3339()),
                session.files_processed,
                session.files_total
            ],
        )?;

        Ok(())
    }

    pub async fn update_session_progress(
        &self,
        session_id: &str,
        files_processed: u32,
        status: SessionStatus,
    ) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        let status_str = match status {
            SessionStatus::Created => "created",
            SessionStatus::Scanning => "scanning",
            SessionStatus::Analyzing => "analyzing",
            SessionStatus::Organizing => "organizing",
            SessionStatus::Completed => "completed",
            SessionStatus::Error => "error",
        };

        let completed_at = if matches!(status, SessionStatus::Completed | SessionStatus::Error) {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        };

        conn.execute(
            "UPDATE organization_sessions 
             SET files_processed = ?1, status = ?2, completed_at = ?3
             WHERE id = ?4",
            params![files_processed, status_str, completed_at, session_id],
        )?;

        Ok(())
    }

    // Settings operations
    pub async fn load_settings(&self) -> Result<AppSettings> {
        let conn = Connection::open(&self.db_path)?;

        let mut stmt = conn.prepare("SELECT value FROM app_settings WHERE key = 'app_settings'")?;

        let result = stmt.query_row([], |row| {
            let value: String = row.get(0)?;
            Ok(value)
        });

        match result {
            Ok(settings_json) => {
                let settings: AppSettings = serde_json::from_str(&settings_json)?;
                Ok(settings)
            }
            Err(_) => {
                // Return default settings if not found
                Ok(AppSettings {
                    theme: "system".to_string(),
                    auto_backup: true,
                    backup_location: None,
                    ai_provider: "ollama".to_string(),
                    ai_model: "llama3.2:1b".to_string(),
                    preview_mode: true,
                    confirm_moves: true,
                    max_file_size_mb: 1000,
                    excluded_extensions: vec![
                        "tmp".to_string(),
                        "cache".to_string(),
                        "log".to_string(),
                    ],
                    excluded_paths: vec![
                        ".git".to_string(),
                        "node_modules".to_string(),
                        ".DS_Store".to_string(),
                    ],
                })
            }
        }
    }

    pub async fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        let settings_json = serde_json::to_string(settings)?;

        conn.execute(
            "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![
                "app_settings",
                settings_json,
                chrono::Utc::now().to_rfc3339()
            ],
        )?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_database_manager_new() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");

        let manager = DatabaseManager::new(db_path.to_str().unwrap()).unwrap();
        assert!(Path::new(&manager.db_path).exists());
    }

    #[tokio::test]
    async fn test_settings_operations() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let manager = DatabaseManager::new(db_path.to_str().unwrap()).unwrap();

        // Test loading default settings
        let settings = manager.load_settings().await.unwrap();
        assert_eq!(settings.theme, "system");
        assert_eq!(settings.ai_provider, "ollama");

        // Test saving custom settings
        let mut custom_settings = settings;
        custom_settings.theme = "dark".to_string();
        custom_settings.max_file_size_mb = 500;

        manager.save_settings(&custom_settings).await.unwrap();

        // Test loading saved settings
        let loaded_settings = manager.load_settings().await.unwrap();
        assert_eq!(loaded_settings.theme, "dark");
        assert_eq!(loaded_settings.max_file_size_mb, 500);
    }

    #[tokio::test]
    async fn test_file_metadata_operations() {
        let temp_dir = tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let manager = DatabaseManager::new(db_path.to_str().unwrap()).unwrap();

        let metadata = FileMetadata {
            id: "test-file-id".to_string(),
            path: "/test/file.txt".to_string(),
            filename: "file.txt".to_string(),
            extension: "txt".to_string(),
            size: 1024,
            modified_at: chrono::Utc::now(),
            created_at: chrono::Utc::now(),
            mime_type: Some("text/plain".to_string()),
            hash: Some("abc123".to_string()),
            jd_assignment: None,
            tags: vec!["test".to_string(), "document".to_string()],
            notes: Some("Test file".to_string()),
        };

        // Test saving metadata
        manager.save_file_metadata(&metadata).await.unwrap();

        // Test loading metadata
        let loaded_metadata = manager.load_file_metadata("/test/file.txt").await.unwrap();
        assert!(loaded_metadata.is_some());
        let loaded = loaded_metadata.unwrap();
        assert_eq!(loaded.filename, "file.txt");
        assert_eq!(loaded.tags.len(), 2);
        assert!(loaded.tags.contains(&"test".to_string()));
    }
}
