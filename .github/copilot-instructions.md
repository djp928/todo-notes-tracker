# Copilot Instructions for Todo Notes Tracker

## Project Overview
This is a bullet journal style todo app built with Tauri v2.8.4, featuring:
- Daily todo management with bullet journal symbols
- Date navigation (previous/next day, jump to today)
- Notes section with toggle functionality
- Pomodoro timer with custom alerts
- Text zoom accessibility features
- JSON file storage in app data directory

## Tech Stack
- **Backend**: Rust with Tauri v2.8.4, tokio async runtime
- **Frontend**: Vanilla HTML/CSS/JavaScript (no build process)
- **Storage**: JSON files in app data directory
- **Dependencies**: chrono, uuid, serde_json

## Critical Tauri Configuration

### API Access Fix
**Problem**: `window.invoke` and other Tauri APIs not available in frontend
**Solution**: Add `withGlobalTauri: true` to `tauri.conf.json`:
```json
{
  "app": {
    "withGlobalTauri": true,
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'"
    }
  }
}
```

### Running the App
- **Correct**: `cd src-tauri && cargo tauri dev`
- **Wrong**: `npm run tauri dev` (no package.json needed for static frontend)

## Common Issues and Solutions

### 1. Native Dialogs Don't Work
**Problem**: `alert()`, `confirm()`, `prompt()` are blocked in Tauri webviews
**Solution**: Implement custom modal dialogs in HTML/CSS/JS

Example custom confirm dialog:
```javascript
function showConfirmDialog(message) {
    return new Promise((resolve) => {
        // Create modal HTML, handle user input, resolve promise
    });
}
```

### 2. Event Listeners Not Working
**Problem**: DOM elements not found when setting up event listeners
**Solution**: Ensure proper initialization order:
1. Wait for DOM ready
2. Initialize Tauri API
3. Declare all DOM element variables at top of file
4. Set up event listeners after DOM is ready

### 3. Zoom/Font Scaling Implementation
**Problem**: CSS custom properties not affecting all text
**Solution**: Scale at root level with rem units:
```css
:root {
    --zoom-scale: 1.0;
}
html {
    font-size: calc(16px * var(--zoom-scale));
}
/* Use rem units for scalable elements */
body { font-size: 0.875rem; }
```

**Avoid**: Fixed px units that won't scale
**Convert**: `font-size: 14px` → `font-size: 0.875rem`

### 4. File I/O and Data Persistence
**Structure**: 
- Each day gets its own JSON file: `YYYY-MM-DD.json`
- Store in app data directory (retrieved via Tauri command)
- Async file operations with proper error handling

### 5. Pomodoro Timer Issues
**Problem**: Tauri's `listen` API may not work reliably
**Solution**: Use JavaScript setTimeout/setInterval with custom modals for alerts

## Development Patterns

### Rust Backend Commands
```rust
#[tauri::command]
async fn command_name(param: String) -> Result<ReturnType, String> {
    // Always return Result<T, String> for proper error handling
    // Use tokio for async file operations
}
```

### Frontend API Calls
```javascript
try {
    const result = await window.invoke('command_name', { param: value });
} catch (error) {
    console.error('Command failed:', error);
    // Handle error appropriately
}
```

### DOM Element Management
```javascript
// Declare at top of file
const element = document.getElementById('element-id');

// Check existence before use
if (!element) {
    console.error('Element not found!');
    return;
}
```

### CSS Organization
- Use CSS custom properties for dynamic values
- Prefer rem/em units over px for scalability  
- Group related styles together
- Use transitions for smooth user experience

## Code Quality Standards

### Logging Best Practices

**Production Code**:
- ❌ Avoid excessive `console.log` for debugging
- ✅ Use `console.error` for errors only
- ✅ Keep essential state logging minimal
- ✅ In Rust, use `#[cfg(debug_assertions)]` for debug-only prints

**Example**:
```javascript
// ❌ Bad - excessive debug logging
console.log('Function called');
console.log('Parameter:', param);
console.log('Processing...');
console.log('Result:', result);

// ✅ Good - minimal, meaningful logging
console.error('Failed to process data:', error);
console.log('Dark mode:', darkMode ? 'enabled' : 'disabled'); // State indicator
```

