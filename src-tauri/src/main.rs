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

#[derive(Debug, Serialize, Deserialize, Clone)]
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
    // Only run the Tauri app if we're not in test mode
    #[cfg(not(test))]
    {
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
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use chrono::NaiveDate;

    fn setup_test_dir() -> TempDir {
        TempDir::new().expect("Failed to create temp directory")
    }

    #[tokio::test]
    async fn test_create_todo_item() {
        let text = "Test todo item".to_string();
        let result = create_todo_item(text.clone()).await;
        
        assert!(result.is_ok());
        let todo = result.unwrap();
        
        assert_eq!(todo.text, text);
        assert!(!todo.completed);
        assert!(!todo.move_to_next_day);
        assert!(!todo.id.is_empty());
        assert!(uuid::Uuid::parse_str(&todo.id).is_ok());
    }

    #[tokio::test]
    async fn test_save_and_load_day_data() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();
        let date = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        
        // Create test todo item
        let todo = create_todo_item("Test todo".to_string()).await.unwrap();
        
        // Create test day data
        let day_data = DayData {
            date,
            todos: vec![todo.clone()],
            notes: "Test notes".to_string(),
        };
        
        // Save the data
        let save_result = save_day_data(day_data.clone(), data_dir.clone()).await;
        assert!(save_result.is_ok());
        
        // Load the data back
        let load_result = load_day_data("2024-01-15".to_string(), data_dir).await;
        assert!(load_result.is_ok());
        
        let loaded_data = load_result.unwrap();
        assert_eq!(loaded_data.date, date);
        assert_eq!(loaded_data.notes, "Test notes");
        assert_eq!(loaded_data.todos.len(), 1);
        assert_eq!(loaded_data.todos[0].text, todo.text);
        assert_eq!(loaded_data.todos[0].id, todo.id);
    }

    #[tokio::test]
    async fn test_load_nonexistent_day_data() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();
        
        let result = load_day_data("2024-01-15".to_string(), data_dir).await;
        assert!(result.is_ok());
        
        let day_data = result.unwrap();
        assert_eq!(day_data.date, NaiveDate::from_ymd_opt(2024, 1, 15).unwrap());
        assert!(day_data.todos.is_empty());
        assert!(day_data.notes.is_empty());
    }

    #[tokio::test]
    async fn test_invalid_date_format() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();
        
        let result = load_day_data("invalid-date".to_string(), data_dir).await;
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid date format"));
    }

    #[tokio::test]
    async fn test_save_day_data_creates_file() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();
        let date = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        
        let day_data = DayData {
            date,
            todos: vec![],
            notes: "Test".to_string(),
        };
        
        let result = save_day_data(day_data, data_dir.clone()).await;
        assert!(result.is_ok());
        
        // Check that file was created
        let file_path = std::path::PathBuf::from(data_dir).join("2024-01-15.json");
        assert!(file_path.exists());
    }

    #[tokio::test]
    async fn test_todo_item_serialization() {
        let todo = create_todo_item("Test".to_string()).await.unwrap();
        
        // Test serialization
        let json = serde_json::to_string(&todo);
        assert!(json.is_ok());
        
        // Test deserialization
        let deserialized: Result<TodoItem, _> = serde_json::from_str(&json.unwrap());
        assert!(deserialized.is_ok());
        
        let deserialized_todo = deserialized.unwrap();
        assert_eq!(deserialized_todo.text, todo.text);
        assert_eq!(deserialized_todo.id, todo.id);
        assert_eq!(deserialized_todo.completed, todo.completed);
    }

    #[tokio::test]
    async fn test_day_data_serialization() {
        let todo = create_todo_item("Test".to_string()).await.unwrap();
        let day_data = DayData {
            date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            todos: vec![todo],
            notes: "Test notes".to_string(),
        };
        
        // Test serialization
        let json = serde_json::to_string(&day_data);
        assert!(json.is_ok());
        
        // Test deserialization
        let deserialized: Result<DayData, _> = serde_json::from_str(&json.unwrap());
        assert!(deserialized.is_ok());
        
        let deserialized_data = deserialized.unwrap();
        assert_eq!(deserialized_data.date, day_data.date);
        assert_eq!(deserialized_data.notes, day_data.notes);
        assert_eq!(deserialized_data.todos.len(), 1);
    }

    #[test]
    fn test_todo_item_defaults() {
        let text = "Test todo".to_string();
        let rt = tokio::runtime::Runtime::new().unwrap();
        let todo = rt.block_on(create_todo_item(text.clone())).unwrap();
        
        assert_eq!(todo.text, text);
        assert!(!todo.completed);
        assert!(!todo.move_to_next_day);
        assert!(!todo.id.is_empty());
        
        // Verify UUID format
        assert!(uuid::Uuid::parse_str(&todo.id).is_ok());
        
        // Verify timestamp is recent (within last minute)
        let now = Local::now();
        let time_diff = now.signed_duration_since(todo.created_at);
        assert!(time_diff.num_seconds() < 60);
        assert!(time_diff.num_seconds() >= 0);
    }

    #[tokio::test]
    async fn test_multiple_todos_same_day() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();
        let date = NaiveDate::from_ymd_opt(2024, 1, 15).unwrap();
        
        // Create multiple todos
        let todo1 = create_todo_item("First todo".to_string()).await.unwrap();
        let todo2 = create_todo_item("Second todo".to_string()).await.unwrap();
        let mut todo3 = create_todo_item("Third todo".to_string()).await.unwrap();
        todo3.completed = true; // Mark one as completed
        
        let day_data = DayData {
            date,
            todos: vec![todo1.clone(), todo2.clone(), todo3.clone()],
            notes: "Multiple todos test".to_string(),
        };
        
        // Save and reload
        save_day_data(day_data, data_dir.clone()).await.unwrap();
        let loaded = load_day_data("2024-01-15".to_string(), data_dir).await.unwrap();
        
        assert_eq!(loaded.todos.len(), 3);
        assert_eq!(loaded.todos[0].text, todo1.text);
        assert_eq!(loaded.todos[1].text, todo2.text);
        assert_eq!(loaded.todos[2].text, todo3.text);
        assert!(!loaded.todos[0].completed);
        assert!(!loaded.todos[1].completed);
        assert!(loaded.todos[2].completed);
    }

    #[tokio::test] 
    async fn test_empty_todo_text() {
        let result = create_todo_item("".to_string()).await;
        assert!(result.is_ok());
        
        let todo = result.unwrap();
        assert_eq!(todo.text, "");
        // Should still create valid todo even with empty text
        assert!(!todo.id.is_empty());
    }

    #[tokio::test]
    async fn test_very_long_todo_text() {
        let long_text = "x".repeat(10000);
        let result = create_todo_item(long_text.clone()).await;
        assert!(result.is_ok());
        
        let todo = result.unwrap();
        assert_eq!(todo.text, long_text);
    }

    #[tokio::test]
    async fn test_special_characters_in_todo() {
        let special_text = "Todo with 特殊字符 and émojis 🚀 and \"quotes\" and 'apostrophes'";
        let result = create_todo_item(special_text.to_string()).await;
        assert!(result.is_ok());
        
        let todo = result.unwrap();
        assert_eq!(todo.text, special_text);
        
        // Test serialization/deserialization with special characters
        let json = serde_json::to_string(&todo).unwrap();
        let deserialized: TodoItem = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.text, special_text);
    }
}