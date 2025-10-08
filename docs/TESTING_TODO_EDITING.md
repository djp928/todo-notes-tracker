# Manual Testing Guide for Todo Editing Feature

## Quick Start
```bash
cd src-tauri && cargo tauri dev
```

## Test Scenarios

### Test 1: Basic Todo Editing
**Steps:**
1. Create a new todo: "Buy groceries"
2. Double-click on the todo text
3. Update text to: "Buy groceries and cook dinner"
4. Add notes: "Get milk, eggs, bread\nPrepare pasta"
5. Press Ctrl+Enter to save

**Expected:**
- Todo text updates immediately
- Notes are saved
- 📝 indicator appears next to the todo

### Test 2: Notes Indicator
**Steps:**
1. Create two todos: "Task 1" and "Task 2"
2. Edit "Task 1" and add notes: "Important details here"
3. Edit "Task 2" and leave notes empty
4. Save both

**Expected:**
- Task 1 shows 📝 indicator
- Task 2 shows no indicator

### Test 3: Edit and Remove Notes
**Steps:**
1. Create todo: "Test task" with notes: "Some notes"
2. Verify 📝 appears
3. Edit todo and delete all notes
4. Save

**Expected:**
- 📝 indicator disappears after save

### Test 4: Cancel Editing
**Steps:**
1. Create todo: "Original text" with notes: "Original notes"
2. Double-click to edit
3. Change text to: "Modified text"
4. Change notes to: "Modified notes"
5. Press ESC

**Expected:**
- Changes are discarded
- Todo remains "Original text" with "Original notes"
- 📝 indicator remains

### Test 5: Persistence
**Steps:**
1. Create todo: "Persistent task" with notes: "Test persistence"
2. Verify 📝 appears
3. Close the app
4. Reopen the app
5. Navigate to the same date

**Expected:**
- Todo and notes persist
- 📝 indicator still shows

### Test 6: Move to Next Day with Notes
**Steps:**
1. Create todo: "Task with notes" with notes: "Important info"
2. Click the → (move to next day) button
3. Navigate to next day
4. Check the moved todo

**Expected:**
- Todo appears on next day
- Notes are preserved
- 📝 indicator shows

### Test 7: Multiline Notes
**Steps:**
1. Create todo: "Project tasks"
2. Add notes with multiple lines:
   ```
   Phase 1: Research
   Phase 2: Design
   Phase 3: Implementation
   Phase 4: Testing
   ```
3. Save and close
4. Reopen editor

**Expected:**
- All lines preserved
- Formatting maintained

### Test 8: Empty Todo Validation
**Steps:**
1. Create todo: "Test validation"
2. Double-click to edit
3. Clear the text field completely
4. Try to save

**Expected:**
- Alert appears: "Task text cannot be empty!"
- Modal stays open
- Changes not saved

### Test 9: Keyboard Shortcuts
**Steps:**
1. Create todo: "Shortcut test"
2. Double-click to edit
3. Modify text and notes
4. Press Ctrl+Enter

**Expected:**
- Changes save immediately
- Modal closes

**Steps:**
1. Double-click same todo
2. Press ESC

**Expected:**
- Modal closes without changes

### Test 10: Dark Mode Compatibility
**Steps:**
1. Toggle dark mode (🌙 button)
2. Create todo and double-click to edit
3. Check modal appearance
4. Check notes indicator appearance

**Expected:**
- Modal has dark theme
- Text is readable
- Inputs have proper dark styling
- 📝 indicator visible

### Test 11: Zoom Compatibility
**Steps:**
1. Zoom in several times (+ button)
2. Create todo and edit it
3. Zoom out several times
4. Edit same todo

**Expected:**
- Modal scales properly
- Text remains readable
- Inputs scale correctly
- Save/Cancel buttons accessible

### Test 12: Backward Compatibility
**Steps:**
1. If you have old data files (before this feature):
   - Load an old date with todos
   - Try to edit an old todo
   - Add notes to it
   - Save

**Expected:**
- Old todos load correctly
- Can add notes to old todos
- No errors or crashes

## Frontend Test Runner

For automated tests:
1. In the running app, press F12 to open DevTools
2. Open `ui/test-runner.html` (may need to navigate using file menu)
3. Scroll to "Todo Item Editing and Notes" section
4. Click "Run All Tests"
5. Verify all tests pass (green checkmarks)

## Edge Cases to Test

### Empty/Whitespace Notes
- Add notes with only spaces/tabs/newlines
- Should be treated as empty (no 📝)

### Very Long Notes
- Add 1000+ characters in notes
- Should save and load correctly

### Special Characters in Notes
- Test with: `<script>alert("xss")</script>`
- Test with: `"quotes" and 'apostrophes'`
- Test with: Emojis 🎉 and symbols ©®™

### Rapid Editing
- Edit todo multiple times quickly
- Verify no data loss or corruption

## Checklist

- [ ] Basic editing works
- [ ] Notes indicator appears/disappears correctly
- [ ] Double-click opens editor
- [ ] Ctrl+Enter saves
- [ ] ESC cancels
- [ ] Empty text validation works
- [ ] Notes persist after restart
- [ ] Notes preserved when moving todos
- [ ] Dark mode looks good
- [ ] Zoom doesn't break layout
- [ ] No console errors
- [ ] All automated tests pass

## Known Issues
None currently. Report any issues found during testing.

## Performance Notes
- Opening edit modal is instant
- Saving is immediate (local file I/O)
- No lag or freezing observed
- Memory usage stable

## Browser Console
Check for:
- No error messages
- No warning messages
- Clean console output

If you see errors, capture:
1. The full error message
2. Steps to reproduce
3. Browser/OS information