```rust
// ✅ Debug-only logging in Rust
#[cfg(debug_assertions)]
eprintln!("Debug info: {}", data);

// ❌ Avoid in production - prints always
eprintln!("This always prints!");
```

### Documentation Standards

**Rust Code**:
- ✅ Add doc comments (`///`) to all public structs and functions
- ✅ Document parameters, return values, and error conditions
- ✅ Use `#[tauri::command]` functions appear unused to Clippy - add `#[allow(dead_code)]` at module level

**Example**:
```rust
/// Creates a new todo item with a unique ID and timestamp.
///
/// # Arguments
/// * `text` - The todo item text/description
///
/// # Returns
/// A new TodoItem with generated ID and current timestamp.
///
/// # Errors
/// Returns an error if the operation fails.
#[tauri::command]
async fn create_todo_item(text: String) -> Result<TodoItem, String> {
    // Implementation
}
```

**JavaScript Code**:
- ✅ Add JSDoc comments for complex functions
- ✅ Declare DOM elements at top of file
- ✅ Check element existence before use

### Metadata Quality

**Cargo.toml**:
- ✅ Use real author information
- ✅ Specify license (e.g., "MIT")
- ✅ Include repository URL
- ❌ Avoid placeholder values like "Your Name <your.email@example.com>"

**Example**:
```toml
[package]
name = "todo-notes-tracker"
version = "1.1.0"
authors = ["djp928"]
license = "MIT"
repository = "https://github.com/djp928/todo-notes-tracker"
```

### Debugging Tips

### Console Logging Best Practices

**During Development**:
- Use debug logging to understand flow
- Mark temporary logs clearly with comments
- Remove before committing to main

**In Production**:
- Keep only `console.error` for errors
- Minimal `console.log` for critical state (e.g., "Dark mode enabled")
- No verbose operation logging

### Common Debug Points
1. Check if Tauri API is available: `window.__TAURI__`
2. Verify DOM elements exist before adding listeners
3. Monitor CSS custom property updates in DevTools
4. Check file permissions for data directory access

### DevTools Access
- Right-click in app → "Inspect" 
- Or press F12
- Enable in `tauri.conf.json`: `"devtools": true`

## Architecture Decisions

### Why No Build Process
- Simple static HTML/CSS/JS is sufficient
- Reduces complexity and build dependencies
- Faster development iteration
- Easier debugging

### File Storage Strategy
- JSON files per day for data separation
- Human-readable format for debugging
- Easy backup and data portability

### Custom Modals Over Native Dialogs
- Consistent cross-platform appearance
- Full control over styling and behavior
- Works within Tauri's security constraints

## Future Development Notes

### Adding New Features
1. Add Rust command if backend logic needed
2. Update frontend to call new commands
3. Test error handling scenarios
4. Update this documentation

### Performance Considerations
- File I/O is async - don't block UI
- Batch operations when possible
- Consider caching for frequently accessed data

### Security Notes
- CSP policy allows inline scripts (required for simple setup)
- File operations are sandboxed to app data directory
- No network requests currently - would need CSP updates

## Troubleshooting Checklist

When something breaks:
1. ✅ Check browser console for JavaScript errors
2. ✅ Verify DOM elements exist (not null)
3. ✅ Confirm Tauri API is available (`window.invoke`)
4. ✅ Check Rust terminal output for backend errors
5. ✅ Verify file paths and permissions
6. ✅ Test in development vs production build
7. ✅ Check CSP policy if adding new features
8. ✅ **Run ALL tests**: `./run-tests.sh` - often reveals the real issue
9. ✅ **Check test failures**: Failed tests pinpoint exact problems
10. ✅ **Test your changes**: Add tests for new code to prevent regressions

## Versioning Strategy

### Current Version: 1.1.0
- Uses Semantic Versioning (SemVer): MAJOR.MINOR.PATCH
- Version is automatically updated by release workflow
- Version is stored in:
  1. `src-tauri/Cargo.toml`
  2. `src-tauri/tauri.conf.json`
  3. `src-tauri/Cargo.lock`

