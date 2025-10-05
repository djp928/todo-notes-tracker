// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Clippy: Tauri command functions appear unused but are called by the frontend
#![allow(dead_code)]

use chrono::{DateTime, Local, NaiveDate};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::{Emitter, Manager, Window};
use uuid::Uuid;

/// Represents a single todo item with bullet journal semantics
#[derive(Debug, Serialize, Deserialize, Clone)]
struct TodoItem {
    id: String,
    text: String,
    completed: bool,
    created_at: DateTime<Local>,
    move_to_next_day: bool,
}

/// Represents all data for a single day
#[derive(Debug, Serialize, Deserialize, Clone)]
struct DayData {
    date: NaiveDate,
    todos: Vec<TodoItem>,
    notes: String,
}

/// Get the application data directory, creating it if necessary.
///
/// # Returns
/// The absolute path to the app data directory as a String.
///
/// # Errors
/// Returns an error if the directory cannot be accessed or created.
#[tauri::command]
async fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create the directory if it doesn't exist
    fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;

    Ok(data_dir.to_string_lossy().to_string())
}

/// Load data for a specific date from persistent storage.
///
/// # Arguments
/// * `date` - Date string in YYYY-MM-DD format
/// * `data_dir` - Path to the app data directory
///
/// # Returns
/// DayData for the requested date, or empty data if file doesn't exist.
///
/// # Errors
/// Returns an error if date format is invalid or file cannot be read.
#[tauri::command]
async fn load_day_data(date: String, data_dir: String) -> Result<DayData, String> {
    let date = NaiveDate::parse_from_str(&date, "%Y-%m-%d")
        .map_err(|e| format!("Invalid date format: {}", e))?;

    let file_path = PathBuf::from(data_dir).join(format!("{}.json", date.format("%Y-%m-%d")));

    if file_path.exists() {
        let content =
            fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

        let day_data: DayData =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

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

/// Save data for a specific day to persistent storage.
///
/// # Arguments
/// * `day_data` - The complete data for the day to save
/// * `data_dir` - Path to the app data directory
///
/// # Errors
/// Returns an error if serialization fails or file cannot be written.
#[tauri::command]
async fn save_day_data(day_data: DayData, data_dir: String) -> Result<(), String> {
    let file_path =
        PathBuf::from(data_dir).join(format!("{}.json", day_data.date.format("%Y-%m-%d")));

    let json_content = serde_json::to_string_pretty(&day_data)
        .map_err(|e| format!("Failed to serialize data: {}", e))?;

    fs::write(&file_path, json_content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

/// Create a new todo item with a unique ID and timestamp.
///
/// # Arguments
/// * `text` - The todo item text/description
///
/// # Returns
/// A new TodoItem with generated ID and current timestamp.
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

/// Start a pomodoro timer for a specific duration.
///
/// The timer runs asynchronously and emits a "pomodoro-complete" event when finished.
///
/// # Arguments
/// * `duration_minutes` - Timer duration in minutes
/// * `task_text` - Description of the task being timed
/// * `window` - Tauri window handle for emitting completion event
///
/// # Returns
/// Ok(()) immediately after starting the timer (non-blocking).
#[tauri::command]
async fn start_pomodoro_timer(
    duration_minutes: u32,
    task_text: String,
    window: Window,
) -> Result<(), String> {
    let duration = std::time::Duration::from_secs(duration_minutes as u64 * 60);

    // Don't resize window - just start the timer
    // The frontend will handle the UI overlay

    // Start timer in background
    tokio::spawn(async move {
        tokio::time::sleep(duration).await;

        // Emit pomodoro complete event
        // Note: Errors are logged but don't block the timer completion
        if let Err(e) = window.emit("pomodoro-complete", &task_text) {
            // Log to stderr in debug mode, silent in release
            #[cfg(debug_assertions)]
            eprintln!("Failed to emit pomodoro-complete event: {}", e);

            // Suppress the error - we tried to notify but UI might have closed
            let _ = e;
        }
    });

    Ok(())
}

/// Send a system notification (macOS/Windows/Linux).
///
/// # Arguments
/// * `title` - Notification title
/// * `body` - Notification body text
///
/// # Errors
/// Returns an error if notification cannot be sent.
#[tauri::command]
async fn send_notification(
    title: String,
    body: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // For Tauri v2, we'll emit an event that the frontend can handle with the Notification API
    app.emit(
        "show-notification",
        serde_json::json!({
            "title": title,
            "body": body
        }),
    )
    .map_err(|e| format!("Failed to emit notification event: {}", e))?;

    Ok(())
}

/// Stop the currently running pomodoro timer.
///
/// # Errors
/// Returns an error if stopping the timer fails.
#[tauri::command]
async fn stop_pomodoro_timer() -> Result<(), String> {
    // Just acknowledge the stop - no window resizing needed
    Ok(())
}

// Save calendar events to persistent storage
#[tauri::command]
async fn save_calendar_events(
    events: HashMap<String, Vec<String>>,
    data_dir: String,
) -> Result<(), String> {
    let file_path = PathBuf::from(data_dir).join("calendar_events.json");

    let json_content = serde_json::to_string_pretty(&events)
        .map_err(|e| format!("Failed to serialize calendar events: {}", e))?;

    fs::write(&file_path, json_content)
        .map_err(|e| format!("Failed to write calendar events file: {}", e))?;

    Ok(())
}

// Load calendar events from persistent storage
#[tauri::command]
async fn load_calendar_events(data_dir: String) -> Result<HashMap<String, Vec<String>>, String> {
    let file_path = PathBuf::from(data_dir).join("calendar_events.json");

    if file_path.exists() {
        let file_content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read calendar events file: {}", e))?;

        let events: HashMap<String, Vec<String>> = serde_json::from_str(&file_content)
            .map_err(|e| format!("Failed to parse calendar events: {}", e))?;

        Ok(events)
    } else {
        // Return empty HashMap if file doesn't exist
        Ok(HashMap::new())
    }
}

/// Save user's dark mode preference.
///
/// # Arguments
/// * `dark_mode` - True for dark mode, false for light mode
/// * `app` - Tauri app handle for accessing app data directory
///
/// # Errors
/// Returns an error if preference cannot be saved.
#[tauri::command]
fn save_dark_mode_preference(dark_mode: bool, app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let file_path = data_dir.join("dark_mode.json");

    let json_content = serde_json::json!({ "dark_mode": dark_mode });
    let json_str = serde_json::to_string_pretty(&json_content)
        .map_err(|e| format!("Failed to serialize dark mode preference: {}", e))?;

    fs::write(&file_path, json_str)
        .map_err(|e| format!("Failed to write dark mode preference file: {}", e))?;

    Ok(())
}

/// Load user's dark mode preference.
///
/// # Arguments
/// * `app` - Tauri app handle for accessing app data directory
///
/// # Returns
/// True if dark mode is preferred, false otherwise (defaults to light mode).
///
/// # Errors
/// Returns an error if preference file cannot be read.
#[tauri::command]
fn load_dark_mode_preference(app: tauri::AppHandle) -> Result<bool, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let file_path = data_dir.join("dark_mode.json");

    if file_path.exists() {
        let file_content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read dark mode preference file: {}", e))?;

        let json: serde_json::Value = serde_json::from_str(&file_content)
            .map_err(|e| format!("Failed to parse dark mode preference: {}", e))?;

        let dark_mode = json
            .get("dark_mode")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        Ok(dark_mode)
    } else {
        // Return false (light mode) if file doesn't exist
        Ok(false)
    }
}

/// Internal helper: Save zoom preference to a file path
///
/// This function is extracted for testing purposes.
fn save_zoom_preference_to_path(zoom_level: f64, file_path: PathBuf) -> Result<(), String> {
    // Validate and clamp zoom level before saving to ensure consistency
    let zoom_level = if zoom_level.is_finite() && (0.5..=3.0).contains(&zoom_level) {
        zoom_level
    } else {
        // Reject invalid values with an error
        return Err(format!(
            "Invalid zoom level: {}. Must be between 0.5 and 3.0",
            zoom_level
        ));
    };

    let json_content = serde_json::json!({ "zoom_level": zoom_level });
    let json_str = serde_json::to_string_pretty(&json_content)
        .map_err(|e| format!("Failed to serialize zoom preference: {}", e))?;

    fs::write(&file_path, json_str)
        .map_err(|e| format!("Failed to write zoom preference file: {}", e))?;

    Ok(())
}

/// Internal helper: Load zoom preference from a file path
///
/// This function is extracted for testing purposes.
fn load_zoom_preference_from_path(file_path: PathBuf) -> Result<f64, String> {
    if file_path.exists() {
        let file_content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read zoom preference file: {}", e))?;

        let json: serde_json::Value = serde_json::from_str(&file_content)
            .map_err(|e| format!("Failed to parse zoom preference: {}", e))?;

        let zoom_level = json
            .get("zoom_level")
            .and_then(|v| v.as_f64())
            .unwrap_or(1.0);

        // Clamp to supported range [0.5, 3.0]; fall back to 1.0 if out of range
        let zoom_level = if (0.5..=3.0).contains(&zoom_level) {
            zoom_level
        } else {
            1.0
        };

        Ok(zoom_level)
    } else {
        // Return 1.0 (100% zoom) if file doesn't exist
        Ok(1.0)
    }
}

/// Save user's zoom level preference.
///
/// # Arguments
/// * `zoom_level` - Zoom level as a floating point number (e.g., 1.0 for 100%)
/// * `app` - Tauri app handle for accessing app data directory
///
/// # Errors
/// Returns an error if preference cannot be saved.
#[tauri::command]
fn save_zoom_preference(zoom_level: f64, app: tauri::AppHandle) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let file_path = data_dir.join("zoom_level.json");
    save_zoom_preference_to_path(zoom_level, file_path)
}

/// Load user's zoom level preference.
///
/// # Arguments
/// * `app` - Tauri app handle for accessing app data directory
///
/// # Returns
/// Zoom level as a floating point number. Defaults to 1.0 (100%) if not set.
///
/// # Errors
/// Returns an error if preference file cannot be read.
#[tauri::command]
fn load_zoom_preference(app: tauri::AppHandle) -> Result<f64, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let file_path = data_dir.join("zoom_level.json");
    load_zoom_preference_from_path(file_path)
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
                send_notification,
                save_calendar_events,
                load_calendar_events,
                save_dark_mode_preference,
                load_dark_mode_preference,
                save_zoom_preference,
                load_zoom_preference
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use tempfile::TempDir;

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
        let loaded = load_day_data("2024-01-15".to_string(), data_dir)
            .await
            .unwrap();

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

    #[tokio::test]
    async fn test_save_and_load_calendar_events() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();

        // Create test calendar events
        let mut events = HashMap::new();
        events.insert(
            "2024-01-15".to_string(),
            vec!["Meeting".to_string(), "Lunch".to_string()],
        );
        events.insert("2024-01-16".to_string(), vec!["Dentist".to_string()]);

        // Save calendar events
        let save_result = save_calendar_events(events.clone(), data_dir.clone()).await;
        assert!(save_result.is_ok());

        // Load calendar events back
        let load_result = load_calendar_events(data_dir).await;
        assert!(load_result.is_ok());

        let loaded_events = load_result.unwrap();
        assert_eq!(loaded_events.len(), 2);
        assert_eq!(
            loaded_events.get("2024-01-15").unwrap(),
            &vec!["Meeting".to_string(), "Lunch".to_string()]
        );
        assert_eq!(
            loaded_events.get("2024-01-16").unwrap(),
            &vec!["Dentist".to_string()]
        );
    }

    #[tokio::test]
    async fn test_load_nonexistent_calendar_events() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();

        // Try to load calendar events from empty directory
        let result = load_calendar_events(data_dir).await;
        assert!(result.is_ok());

        let events = result.unwrap();
        assert!(events.is_empty());
    }

    #[tokio::test]
    async fn test_calendar_events_persistence() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();

        // Save some events
        let mut events1 = HashMap::new();
        events1.insert("2024-01-15".to_string(), vec!["Event 1".to_string()]);
        save_calendar_events(events1, data_dir.clone())
            .await
            .unwrap();

        // Load and modify
        let mut loaded_events = load_calendar_events(data_dir.clone()).await.unwrap();
        loaded_events.insert("2024-01-16".to_string(), vec!["Event 2".to_string()]);

        // Save modified events
        save_calendar_events(loaded_events.clone(), data_dir.clone())
            .await
            .unwrap();

        // Load again and verify
        let final_events = load_calendar_events(data_dir).await.unwrap();
        assert_eq!(final_events.len(), 2);
        assert!(final_events.contains_key("2024-01-15"));
        assert!(final_events.contains_key("2024-01-16"));
    }

    #[test]
    fn test_save_and_load_zoom_preference() {
        let temp_dir = setup_test_dir();
        let file_path = temp_dir.path().join("zoom_level.json");

        // Test saving zoom level using the internal helper
        let zoom_level = 1.5;
        save_zoom_preference_to_path(zoom_level, file_path.clone()).unwrap();

        // Test loading zoom level using the internal helper
        let loaded_zoom = load_zoom_preference_from_path(file_path.clone()).unwrap();
        assert_eq!(loaded_zoom, zoom_level);
    }

    #[test]
    fn test_zoom_preference_default_value() {
        let temp_dir = setup_test_dir();
        let file_path = temp_dir.path().join("zoom_level.json");

        // File doesn't exist, should default to 1.0
        assert!(!file_path.exists());

        // Use the internal helper to load zoom preference
        let default_zoom = load_zoom_preference_from_path(file_path).unwrap();
        assert_eq!(default_zoom, 1.0);
    }

    #[test]
    fn test_zoom_preference_boundary_values() {
        let temp_dir = setup_test_dir();
        let file_path = temp_dir.path().join("zoom_level.json");

        // Test minimum zoom (0.5)
        save_zoom_preference_to_path(0.5, file_path.clone()).unwrap();
        let loaded = load_zoom_preference_from_path(file_path.clone()).unwrap();
        assert_eq!(loaded, 0.5);

        // Test maximum zoom (3.0)
        save_zoom_preference_to_path(3.0, file_path.clone()).unwrap();
        let loaded = load_zoom_preference_from_path(file_path.clone()).unwrap();
        assert_eq!(loaded, 3.0);

        // Test normal zoom (1.0)
        save_zoom_preference_to_path(1.0, file_path.clone()).unwrap();
        let loaded = load_zoom_preference_from_path(file_path).unwrap();
        assert_eq!(loaded, 1.0);
    }

    #[test]
    fn test_zoom_preference_validation() {
        let temp_dir = setup_test_dir();
        let file_path = temp_dir.path().join("zoom_level.json");

        // Test invalid values are rejected
        assert!(save_zoom_preference_to_path(10.0, file_path.clone()).is_err());
        assert!(save_zoom_preference_to_path(-1.0, file_path.clone()).is_err());
        assert!(save_zoom_preference_to_path(f64::NAN, file_path.clone()).is_err());
        assert!(save_zoom_preference_to_path(f64::INFINITY, file_path.clone()).is_err());

        // Test edge cases at boundaries
        assert!(save_zoom_preference_to_path(0.4, file_path.clone()).is_err()); // Just below min
        assert!(save_zoom_preference_to_path(3.1, file_path.clone()).is_err()); // Just above max
        assert!(save_zoom_preference_to_path(0.5, file_path.clone()).is_ok()); // Exactly min
        assert!(save_zoom_preference_to_path(3.0, file_path).is_ok()); // Exactly max
    }

    #[test]
    fn test_zoom_preference_persistence() {
        let temp_dir = setup_test_dir();
        let file_path = temp_dir.path().join("zoom_level.json");

        // Save zoom level multiple times using the internal helper
        for zoom in [0.5, 0.8, 1.0, 1.5, 2.0, 3.0] {
            save_zoom_preference_to_path(zoom, file_path.clone()).unwrap();

            // Verify it was saved correctly
            let loaded = load_zoom_preference_from_path(file_path.clone()).unwrap();
            assert_eq!(loaded, zoom);
        }
    }
}
