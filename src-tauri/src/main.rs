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

// Zoom level constraints - shared across save/load to ensure consistency
const MIN_ZOOM: f64 = 0.5;
const MAX_ZOOM: f64 = 3.0;

/// Zoom limits structure for exposing to frontend
#[derive(Debug, Serialize, Deserialize, Clone)]
struct ZoomLimits {
    min_zoom: f64,
    max_zoom: f64,
}

/// Represents a single todo item with bullet journal semantics
#[derive(Debug, Serialize, Deserialize, Clone)]
struct TodoItem {
    id: String,
    text: String,
    completed: bool,
    created_at: DateTime<Local>,
    move_to_next_day: bool,
    /// Notes attached to this specific todo item
    #[serde(default)]
    notes: String,
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
        notes: String::new(),
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

/// Migrate calendar events to todos (one-time migration).
///
/// This function performs a one-time migration of calendar events from the old
/// calendar_events.json file to the new unified todo system. Each calendar event
/// is converted to a todo item and added to the appropriate day's data file.
///
/// # Arguments
/// * `data_dir` - Path to the app data directory
///
/// # Returns
/// A success message indicating how many events were migrated, or an error message.
///
/// # Migration Process
/// 1. Checks if calendar_events.json exists
/// 2. Loads all calendar events
/// 3. For each date with events:
///    - Loads existing day data
///    - Converts each event to a todo item
///    - Prepends todos to preserve order
///    - Saves updated day data
/// 4. Backs up original file as calendar_events.json.backup
/// 5. Removes original calendar_events.json
///
/// # Errors
/// Returns an error if:
/// - Date parsing fails
/// - File operations fail
/// - JSON serialization/deserialization fails
#[tauri::command]
async fn migrate_calendar_events_to_todos(data_dir: String) -> Result<String, String> {
    let events_file = PathBuf::from(&data_dir).join("calendar_events.json");

    // Check if calendar_events.json exists
    if !events_file.exists() {
        return Ok("No calendar events file found - migration not needed".to_string());
    }

    // Load calendar events
    let file_content = fs::read_to_string(&events_file)
        .map_err(|e| format!("Failed to read calendar events file: {}", e))?;

    let events: HashMap<String, Vec<String>> = serde_json::from_str(&file_content)
        .map_err(|e| format!("Failed to parse calendar events: {}", e))?;

    if events.is_empty() {
        // File exists but is empty - still back it up and remove it
        let backup_file = PathBuf::from(&data_dir).join("calendar_events.json.backup");
        fs::rename(&events_file, &backup_file)
            .map_err(|e| format!("Failed to backup empty calendar events file: {}", e))?;
        return Ok("Calendar events file was empty - backed up and removed".to_string());
    }

    let mut migrated_count = 0;
    let mut migrated_dates = Vec::new();

    // For each date with events
    for (date_str, event_list) in events {
        // Parse date
        let date = NaiveDate::parse_from_str(&date_str, "%Y-%m-%d").map_err(|e| {
            format!(
                "Invalid date format in calendar events: {} - {}",
                date_str, e
            )
        })?;

        // Load existing day data
        let file_path = PathBuf::from(&data_dir).join(format!("{}.json", date.format("%Y-%m-%d")));

        let mut day_data = if file_path.exists() {
            let content = fs::read_to_string(&file_path)
                .map_err(|e| format!("Failed to read day file: {}", e))?;
            serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse day data: {}", e))?
        } else {
            DayData {
                date,
                todos: Vec::new(),
                notes: String::new(),
            }
        };

        // Convert events to todos and prepend them (maintaining original order)
        let mut new_todos: Vec<TodoItem> = event_list
            .iter()
            .map(|event_text| TodoItem {
                id: Uuid::new_v4().to_string(),
                text: event_text.clone(),
                completed: false,
                created_at: Local::now(),
                move_to_next_day: false,
                notes: String::new(),
            })
            .collect();

        migrated_count += new_todos.len();

        // Prepend new todos to existing todos (events appear first)
        new_todos.extend(day_data.todos);
        day_data.todos = new_todos;

        // Save updated day data
        let json_content = serde_json::to_string_pretty(&day_data)
            .map_err(|e| format!("Failed to serialize day data: {}", e))?;

        fs::write(&file_path, json_content)
            .map_err(|e| format!("Failed to write day file: {}", e))?;

        migrated_dates.push(date_str);
    }

    // Backup original file
    let backup_file = PathBuf::from(&data_dir).join("calendar_events.json.backup");
    fs::rename(&events_file, &backup_file)
        .map_err(|e| format!("Failed to backup calendar events file: {}", e))?;

    Ok(format!(
        "Successfully migrated {} calendar events from {} days to todos. Backup saved as calendar_events.json.backup",
        migrated_count,
        migrated_dates.len()
    ))
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

/// Get zoom limits for the frontend.
///
/// This ensures the frontend and backend always use the same zoom range,
/// preventing potential mismatches.
///
/// # Returns
/// ZoomLimits structure with min and max zoom values.
#[tauri::command]
fn get_zoom_limits() -> ZoomLimits {
    ZoomLimits {
        min_zoom: MIN_ZOOM,
        max_zoom: MAX_ZOOM,
    }
}

/// Get the application version from the package configuration.
///
/// This retrieves the version defined in Cargo.toml at compile time,
/// ensuring the UI always displays the correct version number.
///
/// # Returns
/// A string containing the version number (e.g., "1.3.1")
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Open a URL in the default browser
///
/// # Arguments
/// * `url` - The URL to open
/// * `app` - The Tauri app handle
///
/// # Returns
/// Ok(()) if successful, error message if failed
#[tauri::command]
async fn open_url_in_browser(url: String, app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;

    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| format!("Failed to open URL: {}", e))?;

    Ok(())
}

/// Internal helper: Save zoom preference to a file path
///
/// This function is extracted for testing purposes.
fn save_zoom_preference_to_path(zoom_level: f64, file_path: PathBuf) -> Result<(), String> {
    // Validate zoom level is finite
    if !zoom_level.is_finite() {
        return Err(format!(
            "Invalid zoom level: {}. Must be a finite number between {} and {}",
            zoom_level, MIN_ZOOM, MAX_ZOOM
        ));
    }

    // Clamp to supported range to ensure consistency
    let validated_zoom = zoom_level.clamp(MIN_ZOOM, MAX_ZOOM);

    let json_content = serde_json::json!({ "zoom_level": validated_zoom });
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

        // Clamp to supported range; log warning if clamping occurs
        let zoom_level = if (MIN_ZOOM..=MAX_ZOOM).contains(&zoom_level) {
            zoom_level
        } else {
            #[cfg(debug_assertions)]
            eprintln!(
                "Warning: Stored zoom level {} is out of range [{}, {}], resetting to 1.0",
                zoom_level, MIN_ZOOM, MAX_ZOOM
            );
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
            .plugin(tauri_plugin_opener::init())
            .invoke_handler(tauri::generate_handler![
                get_app_data_dir,
                load_day_data,
                save_day_data,
                create_todo_item,
                start_pomodoro_timer,
                stop_pomodoro_timer,
                send_notification,
                migrate_calendar_events_to_todos,
                save_dark_mode_preference,
                load_dark_mode_preference,
                save_zoom_preference,
                load_zoom_preference,
                get_zoom_limits,
                get_app_version,
                open_url_in_browser
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
        assert_eq!(todo.notes, ""); // New field should default to empty string
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
    async fn test_migrate_calendar_events_no_file() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();

        // No calendar_events.json file exists
        let result = migrate_calendar_events_to_todos(data_dir).await;

        assert!(result.is_ok());
        assert!(result.unwrap().contains("migration not needed"));
    }

    #[tokio::test]
    async fn test_migrate_calendar_events_empty_file() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();

        // Create empty calendar events file directly
        let empty_events: HashMap<String, Vec<String>> = HashMap::new();
        let file_path = temp_dir.path().join("calendar_events.json");
        let json_content = serde_json::to_string_pretty(&empty_events).unwrap();
        fs::write(&file_path, json_content).unwrap();

        // Run migration
        let result = migrate_calendar_events_to_todos(data_dir.clone()).await;

        assert!(result.is_ok());
        assert!(result.unwrap().contains("empty"));

        // Verify backup was created
        let backup_path = temp_dir.path().join("calendar_events.json.backup");
        assert!(backup_path.exists());

        // Verify original was removed
        assert!(!file_path.exists());
    }

    #[tokio::test]
    async fn test_migrate_calendar_events_to_new_todos() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();

        // Create calendar events file directly
        let mut events = HashMap::new();
        events.insert(
            "2024-01-15".to_string(),
            vec!["Meeting at 2pm".to_string(), "Call dentist".to_string()],
        );
        events.insert("2024-01-16".to_string(), vec!["Submit report".to_string()]);

        // Write events file directly
        let file_path = temp_dir.path().join("calendar_events.json");
        let json_content = serde_json::to_string_pretty(&events).unwrap();
        fs::write(&file_path, json_content).unwrap();

        // Run migration
        let result = migrate_calendar_events_to_todos(data_dir.clone()).await;

        assert!(result.is_ok());
        let message = result.unwrap();
        assert!(message.contains("3 calendar events")); // Total events
        assert!(message.contains("2 days")); // Number of days

        // Verify todos were created for 2024-01-15
        let day_data = load_day_data("2024-01-15".to_string(), data_dir.clone())
            .await
            .unwrap();
        assert_eq!(day_data.todos.len(), 2);
        assert_eq!(day_data.todos[0].text, "Meeting at 2pm");
        assert_eq!(day_data.todos[1].text, "Call dentist");
        assert!(!day_data.todos[0].completed);
        assert!(!day_data.todos[1].completed);

        // Verify todos were created for 2024-01-16
        let day_data2 = load_day_data("2024-01-16".to_string(), data_dir.clone())
            .await
            .unwrap();
        assert_eq!(day_data2.todos.len(), 1);
        assert_eq!(day_data2.todos[0].text, "Submit report");

        // Verify backup was created
        let backup_path = temp_dir.path().join("calendar_events.json.backup");
        assert!(backup_path.exists());

        // Verify original was removed
        let original_path = temp_dir.path().join("calendar_events.json");
        assert!(!original_path.exists());
    }

    #[tokio::test]
    async fn test_migrate_calendar_events_merge_with_existing_todos() {
        let temp_dir = setup_test_dir();
        let data_dir = temp_dir.path().to_string_lossy().to_string();

        // Create existing todo for 2024-01-15
        let existing_day = DayData {
            date: NaiveDate::from_ymd_opt(2024, 1, 15).unwrap(),
            todos: vec![TodoItem {
                id: Uuid::new_v4().to_string(),
                text: "Existing todo".to_string(),
                completed: true,
                created_at: Local::now(),
                move_to_next_day: false,
                notes: String::new(),
            }],
            notes: "Existing notes".to_string(),
        };

        save_day_data(existing_day, data_dir.clone()).await.unwrap();

        // Create calendar events file directly
        let mut events = HashMap::new();
        events.insert(
            "2024-01-15".to_string(),
            vec![
                "Calendar event 1".to_string(),
                "Calendar event 2".to_string(),
            ],
        );

        let file_path = temp_dir.path().join("calendar_events.json");
        let json_content = serde_json::to_string_pretty(&events).unwrap();
        fs::write(&file_path, json_content).unwrap();

        // Run migration
        let result = migrate_calendar_events_to_todos(data_dir.clone()).await;

        assert!(result.is_ok());

        // Verify todos were merged (calendar events prepended)
        let day_data = load_day_data("2024-01-15".to_string(), data_dir.clone())
            .await
            .unwrap();
        assert_eq!(day_data.todos.len(), 3);

        // Calendar events should be first (prepended)
        assert_eq!(day_data.todos[0].text, "Calendar event 1");
        assert_eq!(day_data.todos[1].text, "Calendar event 2");

        // Existing todo should be last
        assert_eq!(day_data.todos[2].text, "Existing todo");
        assert!(day_data.todos[2].completed); // Preserved completion status

        // Existing notes should be preserved
        assert_eq!(day_data.notes, "Existing notes");
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

        // Test invalid values (NaN, infinity) are rejected
        assert!(save_zoom_preference_to_path(f64::NAN, file_path.clone()).is_err());
        assert!(save_zoom_preference_to_path(f64::INFINITY, file_path.clone()).is_err());
        assert!(save_zoom_preference_to_path(f64::NEG_INFINITY, file_path.clone()).is_err());

        // Test out-of-range values are clamped
        save_zoom_preference_to_path(10.0, file_path.clone()).unwrap();
        let loaded = load_zoom_preference_from_path(file_path.clone()).unwrap();
        assert_eq!(loaded, 3.0); // Clamped to MAX_ZOOM

        save_zoom_preference_to_path(-1.0, file_path.clone()).unwrap();
        let loaded = load_zoom_preference_from_path(file_path.clone()).unwrap();
        assert_eq!(loaded, 0.5); // Clamped to MIN_ZOOM

        save_zoom_preference_to_path(0.4, file_path.clone()).unwrap();
        let loaded = load_zoom_preference_from_path(file_path.clone()).unwrap();
        assert_eq!(loaded, 0.5); // Clamped to MIN_ZOOM

        save_zoom_preference_to_path(3.1, file_path.clone()).unwrap();
        let loaded = load_zoom_preference_from_path(file_path.clone()).unwrap();
        assert_eq!(loaded, 3.0); // Clamped to MAX_ZOOM

        // Test edge cases at boundaries work correctly
        assert!(save_zoom_preference_to_path(0.5, file_path.clone()).is_ok());
        assert!(save_zoom_preference_to_path(3.0, file_path).is_ok());
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
