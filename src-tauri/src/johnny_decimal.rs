use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JDStructure {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub areas: Vec<JDArea>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub modified_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JDArea {
    pub number: u8, // 10, 20, 30, etc.
    pub name: String,
    pub description: Option<String>,
    pub categories: Vec<JDCategory>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JDCategory {
    pub number: u8, // 11, 12, 13, etc.
    pub name: String,
    pub description: Option<String>,
    pub items: Vec<JDItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JDItem {
    pub number: String, // 11.01, 11.02, etc.
    pub name: String,
    pub description: Option<String>,
    pub files: Vec<String>, // File paths
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryAssignment {
    pub area_number: u8,
    pub category_number: u8,
    pub item_number: String,
    pub confidence: f64,
    pub reasoning: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JDValidationResult {
    pub is_valid: bool,
    pub errors: Vec<JDValidationError>,
    pub warnings: Vec<JDValidationWarning>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JDValidationError {
    pub error_type: String,
    pub message: String,
    pub area_number: Option<u8>,
    pub category_number: Option<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JDValidationWarning {
    pub warning_type: String,
    pub message: String,
    pub suggestion: Option<String>,
}

pub struct JohnnyDecimalEngine {
    // File type mappings for automatic categorization
    file_type_mappings: HashMap<String, (u8, String)>, // extension -> (area, category_name)
}

impl JohnnyDecimalEngine {
    pub fn new() -> Result<Self> {
        let mut file_type_mappings = HashMap::new();

        // Documents area (20-29)
        file_type_mappings.insert("pdf".to_string(), (20, "Reports and Documents".to_string()));
        file_type_mappings.insert("doc".to_string(), (20, "Text Documents".to_string()));
        file_type_mappings.insert("docx".to_string(), (20, "Text Documents".to_string()));
        file_type_mappings.insert("txt".to_string(), (20, "Text Documents".to_string()));
        file_type_mappings.insert("rtf".to_string(), (20, "Text Documents".to_string()));
        file_type_mappings.insert("xls".to_string(), (20, "Spreadsheets".to_string()));
        file_type_mappings.insert("xlsx".to_string(), (20, "Spreadsheets".to_string()));
        file_type_mappings.insert("csv".to_string(), (20, "Spreadsheets".to_string()));
        file_type_mappings.insert("ppt".to_string(), (20, "Presentations".to_string()));
        file_type_mappings.insert("pptx".to_string(), (20, "Presentations".to_string()));

        // Media area (30-39)
        file_type_mappings.insert("jpg".to_string(), (30, "Images".to_string()));
        file_type_mappings.insert("jpeg".to_string(), (30, "Images".to_string()));
        file_type_mappings.insert("png".to_string(), (30, "Images".to_string()));
        file_type_mappings.insert("gif".to_string(), (30, "Images".to_string()));
        file_type_mappings.insert("bmp".to_string(), (30, "Images".to_string()));
        file_type_mappings.insert("svg".to_string(), (30, "Images".to_string()));
        file_type_mappings.insert("mp4".to_string(), (30, "Videos".to_string()));
        file_type_mappings.insert("avi".to_string(), (30, "Videos".to_string()));
        file_type_mappings.insert("mkv".to_string(), (30, "Videos".to_string()));
        file_type_mappings.insert("mov".to_string(), (30, "Videos".to_string()));
        file_type_mappings.insert("mp3".to_string(), (30, "Audio".to_string()));
        file_type_mappings.insert("wav".to_string(), (30, "Audio".to_string()));
        file_type_mappings.insert("flac".to_string(), (30, "Audio".to_string()));

        // Development area (40-49)
        file_type_mappings.insert("js".to_string(), (40, "Source Code".to_string()));
        file_type_mappings.insert("ts".to_string(), (40, "Source Code".to_string()));
        file_type_mappings.insert("py".to_string(), (40, "Source Code".to_string()));
        file_type_mappings.insert("rs".to_string(), (40, "Source Code".to_string()));
        file_type_mappings.insert("java".to_string(), (40, "Source Code".to_string()));
        file_type_mappings.insert("cpp".to_string(), (40, "Source Code".to_string()));
        file_type_mappings.insert("c".to_string(), (40, "Source Code".to_string()));
        file_type_mappings.insert("html".to_string(), (40, "Web Files".to_string()));
        file_type_mappings.insert("css".to_string(), (40, "Web Files".to_string()));
        file_type_mappings.insert("json".to_string(), (40, "Configuration".to_string()));
        file_type_mappings.insert("xml".to_string(), (40, "Configuration".to_string()));
        file_type_mappings.insert("yaml".to_string(), (40, "Configuration".to_string()));
        file_type_mappings.insert("yml".to_string(), (40, "Configuration".to_string()));

        // Archives area (50-59)
        file_type_mappings.insert("zip".to_string(), (50, "Compressed Files".to_string()));
        file_type_mappings.insert("rar".to_string(), (50, "Compressed Files".to_string()));
        file_type_mappings.insert("7z".to_string(), (50, "Compressed Files".to_string()));
        file_type_mappings.insert("tar".to_string(), (50, "Compressed Files".to_string()));
        file_type_mappings.insert("gz".to_string(), (50, "Compressed Files".to_string()));

        Ok(Self { file_type_mappings })
    }

    pub async fn create_structure(
        &self,
        files: Vec<serde_json::Value>,
        root_path: &str,
    ) -> Result<JDStructure> {
        let mut areas_map: HashMap<u8, JDArea> = HashMap::new();
        let now = chrono::Utc::now();

        // Group files by area based on file extensions
        for file_data in files {
            let extension = file_data["extension"].as_str().unwrap_or("").to_lowercase();

            let (area_number, category_name) = self
                .file_type_mappings
                .get(&extension)
                .cloned()
                .unwrap_or((90, "Miscellaneous".to_string())); // Default to area 90

            // Get or create area
            let area = areas_map.entry(area_number).or_insert_with(|| JDArea {
                number: area_number,
                name: self.get_area_name(area_number),
                description: Some(self.get_area_description(area_number)),
                categories: Vec::new(),
            });

            // Find or create category
            let category_number = area_number + 1; // First category in area
            if let Some(category) = area.categories.iter_mut().find(|c| c.name == category_name) {
                // Add file to existing category
                if let Some(item) = category.items.first_mut() {
                    if let Some(path) = file_data["path"].as_str() {
                        item.files.push(path.to_string());
                    }
                }
            } else {
                // Create new category
                let mut category = JDCategory {
                    number: category_number,
                    name: category_name.clone(),
                    description: Some(format!("Files of type: {}", category_name)),
                    items: Vec::new(),
                };

                // Create first item in category
                let item = JDItem {
                    number: format!("{}.01", category_number),
                    name: format!("{} Files", category_name),
                    description: Some(format!(
                        "Collection of {} files",
                        category_name.to_lowercase()
                    )),
                    files: if let Some(path) = file_data["path"].as_str() {
                        vec![path.to_string()]
                    } else {
                        vec![]
                    },
                };

                category.items.push(item);
                area.categories.push(category);
            }
        }

        // Convert HashMap to sorted Vec
        let mut areas: Vec<JDArea> = areas_map.into_values().collect();
        areas.sort_by_key(|a| a.number);

        // Ensure proper numbering within each area
        for area in &mut areas {
            area.categories.sort_by_key(|c| c.number);
            for (i, category) in area.categories.iter_mut().enumerate() {
                category.number = area.number + (i as u8) + 1;

                for (j, item) in category.items.iter_mut().enumerate() {
                    item.number = format!("{}.{:02}", category.number, j + 1);
                }
            }
        }

        Ok(JDStructure {
            id: Uuid::new_v4().to_string(),
            name: "AI Generated Structure".to_string(),
            root_path: root_path.to_string(),
            areas,
            created_at: now,
            modified_at: now,
        })
    }

    pub async fn validate_structure(&self, structure: &JDStructure) -> Result<JDValidationResult> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        let mut used_area_numbers = HashSet::new();
        let mut used_category_numbers = HashSet::new();

        // Validate areas
        for area in &structure.areas {
            // Check area number range
            if area.number % 10 != 0 || area.number < 10 || area.number > 90 {
                errors.push(JDValidationError {
                    error_type: "invalid_area_number".to_string(),
                    message: format!(
                        "Area number {} is invalid. Must be 10, 20, 30, ..., 90",
                        area.number
                    ),
                    area_number: Some(area.number),
                    category_number: None,
                });
            }

            // Check for duplicate area numbers
            if used_area_numbers.contains(&area.number) {
                errors.push(JDValidationError {
                    error_type: "duplicate_area_number".to_string(),
                    message: format!("Area number {} is used multiple times", area.number),
                    area_number: Some(area.number),
                    category_number: None,
                });
            }
            used_area_numbers.insert(area.number);

            // Validate categories within area
            for category in &area.categories {
                // Check category number range
                if category.number < area.number || category.number >= area.number + 10 {
                    errors.push(JDValidationError {
                        error_type: "invalid_category_number".to_string(),
                        message: format!(
                            "Category number {} is outside valid range for area {} ({}-{})",
                            category.number,
                            area.number,
                            area.number,
                            area.number + 9
                        ),
                        area_number: Some(area.number),
                        category_number: Some(category.number),
                    });
                }

                // Check for duplicate category numbers
                if used_category_numbers.contains(&category.number) {
                    errors.push(JDValidationError {
                        error_type: "duplicate_category_number".to_string(),
                        message: format!(
                            "Category number {} is used multiple times",
                            category.number
                        ),
                        area_number: Some(area.number),
                        category_number: Some(category.number),
                    });
                }
                used_category_numbers.insert(category.number);

                // Validate items within category
                for (i, item) in category.items.iter().enumerate() {
                    let expected_number = format!("{}.{:02}", category.number, i + 1);
                    if item.number != expected_number {
                        warnings.push(JDValidationWarning {
                            warning_type: "item_numbering".to_string(),
                            message: format!(
                                "Item number {} should be {} for sequential numbering",
                                item.number, expected_number
                            ),
                            suggestion: Some(format!("Renumber to {}", expected_number)),
                        });
                    }
                }

                // Check if category has too many items (>99)
                if category.items.len() > 99 {
                    warnings.push(JDValidationWarning {
                        warning_type: "too_many_items".to_string(),
                        message: format!(
                            "Category {} has {} items. Consider splitting into multiple categories.",
                            category.number, category.items.len()
                        ),
                        suggestion: Some("Split large categories for better organization".to_string()),
                    });
                }
            }

            // Check if area has no categories
            if area.categories.is_empty() {
                warnings.push(JDValidationWarning {
                    warning_type: "empty_area".to_string(),
                    message: format!("Area {} has no categories", area.number),
                    suggestion: Some(
                        "Consider removing empty areas or adding categories".to_string(),
                    ),
                });
            }
        }

        Ok(JDValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        })
    }

    pub async fn categorize_file(
        &self,
        file_info: serde_json::Value,
        structure: &JDStructure,
    ) -> Result<CategoryAssignment> {
        let extension = file_info["extension"].as_str().unwrap_or("").to_lowercase();

        // Try to find appropriate area and category
        if let Some((area_number, category_name)) = self.file_type_mappings.get(&extension) {
            // Find the area in the structure
            if let Some(area) = structure.areas.iter().find(|a| a.number == *area_number) {
                // Find matching category
                if let Some(category) = area.categories.iter().find(|c| {
                    c.name
                        .to_lowercase()
                        .contains(&category_name.to_lowercase())
                }) {
                    // Find appropriate item or suggest new one
                    let item_number = if let Some(item) = category.items.first() {
                        item.number.clone()
                    } else {
                        format!("{}.01", category.number)
                    };

                    return Ok(CategoryAssignment {
                        area_number: *area_number,
                        category_number: category.number,
                        item_number,
                        confidence: 0.85,
                        reasoning: format!(
                            "File extension '{}' matches category '{}' in area {}",
                            extension, category_name, area_number
                        ),
                    });
                }
            }
        }

        // Fallback to miscellaneous
        Ok(CategoryAssignment {
            area_number: 90,
            category_number: 91,
            item_number: "91.01".to_string(),
            confidence: 0.5,
            reasoning: format!(
                "No specific category found for extension '{}', assigned to miscellaneous",
                extension
            ),
        })
    }

    fn get_area_name(&self, number: u8) -> String {
        match number {
            10 => "10-19 Administration".to_string(),
            20 => "20-29 Documents".to_string(),
            30 => "30-39 Media".to_string(),
            40 => "40-49 Development".to_string(),
            50 => "50-59 Archives".to_string(),
            60 => "60-69 Projects".to_string(),
            70 => "70-79 Reference".to_string(),
            80 => "80-89 Resources".to_string(),
            90 => "90-99 Miscellaneous".to_string(),
            _ => format!("{}-{} Custom Area", number, number + 9),
        }
    }

    fn get_area_description(&self, number: u8) -> String {
        match number {
            10 => "Administrative documents, policies, and organizational files".to_string(),
            20 => "Text documents, reports, presentations, and written content".to_string(),
            30 => "Images, videos, audio files, and multimedia content".to_string(),
            40 => "Source code, development tools, and programming resources".to_string(),
            50 => "Compressed files, archives, and backup collections".to_string(),
            60 => "Active projects and work-in-progress materials".to_string(),
            70 => "Reference materials, manuals, and documentation".to_string(),
            80 => "Tools, utilities, and supporting resources".to_string(),
            90 => "Uncategorized and miscellaneous files".to_string(),
            _ => "Custom area for specialized content".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_johnny_decimal_engine_new() {
        let engine = JohnnyDecimalEngine::new().unwrap();
        assert!(!engine.file_type_mappings.is_empty());
        assert_eq!(
            engine.file_type_mappings.get("pdf"),
            Some(&(20, "Reports and Documents".to_string()))
        );
    }

    #[tokio::test]
    async fn test_create_structure() {
        let engine = JohnnyDecimalEngine::new().unwrap();

        let files = vec![
            serde_json::json!({
                "path": "/test/document.pdf",
                "extension": "pdf"
            }),
            serde_json::json!({
                "path": "/test/image.jpg",
                "extension": "jpg"
            }),
        ];

        let structure = engine.create_structure(files, "/test").await.unwrap();

        assert!(!structure.areas.is_empty());
        assert!(structure.areas.iter().any(|a| a.number == 20)); // Documents
        assert!(structure.areas.iter().any(|a| a.number == 30)); // Media
    }

    #[tokio::test]
    async fn test_validate_structure() {
        let engine = JohnnyDecimalEngine::new().unwrap();

        let structure = JDStructure {
            id: "test".to_string(),
            name: "Test Structure".to_string(),
            root_path: "/test".to_string(),
            areas: vec![JDArea {
                number: 20,
                name: "Documents".to_string(),
                description: None,
                categories: vec![JDCategory {
                    number: 21,
                    name: "PDFs".to_string(),
                    description: None,
                    items: vec![],
                }],
            }],
            created_at: chrono::Utc::now(),
            modified_at: chrono::Utc::now(),
        };

        let result = engine.validate_structure(&structure).await.unwrap();
        assert!(result.is_valid);
        assert!(result.errors.is_empty());
    }
}