## Commit Message Convention ⚠️ MANDATORY

**ALWAYS use conventional commit format** for all commit messages. This enables automatic semantic versioning in our release workflow.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature (triggers MINOR version bump: 1.1.0 → 1.2.0)
- **fix**: A bug fix (triggers PATCH version bump: 1.1.0 → 1.1.1)
- **docs**: Documentation only changes (PATCH bump)
- **style**: Changes that don't affect code meaning (formatting, whitespace) (PATCH bump)
- **refactor**: Code change that neither fixes a bug nor adds a feature (PATCH bump)
- **perf**: Performance improvement (PATCH bump)
- **test**: Adding or correcting tests (PATCH bump)
- **chore**: Changes to build process or auxiliary tools (PATCH bump)
- **ci**: Changes to CI configuration files and scripts (PATCH bump)

### Breaking Changes

For breaking changes, use `!` after the type or add `BREAKING CHANGE:` in footer:

```
feat!: redesign API structure
```

OR

```
feat: redesign API structure

BREAKING CHANGE: API endpoints have changed
```

This triggers a MAJOR version bump (1.1.0 → 2.0.0)

### Examples

✅ **Good commit messages:**
```
feat: add dark mode toggle button
fix: resolve race condition in dark mode loading
docs: update README with installation instructions
chore(release): bump version to v1.2.0
refactor: consolidate CSS theme variables
perf: optimize calendar rendering
test: add unit tests for dark mode preference storage
feat!: change configuration file format
```

❌ **Bad commit messages (avoid):**
```
Update files
Fixed bug
Added feature
Changes
WIP
```

### Scope (Optional)

Add a scope to provide additional context:

```
feat(ui): add dark mode toggle
fix(calendar): resolve event overlap issue
chore(deps): update Tauri to v2.1.0
```

### Why This Matters

Our release workflow automatically:
1. Analyzes commit messages to determine version bump type
2. Increments the version appropriately
3. Creates a GitHub release with appropriate changelog
4. Builds and publishes artifacts

Following conventional commits ensures this automation works correctly!

### Release Process (Automated)

1. Merge PR to main with conventional commit messages
2. Workflow automatically analyzes commits since last tag
3. Version is bumped based on commit types
4. Version files are updated and committed
5. Release is created with binaries for all platforms

**No manual version bumping needed!** The workflow handles it all automatically. 🎉

### Version Bump Guidelines
- **MAJOR**: Breaking changes (data format, core functionality)
- **MINOR**: New features (export, themes, new todo types)
- **PATCH**: Bug fixes (UI issues, performance improvements)

## Key Learnings Summary

### Code Quality
1. **Logging**: Keep production logs minimal - only errors and critical state
2. **Documentation**: All Rust functions need doc comments with examples
3. **Metadata**: Use real author/license info, not placeholders
4. **Clippy**: Tauri commands need `#[allow(dead_code)]` - they're called by frontend

### Tauri Specifics
5. **API Access**: Requires `withGlobalTauri: true` configuration
6. **Native Dialogs**: Don't work - use custom HTML modals instead
7. **Development**: Use `cargo tauri dev` from src-tauri directory

### Frontend Best Practices
8. **Font Scaling**: Must use root-level CSS scaling with rem units
9. **Event Listeners**: Declare DOM elements at top, set up after DOM ready
10. **Dark Mode**: Load preferences BEFORE setting up event listeners (avoid race conditions)

### Backend Best Practices
11. **Error Handling**: Always use `Result<T, String>` in Rust commands
12. **File Storage**: Use app data directory with proper async handling
13. **Debug Prints**: Wrap in `#[cfg(debug_assertions)]` for debug-only output

### Testing
14. **Comprehensive**: Unit tests are mandatory for all code changes
15. **Run Before Commit**: Always run `./run-tests.sh` before committing

### Release Process
16. **Automated**: Workflow analyzes conventional commits and bumps version automatically
17. **No Manual Bumping**: Version is auto-updated based on commit message types

