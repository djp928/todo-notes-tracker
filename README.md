# Todo Notes Tracker

A bullet journal style todo app built with Tauri v2, featuring daily todo management, calendar integration, pomodoro timer, and rich customization options.

[![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)](https://github.com/djp928/todo-notes-tracker/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Features

### ✅ Todo Management
- **Daily todo lists** with bullet journal style workflow
- **Double-click editing** with per-item notes support
- **Flexible todo actions**: complete, delete, move to next day
- **Calendar integration** with todo count badges showing completion status
- **Date navigation**: easily browse previous/next days or jump to today

### ✅ Calendar View
- **Visual overview** of all your todos across dates
- **Todo count badges** displaying completion status (e.g., "2/5" completed)
- **Color-coded badges**: 
  - Green (all complete)
  - Blue (partial completion)
  - Gray (none complete)
- **Quick todo creation** directly from calendar days
- **Collapsible panel** for focused workspace

### ✅ Notes System
- **Per-todo notes** for detailed task information
- **Daily notes section** for general thoughts and planning
- **Collapsible notes panel** for distraction-free focus
- **Auto-save** on input to prevent data loss

### ✅ Pomodoro Timer
- **Configurable durations**: 25, 20, 15, 5 minutes (default: 20 min)
- **Task-focused sessions** linked to selected todos
- **Visual countdown** with full-screen overlay
- **Custom completion alerts** (native alerts don't work in Tauri)
- **Optional auto-completion** of tasks after session

### ✅ Customization
- **Dark mode** with system preference detection
- **Text zoom** with keyboard shortcuts (⌘+/⌘-/⌘0 on macOS, Ctrl+/Ctrl-/Ctrl+0 on Windows/Linux)
- **Resizable panels** with drag handles for personalized layout
- **Persistent preferences** - zoom level and dark mode saved across sessions

### ✅ Data Management
- **JSON file storage** - one file per day (`YYYY-MM-DD.json`)
- **Cross-platform** data directory
- **Automatic backups** through file-based storage
- **Human-readable format** for easy inspection and recovery

## Project Structure

```
todo-notes-tracker/
├── README.md                 # This file
├── CHANGELOG.md              # Version history (Keep a Changelog format)
├── docs/                     # Comprehensive documentation
│   ├── README.md            # Documentation index
│   ├── TESTING.md           # Testing guide
│   ├── DARK_MODE_FEATURE.md # Dark mode implementation
│   └── ...                  # Additional guides
├── src-tauri/                # Rust backend
│   ├── Cargo.toml           # Rust dependencies
│   ├── tauri.conf.json      # Tauri configuration
│   └── src/
│       └── main.rs          # Backend logic (21 tests passing)
└── ui/                      # Frontend (HTML/CSS/JS)
    ├── index.html           # Main UI
    ├── styles.css           # Theming and styling
    ├── main.js              # Application logic
    ├── test-runner.html     # Test interface
    └── test-*.js            # Frontend test suites
```

## Quick Start

### Prerequisites

1. **Install Rust**: https://rustup.rs/
2. **Install Tauri CLI**:
   ```bash
   cargo install tauri-cli
   ```

### Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/djp928/todo-notes-tracker.git
   cd todo-notes-tracker
   ```

2. **Run in development mode**:
   ```bash
   cd src-tauri
   cargo tauri dev
   ```

3. **Run tests**:
   ```bash
   ./run-tests.sh  # From project root
   ```

### Building for Production

```bash
cd src-tauri
cargo tauri build

# Built apps will be in src-tauri/target/release/bundle/
# - macOS: .dmg installer (Intel and Apple Silicon)
# - Windows: .msi installer
# - Linux: .deb package
```

## Installation

Download the latest release for your platform from [Releases](https://github.com/djp928/todo-notes-tracker/releases).

### macOS
1. Download the appropriate DMG for your Mac:
   - Apple Silicon (M1/M2/M3): `*_aarch64.dmg`
   - Intel: `*_x64.dmg`
2. Open the DMG and drag Todo Notes Tracker to Applications
3. Launch from Applications folder
4. If macOS blocks it: System Preferences → Security & Privacy → Open Anyway

### Windows
1. Download the `.msi` installer
2. Run the installer and follow prompts
3. Launch from Start Menu or Desktop shortcut

### Linux
1. Download the `.deb` package
2. Install: `sudo dpkg -i todo-notes-tracker*.deb`
3. Launch from Applications menu or run `todo-notes-tracker`

## Data Storage Location

Your todo data is stored in platform-specific directories:
- **macOS**: `~/Library/Application Support/com.todonotestracker.app/`
- **Windows**: `%APPDATA%\com.todonotestracker.app\`
- **Linux**: `~/.local/share/com.todonotestracker.app/`

Each day's data is stored as a separate `YYYY-MM-DD.json` file for easy backup and portability.

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[Testing Guide](docs/TESTING.md)** - How to run and write tests
- **[Dark Mode Feature](docs/DARK_MODE_FEATURE.md)** - Dark mode implementation details
- **[Todo Editing](docs/FEATURE_TODO_EDITING.md)** - Todo item editing with notes
- **[Code Review](docs/CODE_REVIEW_ISSUES.md)** - Code quality standards and best practices
- **[Release Process](docs/RELEASE.md)** - Versioning and release workflow

See [`docs/README.md`](docs/README.md) for a complete index of all documentation.

## Development Highlights

### Tech Stack
- **Backend**: Rust with Tauri v2.8.4, tokio async runtime
- **Frontend**: Vanilla HTML/CSS/JavaScript (no build process required)
- **Storage**: JSON files in app data directory
- **Testing**: Comprehensive test coverage (21 Rust tests + frontend tests)

### Code Quality
- ✅ **A- rating** - Clean, maintainable codebase
- ✅ **Zero linter warnings** - Cargo clippy compliant
- ✅ **Comprehensive tests** - All code paths tested
- ✅ **Conventional commits** - Semantic versioning enabled
- ✅ **Documented** - JSDoc and Rust doc comments throughout

### Automated Release System
- **Semantic versioning** based on conventional commits
- **Automatic changelog** generation
- **Multi-platform builds** (macOS Intel/ARM, Windows, Linux)
- **GitHub Actions** CI/CD pipeline

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/amazing-feature`
3. Make your changes following the coding standards
4. Run tests: `./run-tests.sh`
5. Commit using conventional commits: `git commit -m "feat: add amazing feature"`
6. Push and create a Pull Request

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for detailed development guidelines.

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

**Latest Release**: v1.4.0 - Calendar todo count badges and improved usability

## Advantages of This Stack

1. **Native Performance**: Rust backend is extremely fast
2. **Small Bundle Size**: ~15MB vs ~150MB for Electron
3. **Cross-platform**: Single codebase for macOS, Windows, Linux
4. **Modern UI**: Web technologies for flexible styling
5. **Secure**: Sandboxed communication between frontend/backend
6. **Easy Distribution**: Built-in installers and auto-updater support
7. **Maintainable**: Clean code with comprehensive documentation

## License

MIT License - see [LICENSE](LICENSE) for details

## Author

David J. Parker ([@djp928](https://github.com/djp928))

---

**Built with ❤️ using Rust and Tauri**