# Changelog

All notable changes to Todo Notes Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Calendar highlight now syncs with todo panel navigation - when using Previous/Next Day or Today buttons, the calendar panel automatically updates to show and highlight the selected day
- System notifications for Pomodoro timer completion - notifications appear even when app is minimized or in background
  - macOS: Notifications appear in Notification Center with "default" system sound
  - Windows: Notifications appear in Windows notification system with sound
  - Linux: Notifications appear via system notification daemon with sound
- Notification includes task name and encouraging message
- Audio alert via system notification sound ensures users never miss timer completion
- App automatically brings itself to focus when timer completes - dock icon bounces (macOS) and window comes to foreground

## [1.6.0] - 2025-01-08

### Added
- Clickable hyperlinks in notes - Ctrl/Cmd+Click on URLs to open in default browser
- Visual feedback when hovering over links with Ctrl/Cmd held (cursor changes to pointer)
- Support for URLs in both main notes section and todo item notes
- Automatic URL detection for http://, https://, and www. links
- Cross-platform URL opening using tauri-plugin-opener

## [1.5.0] - 2024-01-08
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

## [1.4.0] - 2025-10-08

### Added
- Calendar view now shows todo count badges for each day
- Badge displays completion status (all complete, partial, none)
- Badge format shows "completed/total" count (e.g., "2/5")
- Calendar events system replaced with direct todo creation
- Migration function to convert old calendar events to todos

### Changed
- Simplified calendar by replacing event system with todo count visualization
- Calendar input now creates todos directly instead of separate events
- Improved calendar usability by hiding input boxes until day is clicked
- Enhanced release changelog to include all commits categorized by type

### Fixed
- App version now dynamically loaded from backend instead of hardcoded

## [1.3.1] - 2025-10-08

### Fixed
- Release workflow now only uploads installer packages, not intermediate build files
- Cleaned up release artifacts for cleaner distribution

## [1.3.0] - 2025-10-08

### Added
- **Todo item editing** with double-click on any todo
- **Per-item notes** for detailed task information
- Edit modal with dedicated text and notes fields
- Notes indicator (📝) on todos that have notes attached
- Comprehensive tests for editing and notes functionality

### Changed
- TodoItem structure now includes `notes` field for per-item details
- Improved todo item interaction with visual feedback

## [1.2.4] - 2025-10-07

### Fixed
- Build system now only creates DEB packages for Linux (AppImage requires FUSE)
- Switched to Debian Bookworm container for future-proof GLIBC compatibility
- Restored Ubuntu 20.04 compatibility for broader Linux distribution support

## [1.2.1] - 2025-10-07

### Added
- Attempted integration of rust-build.action for faster builds

### Fixed
- Removed rust-build.action as Docker container only works on Linux runners

## [1.2.0] - 2025-10-05

### Added
- **Zoom level persistence** - your preferred zoom level is now saved and restored
- Zoom preferences sync between localStorage and backend storage
- `get_zoom_limits()` command for consistent min/max zoom values
- Comprehensive zoom persistence tests

### Changed
- Zoom initialization now prevents flash of default preferences
- Improved CSS selector specificity for zoom controls
- Refactored zoom code for better testability and maintainability

### Fixed
- Eliminated flash of default zoom level on startup
- Fixed zoom limit mismatch between frontend and backend
- Improved validation of zoom values before saving

## [1.1.2] - 2025-10-05

### Fixed
- CI/CD improvements for more reliable builds
- Fixed caching issues in GitHub Actions workflow
- Added rustfmt to maintain code formatting
- Only upload DMG files for macOS (not .app directories)
- Removed paths-ignore to allow workflow to run intelligently

## [1.1.1] - 2025-10-03

### Added
- **Automatic semantic versioning** based on conventional commits
- Comprehensive copilot instructions with session learnings
- Documentation moved to standard `.github/` location

### Changed
- Enhanced documentation with code quality guidelines
- Improved conventional commit format documentation

### Fixed
- Removed excessive debug logging from production code
- Fixed ARIA label semantics for accessibility (switch role)
- Resolved Linux GLIBC compatibility issues
- Made tag creation robust for existing tags
- Converted PNG icons to proper 8-bit RGBA format for Tauri compatibility

## [1.1.0] - 2025-10-02

### Added
- **Calendar panel** with collapsible functionality
- **Calendar event creation** - add events by clicking calendar days
- **Persistent calendar storage** - events saved to backend
- **Resizable panels** with drag handles for customized layout
- Reset panel sizes button to restore defaults
- Comprehensive tests for calendar functionality
- Complete icon set for Tauri application
- Mandatory pre-commit validation checklist
- Automated release system with GitHub Actions

### Changed
- Notes panel collapse now properly expands todo panel
- Calendar events properly display in calendar UI
- Calendar events create corresponding todo items

### Fixed
- Release build failures for Windows and macOS resolved
- Updated Ubuntu dependencies in release workflow for Tauri builds

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