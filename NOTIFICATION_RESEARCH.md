# Pomodoro Notification Research

## Objective
Add system notifications and/or window focus to the Pomodoro timer completion to ensure users don't miss the alert.

## Current Implementation
- Title flashing: Changes document.title to "🍅 TIMER DONE! 🍅"
- Background color flash: Red flash for 1 second
- Modal dialog: Custom alert that requires user interaction
- **Problem**: If window is not in focus, these are easily missed

## Platform Requirements
- **macOS**: System notifications via Notification Center
- **Windows**: System notifications via Windows 10/11 notification system
- **Linux**: System notifications via libnotify/D-Bus

## Tauri v2 Solutions

### Option 1: tauri-plugin-notification (RECOMMENDED)
**Package**: `tauri-plugin-notification = "2.3.1"`
**Documentation**: https://docs.rs/tauri-plugin-notification/

**Capabilities**:
- ✅ Cross-platform (macOS, Windows, Linux)
- ✅ System-level notifications
- ✅ Notification icons
- ✅ Notification sounds (system default)
- ✅ Persistent notifications (stay in notification center)
- ✅ Permission handling (automatic on most platforms)

**Features**:
- `windows7-compat`: Support for Windows 7 notifications
- Native system integration on all platforms

**Example Usage**:
```rust
use tauri_plugin_notification::NotificationExt;

app.notification()
    .builder()
    .title("Pomodoro Complete!")
    .body("Great job! Time for a well-deserved break! 🎉")
    .show()
    .map_err(|e| format!("Failed to show notification: {}", e))?;
```

### Option 2: Window Focus (FALLBACK)
**Tauri Core API**: Window management built-in

**Capabilities**:
- ✅ Force window to front (`set_focus()`)
- ✅ Request user attention (`request_user_attention()`)
- ✅ Flash window in taskbar
- ✅ Always on top temporarily

**Example Usage**:
```rust
use tauri::Manager;

let window = app.get_webview_window("main").unwrap();
window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
```

### Option 3: Audio Playback
**Note**: Tauri doesn't have a built-in audio plugin for v2. Would require:
- HTML5 Audio API in frontend (limited to when app has focus)
- Or external audio library (adds complexity)
- **Not recommended** for this use case

## Proposed Implementation Strategy

### Phase 1: System Notifications (PRIMARY)
1. Add `tauri-plugin-notification` to dependencies
2. Initialize plugin in main.rs
3. Create Tauri command: `show_pomodoro_notification`
4. Call from frontend when timer completes
5. Keep existing visual feedback as secondary indicator

### Phase 2: Window Focus (FALLBACK)
1. Add Tauri command: `focus_app_window` 
2. Call if notifications fail or as additional alert
3. Use `request_user_attention()` for taskbar flash

### Phase 3: User Preference (FUTURE)
- Add settings to toggle notification style
- Option to disable window focus if user prefers
- Sound on/off toggle

## Implementation Plan

### Backend Changes (src-tauri/src/main.rs)
```rust
// Add to Cargo.toml dependencies
tauri-plugin-notification = "2.3.1"

// Add to main function
.plugin(tauri_plugin_notification::init())

// Add command
#[tauri::command]
async fn show_pomodoro_notification(app: tauri::AppHandle, task_name: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title("🍅 Pomodoro Complete!")
        .body(format!("Task: {}\n\nGreat job! Time for a break! 🎉", task_name))
        .show()
        .map_err(|e| format!("Failed to show notification: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn focus_app_window(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main")
        .ok_or("Main window not found")?;
    
    // Request user attention (taskbar flash)
    window.request_user_attention(Some(tauri::UserAttentionType::Critical))
        .map_err(|e| format!("Failed to request attention: {}", e))?;
    
    // Bring window to front
    window.set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;
    
    Ok(())
}
```

### Frontend Changes (ui/main.js)
```javascript
// In startCountdown function, when timer completes:
if (remaining <= 0) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    
    // Hide timer overlay
    pomodoroOverlay.classList.add('hidden');
    
    // Get task name for notification
    const taskName = selectedTodo !== null 
        ? currentDayData.todos[selectedTodo].text 
        : "Pomodoro session";
    
    // Show system notification
    try {
        await window.invoke('show_pomodoro_notification', { 
            taskName: taskName 
        });
    } catch (error) {
        console.error('Failed to show notification:', error);
        // Fallback: focus window
        try {
            await window.invoke('focus_app_window');
        } catch (focusError) {
            console.error('Failed to focus window:', focusError);
        }
    }
    
    // Keep existing visual feedback
    const originalTitle = document.title;
    document.title = '🍅 TIMER DONE! 🍅';
    setTimeout(() => { document.title = originalTitle; }, 5000);
    
    document.body.style.backgroundColor = '#ff6b6b';
    setTimeout(() => { document.body.style.backgroundColor = ''; }, 1000);
    
    // Show completion dialog (after a delay to let notification appear)
    setTimeout(() => {
        customAlert(
            'Pomodoro session complete!\n\nGreat job! Time for a well-deserved break! 🎉',
            '🍅 Pomodoro Complete!'
        ).then(() => {
            // Ask to complete task...
        });
    }, 500);
}
```

## Testing Requirements

### Test Cases
1. ✅ Notification appears when app is in background
2. ✅ Notification appears when app is minimized
3. ✅ Notification appears when app is on different desktop/workspace
4. ✅ Window focus works as fallback if notifications fail
5. ✅ Existing visual feedback still works
6. ✅ Works on macOS (Intel and Apple Silicon)
7. ✅ Works on Windows 10/11
8. ✅ Works on Linux (Ubuntu, Fedora, etc.)

### Permission Handling
- macOS: Should request notification permission on first use
- Windows: No permission needed (system handles it)
- Linux: No permission needed (depends on notification daemon)

## Benefits
- ✅ Users won't miss timer completion
- ✅ Works even when app is minimized
- ✅ Native system integration
- ✅ Follows platform conventions
- ✅ Minimal code changes
- ✅ Graceful fallback if notifications fail

## Risks & Mitigations
- **Risk**: Notification permission denied on macOS
  - **Mitigation**: Fallback to window focus + visual feedback
- **Risk**: No notification daemon on Linux
  - **Mitigation**: Fallback to window focus
- **Risk**: Users find notifications annoying
  - **Mitigation**: Future setting to disable (not in this PR)

## Next Steps
1. ✅ Create feature branch: `feat/pomodoro-notifications`
2. ⏳ Add tauri-plugin-notification dependency
3. ⏳ Implement backend commands
4. ⏳ Update frontend to use notifications
5. ⏳ Test on all platforms
6. ⏳ Update documentation
7. ⏳ Update CHANGELOG
8. ⏳ Create PR
