// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Window, Emitter};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use chrono::{DateTime, Local, NaiveDate};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct TodoItem {
    id: String,
    text: String,
    completed: bool,
    created_at: DateTime<Local>,
    move_to_next_day: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct DayData {
    date: NaiveDate,
    todos: Vec<TodoItem>,
    notes: String,
}

// Get the app data directory
#[tauri::command]
async fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    
    // Create the directory if it doesn't exist
    fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data directory: {}", e))?;
    
    Ok(data_dir.to_string_lossy().to_string())
}

// Load data for a specific date
#[tauri::command]
async fn load_day_data(date: String, data_dir: String) -> Result<DayData, String> {
    let date = NaiveDate::parse_from_str(&date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format: {}", e))?;
    
    let file_path = PathBuf::from(data_dir).join(format!("{}.json", date.format("%Y-%m-%d")));
    
    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        let day_data: DayData = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;
        
        Ok(day_data)
    } else {
        // Create new day data if file doesn't exist
        Ok(DayData {
            date,
            todos: Vec::new(),
            notes: String::new(),
        })
    }
}

// Save data for the current day
#[tauri::command]
async fn save_day_data(day_data: DayData, data_dir: String) -> Result<(), String> {
    let file_path = PathBuf::from(data_dir).join(format!("{}.json", day_data.date.format("%Y-%m-%d")));
    
    let json_content = serde_json::to_string_pretty(&day_data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;
    
    fs::write(&file_path, json_content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

// Create a new todo item
#[tauri::command]
async fn create_todo_item(text: String) -> Result<TodoItem, String> {
    let now = Local::now();
    let todo = TodoItem {
        id: Uuid::new_v4().to_string(),
        text,
        completed: false,
        created_at: now,
        move_to_next_day: false,
    };
    
    Ok(todo)
}

// Start pomodoro timer with notifications (no window resizing)
#[tauri::command]
async fn start_pomodoro_timer(duration_minutes: u32, task_text: String, window: Window) -> Result<(), String> {
    let duration = std::time::Duration::from_secs(duration_minutes as u64 * 60);
    
    // Don't resize window - just start the timer
    // The frontend will handle the UI overlay
    
    // Start timer in background
    tokio::spawn(async move {
        tokio::time::sleep(duration).await;
        
        // Emit pomodoro complete event
        if let Err(e) = window.emit("pomodoro-complete", &task_text) {
            eprintln!("Failed to emit pomodoro-complete event: {}", e);
        }
    });
    
    Ok(())
}

// Send system notification
#[tauri::command]
async fn send_notification(title: String, body: String, app: tauri::AppHandle) -> Result<(), String> {
    // For Tauri v2, we'll emit an event that the frontend can handle with the Notification API
    app.emit("show-notification", serde_json::json!({
        "title": title,
        "body": body
    })).map_err(|e| format!("Failed to emit notification event: {}", e))?;
    
    Ok(())
}

// Stop pomodoro timer
#[tauri::command]
async fn stop_pomodoro_timer() -> Result<(), String> {
    // Just acknowledge the stop - no window resizing needed
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_data_dir,
            load_day_data,
            save_day_data,
            create_todo_item,
            start_pomodoro_timer,
            stop_pomodoro_timer,
            send_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}