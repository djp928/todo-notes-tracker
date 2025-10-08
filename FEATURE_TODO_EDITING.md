# Todo Item Editing Feature

## Overview
This feature adds the ability to edit todo items by double-clicking on them, along with support for per-item notes that are separate from the general sidebar notes.

## What's New

### 1. Double-Click to Edit
- Double-click any todo item text to open the edit dialog
- Edit the task text and/or add notes specific to that task
- Save with the Save button or Ctrl+Enter
- Cancel with the Cancel button or ESC key

### 2. Per-Item Notes
- Each todo item now has its own notes field
- Notes are stored with the todo item, not in the general sidebar
- Notes are preserved when moving todos to another day
- Notes persist across app restarts

### 3. Visual Indicator
- A 📝 emoji appears next to todo items that have notes
- Only appears when the todo has non-empty notes
- Helps identify which tasks have additional information

## Technical Implementation

### Backend Changes
**File: `src-tauri/src/main.rs`**
- Added `notes: String` field to `TodoItem` struct
- Used `#[serde(default)]` for backward compatibility with existing data
- Updated `create_todo_item` command to initialize notes as empty string
- Updated tests to verify notes field handling

### Frontend Changes

**File: `ui/index.html`**
- Added new modal dialog for editing todos: `#edit-todo-modal`
- Modal includes:
  - Text input for todo text
  - Textarea for notes (8 rows, expandable)
  - Save and Cancel buttons

**File: `ui/main.js`**
- Added `editTodo(index)` function to handle todo editing
- Updated `createTodoElement()` to:
  - Add double-click event listener on todo text
  - Render notes indicator when todo has notes
- Modal features:
  - Auto-focus and select todo text on open
  - Validation: prevents saving empty todo text
  - Keyboard shortcuts: Ctrl+Enter to save, ESC to cancel
  - Proper event cleanup to prevent memory leaks

**File: `ui/styles.css`**
- Added `.modal-content-large` for wider edit dialog (600px max)
- Added form input/textarea styles with focus states
- Added `.notes-indicator` style for the 📝 emoji
- All styles support both light and dark modes
- Responsive scaling with zoom feature

### Test Coverage
**File: `ui/test-suite.js`**
- New test suite: "Todo Item Editing and Notes"
- Tests include:
  - Creating todos with empty notes field
  - Updating todo text and notes
  - Persisting notes across save/load
  - Backward compatibility with legacy todos (no notes field)
  - Identifying todos with notes
  - Handling empty/whitespace-only notes
  - Preserving multiline notes

## Usage Guide

### Editing a Todo Item
1. **Open the editor:**
   - Double-click on any todo item text

2. **Make changes:**
   - Update the task text in the top input field
   - Add or edit notes in the textarea below
   - Notes support multiple lines

3. **Save changes:**
   - Click "Save" button
   - Or press Ctrl+Enter

4. **Cancel changes:**
   - Click "Cancel" button
   - Or press ESC key

### Working with Notes
- Notes are optional - leave blank if not needed
- Notes are private to each todo item
- The 📝 indicator only appears when notes exist
- Notes are plain text (no formatting)
- Whitespace-only notes are treated as empty

## Backward Compatibility

The feature is fully backward compatible:
- Existing todos without the notes field will load correctly
- The `#[serde(default)]` attribute ensures missing notes default to empty string
- Old data files work without modification
- New data files include the notes field

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Double-click | Open todo editor |
| Ctrl+Enter | Save changes |
| ESC | Cancel editing |

## Testing

### Automated Tests
All tests pass:
```bash
./run-tests.sh
```

### Manual Testing
1. Start the app:
   ```bash
   cd src-tauri && cargo tauri dev
   ```

2. Test scenarios:
   - Create a new todo item
   - Double-click to edit it
   - Add some notes
   - Verify the 📝 indicator appears
   - Close and reopen the app - notes should persist
   - Edit again and remove notes - indicator should disappear

3. Frontend tests:
   - Open `ui/test-runner.html` in the app
   - Run the "Todo Item Editing and Notes" test suite

## Future Enhancements

Potential improvements for future versions:
- Rich text formatting in notes (bold, italic, lists)
- Inline preview of notes on hover
- Search functionality that includes notes
- Export/import with notes included
- Note templates for common task types
- Keyboard shortcut to open edit dialog (e.g., E key when selected)

## Files Modified

1. `src-tauri/src/main.rs` - Backend data model
2. `ui/index.html` - Edit modal HTML
3. `ui/main.js` - Edit functionality
4. `ui/styles.css` - Modal and indicator styling
5. `ui/test-suite.js` - Test coverage

## Commit Information

**Branch:** `feat/todo-item-editing-with-notes`

**Commit:** feat: add todo item editing with double-click and per-item notes

**Type:** Feature (triggers MINOR version bump)

## Screenshots

### Edit Modal
The edit modal appears when double-clicking a todo:
- Clean, focused interface
- Large text input for task
- Spacious textarea for notes
- Save/Cancel buttons clearly visible

### Notes Indicator
The 📝 emoji appears inline with todo text when notes exist:
- Subtle visual cue
- Tooltip on hover: "This task has notes"
- Doesn't interfere with task completion or selection

## Notes for Reviewers

- All existing tests pass
- New comprehensive test suite added
- Zero breaking changes
- Clippy clean (no warnings)
- Follows conventional commit format
- Documentation included
- Backward compatible with existing data

## Related Documentation

- Main README: `README.md`
- Testing Guide: `TESTING.md`
- Copilot Instructions: `.github/copilot-instructions.md`
