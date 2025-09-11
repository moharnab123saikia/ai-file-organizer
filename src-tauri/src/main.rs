// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_service;
mod commands;
mod database;
mod error;
mod file_operations;
mod johnny_decimal;

use commands::*;
use error::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            get_app_info,
            health_check,
            test_scan_files,
            test_ai_analysis
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
