# Changelog

All notable changes to Todo Notes Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation organization with `docs/` directory
- Documentation index in `docs/README.md` with links to all guides
- Pomodoro timer now defaults to 20 minutes (more practical for actual use)

### Changed
- Moved 15 documentation files from root to `docs/` directory for better organization
- Pomodoro timer: removed 1-minute option (unlikely to be useful)
- Error handling now consistently uses custom modal dialogs throughout the app
- Improved code quality from B+ to A- rating

### Fixed
- Removed unused `pomodoroTimer` variable
- Fixed variable hoisting issue: `saveNotesTimeout` now declared at proper scope
- Added radix parameter to `parseInt()` for parsing safety
- Fixed undefined `showCustomAlert()` function call (now uses `customAlert()`)
- Consolidated duplicate keydown event listeners for better performance
- Fixed test suite references to non-existent `symbol` field in TodoItem
- Fixed test suite calls to undefined `setupMockDataDir()` helper function

### Removed
- Dead code removal: 120 lines total
  - Unused `window.deleteTodo()` function (replaced by inline implementation)
  - Unused `handlePomodoroComplete()` function (logic moved to `startCountdown()`)
  - Unused `showNotification()` function (never called in codebase)
  - Obsolete `ui/test.html` file (superseded by `ui/test-runner.html`)
- Removed 3 debug `console.log` statements from production code
- Extracted magic numbers to named constants (`DEFAULT_CALENDAR_WIDTH`, `DEFAULT_NOTES_WIDTH`)

### Documentation
- `docs/CLEANUP_SUMMARY.md` - Detailed cleanup process documentation
- `docs/CODE_REVIEW_ISSUES.md` - Comprehensive code review findings (24 issues)
- `docs/STANDARDS_COMPLIANCE_SUMMARY.md` - Standards violations fixed
- `docs/POST_REBASE_VERIFICATION.md` - Post-rebase verification checklist

## [1.0.0] - 2025-10-01

### Added
- ✅ **Core Todo Management**
  - Daily todo lists with bullet journal style symbols (• → ✓ → ✗)
  - Add, complete, and delete tasks
  - Persistent storage in JSON format

- ✅ **Date Navigation**
  - Navigate between days (Previous/Next buttons)
  - Jump to today functionality
  - Automatic data loading for each day

- ✅ **Notes System**
  - Collapsible notes section for each day
  - Real-time saving as you type
  - Toggle visibility with dedicated button

- ✅ **Pomodoro Timer**
  - Configurable timer durations (25, 20, 15, 5 minutes + test modes)
  - Visual countdown display
  - Custom modal alerts for completion (native alerts don't work in Tauri)
  - Start/stop functionality

- ✅ **Accessibility Features**
  - Text zoom with visual controls (+/- buttons)
  - Keyboard shortcuts (Cmd+/Cmd-/Cmd+0 on macOS)
  - Smooth scaling transitions
  - Zoom level indicator

- ✅ **Desktop App Features**
  - Cross-platform Tauri v2.8.4 framework
  - Rust backend with async file operations
  - Resizable window with minimum size constraints
  - Developer tools integration for debugging

### Technical Implementation
- **Backend**: Rust with tokio async runtime, chrono for dates, uuid for IDs
- **Frontend**: Vanilla HTML/CSS/JavaScript (no build process required)
- **Storage**: JSON files per day in app data directory
- **API**: Tauri commands for file operations and system integration

### Configuration
- Proper Tauri API access with `withGlobalTauri: true`
- CSP policy configured for inline scripts
- Window settings optimized for productivity use

### Fixed Issues During Development
- ✅ Tauri API availability in frontend
- ✅ Native dialog blocking (implemented custom modals)
- ✅ Font scaling with CSS custom properties and rem units
- ✅ Event listener initialization order
- ✅ Delete button functionality
- ✅ Pomodoro completion notifications

## Future Versions

### Planned for 1.1.0
- [ ] Export/import functionality
- [ ] Different todo types (tasks, events, notes)
- [ ] Keyboard shortcuts for todo management
- [ ] Theme customization

### Planned for 1.2.0
- [ ] Multi-day view/calendar
- [ ] Search functionality
- [ ] Todo categories/tags
- [ ] Statistics and productivity insights

### Planned for 2.0.0
- [ ] Cloud sync capability
- [ ] Mobile companion app
- [ ] Plugin system
- [ ] Advanced bullet journal features

---

## Version Guidelines

### Semantic Versioning Rules
- **MAJOR** (X.0.0): Breaking changes to data format or core functionality
- **MINOR** (1.X.0): New features, enhancements
- **PATCH** (1.0.X): Bug fixes, minor improvements

### Release Process
1. Update version in `Cargo.toml` and `tauri.conf.json`
2. Update version display in `index.html`
3. Document changes in this CHANGELOG.md
4. Test all functionality
5. Create git tag: `git tag v1.0.0`
6. Build release: `cargo tauri build`