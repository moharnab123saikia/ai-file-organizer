// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
mod file_operations;
mod ai_service;
mod johnny_decimal;
mod database;

use error::Result;

// Simple test command to verify Tauri is working
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
    Ok(())
}