## Testing Requirements ⚠️ MANDATORY

**All code changes MUST include comprehensive unit tests. No exceptions.**

### Testing Standards
- **Backend (Rust)**: Unit tests required for ALL public functions and commands
- **Frontend (JavaScript)**: Unit tests required for ALL functions and user interactions
- **Integration**: End-to-end tests for complete workflows
- **Error Handling**: Tests for ALL error scenarios and edge cases

### Before Any Change is Considered Complete:
1. ✅ **ALL existing tests must pass** - `./run-tests.sh` returns success
2. ✅ **New functionality must have corresponding tests** covering:
   - Normal operation (happy path)
   - Error conditions and edge cases
   - Boundary conditions (empty data, large data, special characters)
   - Integration with existing features
3. ✅ **Test coverage must be maintained** - no decrease in coverage
4. ✅ **Manual testing must be performed** via `ui/test-runner.html`

### Test Files and Commands
- **Backend Tests**: Located in `src-tauri/src/main.rs` (test module)
- **Frontend Tests**: Located in `ui/test-*.js` files
- **Run All Tests**: Execute `./run-tests.sh` from project root
- **Manual Frontend Tests**: Open `ui/test-runner.html` in the Tauri app

### Testing Documentation
- Comprehensive testing guide available in `TESTING.md`
- Test infrastructure includes mocks, utilities, and visual test runner
- CI/CD pipeline automatically runs tests on all commits

### Examples of Required Test Coverage
```rust
// Rust: Every command needs tests like this
#[tokio::test]
async fn test_command_name() {
    let result = command_name(test_input).await;
    assert!(result.is_ok());
    // Test error cases too
    let error_result = command_name(invalid_input).await;
    assert!(error_result.is_err());
}
```

```javascript
// JavaScript: Every function needs tests like this
test('function should handle normal input', async () => {
    const result = await functionName('valid input');
    assert.equal(result, expected_output);
});

test('function should handle error cases', async () => {
    await assert.throwsAsync(async () => {
        await functionName('invalid input');
    });
});
```

### Test-First Development (Strongly Recommended)
1. Write tests for new functionality BEFORE implementing
2. Implement just enough code to make tests pass
3. Refactor while keeping tests green
4. Add edge case tests and make them pass

**REMEMBER: Tests are not optional. They are a core part of the codebase that ensures reliability, maintainability, and confidence in changes.**

## 🚨 PRE-COMMIT VALIDATION CHECKLIST 🚨

**BEFORE ANY `git commit` AND `git push`, YOU MUST:**

### 1. Run Complete Test Suite
```bash
# Run ALL CI tests locally BEFORE committing
./run-tests.sh
```

### 2. Run Linter and Formatter  
```bash
# Rust formatting and linting (in src-tauri directory)
cd src-tauri
cargo fmt
cargo clippy --all-targets --all-features -- -W clippy::all

# JavaScript syntax check (from project root)
for file in ui/*.js; do
  echo "Checking $file"
  node -c "$file"
done

# HTML validation (from project root)  
for file in ui/*.html; do
  echo "Checking $file"
  grep -q "<!DOCTYPE html>" "$file" || (echo "Missing DOCTYPE in $file" && exit 1)
  grep -q "<html" "$file" || (echo "Missing html tag in $file" && exit 1)
  grep -q "</html>" "$file" || (echo "Missing closing html tag in $file" && exit 1)
done
```

**Note**: Run clippy with `--all-targets --all-features` to catch all warnings including test code.

### 3. Verify Build Success
```bash
# Test Tauri application builds successfully
cd src-tauri
export TAURI_SKIP_ICON_GENERATION=true
export CI=true
cargo build --release
```

### 4. Manual Testing (for UI changes)
- Open `ui/test-runner.html` in Tauri app
- Test affected functionality manually
- Verify no console errors or warnings

