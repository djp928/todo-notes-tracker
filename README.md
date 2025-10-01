# Todo Notes Tracker - Tauri Setup

This is a basic Tauri setup for your bullet journal style todo app with pomodoro timer.

## Project Structure

```
todo-notes-tracker/
├── Cargo.toml                 # Rust workspace configuration
├── src-tauri/                 # Rust backend
│   ├── Cargo.toml            # Tauri app dependencies
│   ├── tauri.conf.json       # Tauri configuration
│   ├── build.rs              # Build script
│   └── src/
│       └── main.rs           # Main Rust application code
└── ui/                       # Frontend (HTML/CSS/JS)
    ├── index.html            # Main UI
    ├── styles.css            # Styling
    └── main.js               # Frontend logic
```

## Prerequisites

1. **Install Rust**: https://rustup.rs/
2. **Install Node.js** (optional, for package management)
3. **Install Tauri CLI**:
   ```bash
   cargo install tauri-cli
   ```

## Development

1. **Navigate to the project directory**:
   ```bash
   cd /Users/David.Parker/src/todo-notes-tracker
   ```

2. **Run in development mode**:
   ```bash
   cargo tauri dev
   ```

3. **Build for production**:
   ```bash
   cargo tauri build
   ```

## Features Implemented

### ✅ Core Features
- **Bullet Journal UI**: Clean, minimal interface with circular checkboxes
- **Todo Management**: Add, complete, delete, and move todos to next day
- **Date Navigation**: Navigate between different days
- **Notes Section**: Collapsible notes pane for daily notes
- **Auto-save**: Automatic saving to prevent data loss

### ✅ Pomodoro Timer
- **Task Selection**: Select a todo item to focus on
- **Configurable Duration**: 5, 15, 20, or 25-minute sessions
- **Timer Overlay**: Minimalist timer display during focus sessions
- **Window Resizing**: App shrinks during timer sessions
- **Notifications**: Native notifications when timer completes
- **Auto-completion**: Option to mark task as done after pomodoro

### ✅ Data Storage
- **JSON Files**: Each day stored as separate JSON file
- **Cross-platform**: Uses system's app data directory
- **Flexible Structure**: Easy to migrate to SQLite later

## Key Files Explained

### `src-tauri/src/main.rs`
Contains all the Rust backend functions:
- `load_day_data`: Load todos and notes for a specific date
- `save_day_data`: Save current day data to JSON file
- `add_todo_item`: Create new todo items with UUID
- `start_pomodoro_timer`: Handle timer with window resizing
- `send_notification`: Send native system notifications

### `ui/main.js`
Frontend JavaScript that:
- Calls Rust functions using Tauri's `invoke` API
- Manages UI state and todo list rendering
- Handles pomodoro timer countdown display
- Auto-saves data when window loses focus

### `src-tauri/tauri.conf.json`
Tauri configuration:
- Window settings (size, title, etc.)
- Security permissions for file system, notifications
- Bundle configuration for distribution

## Data Storage Location

Data is stored in platform-specific directories:
- **macOS**: `~/Library/Application Support/com.todonotestracker.app/`
- **Windows**: `%APPDATA%\com.todonotestracker.app\`
- **Linux**: `~/.local/share/com.todonotestracker.app/`

Each day's data is stored as `YYYY-MM-DD.json` files.

## Next Steps

1. **Test the basic functionality** by running `cargo tauri dev`
2. **Add SQLite support** for advanced features (search, tags, etc.)
3. **Implement data export** (PDF, markdown)
4. **Add keyboard shortcuts** for power users
5. **Create app icons** and improve the bundle configuration
6. **Add themes** (dark/light mode)

## Building for Distribution

```bash
# Build optimized bundles for your platform
cargo tauri build

# The built app will be in src-tauri/target/release/bundle/
# - macOS: .app bundle and .dmg installer
# - Windows: .exe installer
# - Linux: .deb, .rpm, or .AppImage
```

## Advantages of This Setup

1. **Native Performance**: Rust backend is extremely fast
2. **Small Bundle Size**: ~15MB vs ~150MB for Electron
3. **Cross-platform**: Single codebase for all platforms
4. **Modern UI**: Web technologies for flexible styling
5. **Secure**: Sandboxed communication between frontend/backend
6. **Easy Distribution**: Built-in installers and auto-updater support