### 5. Only Commit if ALL Pass
- ✅ All tests pass (`./run-tests.sh` returns 0)
- ✅ No formatting issues (`cargo fmt` makes no changes)
- ✅ No linting errors (`cargo clippy` returns clean)
- ✅ Build succeeds (`cargo build --release` completes)
- ✅ Manual testing confirms functionality works

**NEVER commit without running this full validation. This prevents CI failures and maintains code quality.**

## 🚨 DEBUG CODE GUIDELINES 🚨

**When adding temporary debug code for testing or troubleshooting:**

### 1. Always Mark Debug Code Clearly
```javascript
// ============ DEBUG START: [Purpose] ============
console.log('Debug: Testing zoom functionality');
setTimeout(() => {
    console.log('Debug: Auto-testing zoom');
    // Debug code here
}, 1000);
// ============ DEBUG END: [Purpose] ============
```

```rust
// ============ DEBUG START: [Purpose] ============ 
println!("Debug: Testing file operations");
// Debug code here
// ============ DEBUG END: [Purpose] ============
```

### 2. Debug Code Requirements
- **Clear markers**: Use `DEBUG START` and `DEBUG END` comments
- **Purpose description**: Explain what the debug code is testing
- **Easy identification**: Use consistent comment formatting
- **Temporary only**: Debug code should never be committed to main branch
- **Remove before PR**: Always clean up debug code before pull requests

### 3. Debug Code Examples

**Good Debug Marking:**
```javascript
// ============ DEBUG START: Auto-zoom testing ============
setTimeout(() => {
    console.log('Debug: Testing automatic zoom functionality');
    zoomIn();
    console.log('Debug: Zoom level after auto-zoom:', zoomLevel);
}, 1000);
// ============ DEBUG END: Auto-zoom testing ============
```

**Bad Debug Code (unmarked):**
```javascript
// This was the problematic code that caused the 110% zoom issue
setTimeout(() => {
    console.log('Testing zoom functionality after initialization...');
    zoomIn(); // No clear marking that this is debug code
}, 1000);
```

### 4. Debug Code Cleanup
- **Before every commit**: Search for `DEBUG START` in all files
- **Before pull requests**: Ensure no debug markers remain
- **Code reviews**: Reviewers should flag any unmarked debug code
- **CI validation**: Consider adding checks for debug markers

## Tech Debt and Code Review

### Regular Maintenance Tasks

**Quarterly Review**:
- Audit console.log statements - remove non-essential ones
- Check for TODOs and FIXMEs - address or document
- Review dependencies for updates
- Run clippy with `--all-targets` and fix warnings
- Update documentation for new patterns

**Code Review Checklist**:
- ✅ All functions documented (Rust doc comments)
- ✅ Minimal logging (errors only, critical state)
- ✅ No placeholder metadata
- ✅ All tests passing
- ✅ Zero clippy warnings
- ✅ Conventional commit messages

### Common Tech Debt Patterns

**Frontend**:
- Excessive `console.log` statements (keep under 30 total)
- Hardcoded values that should be constants
- Missing accessibility attributes
- CSS not using custom properties

**Backend**:
- Missing documentation on public functions
- Debug prints in production code
- Unwrapped options without error handling (except in tests)
- Placeholder package metadata

**This prevents issues like the automatic zoom debug code that was left in production.**

## File Organization

### Repository Structure
```
.github/
  copilot-instructions.md  ← Repository-wide AI instructions (standard location)
  workflows/               ← CI/CD automation
src-tauri/
  src/main.rs             ← All Rust backend code with tests
  Cargo.toml              ← Rust dependencies and metadata
  tauri.conf.json         ← Tauri configuration
ui/
  index.html              ← Main application UI
  main.js                 ← Frontend application logic
  styles.css              ← All styling and theming
  test-*.js               ← Frontend test files
  test-runner.html        ← Manual test interface
```

### Configuration Files
- `.github/copilot-instructions.md` - Repository-wide instructions (this file)
- `.clippy.toml` - Rust linting configuration
- `run-tests.sh` - Unified test runner script

This app demonstrates a complete desktop application with proper error handling, user experience considerations, accessibility features, professional versioning, comprehensive documentation, and thorough test coverage that validates all functionality.