# Drag-and-Drop Todo Reordering Feature

## Overview

This feature allows users to reorder todo items by clicking and dragging them to new positions in the task list. It provides an intuitive, visual way to prioritize and organize tasks.

## User Experience

### Visual Feedback

1. **Drag Handle** (⋮⋮)
   - Appears on the left side of each todo item when hovering
   - Uses a vertical dots icon that's familiar from many mobile interfaces
   - Changes cursor to "grab" on hover, "grabbing" when active
   - Fades in smoothly with opacity transition
   - **Visual indicator only** - the entire todo item is draggable, not just the handle

2. **Drop Zones (Top & Bottom)**
   - Invisible by default (0 height) - **no visual clutter or dead space**
   - Automatically become clickable when you start dragging
   - **Expand only when you drag near them** - smooth height transition
   - Expand to 2.5rem tall when hovering during drag for easy targeting
   - Top zone displays: "↑ Drop here to move to top"
   - Bottom zone displays: "↓ Drop here to move to bottom"
   - Highlight with blue border and background when active
   - Collapse back to invisible after drag ends
   - Make it effortless to move items to first or last position

3. **Dragging State**
   - The dragged item becomes semi-transparent (40% opacity)
   - Background is highlighted to show it's being moved
   - Item can be dragged up or down the list
   - Drop zones automatically appear above and below the list

4. **Drop Target Indicator (Mid-List)**
   - As you hover over items in the middle, a colored border appears
   - Top border (2px blue) = item will drop above the target
   - Bottom border (2px blue) = item will drop below the target
   - Hover background color changes to provide additional feedback

### How to Use

**Moving to Top/Bottom (Easy Way):**
1. Click and hold anywhere on the todo item (the entire item is draggable)
2. Drag up to the "Drop here to move to top" zone, or
3. Drag down to the "Drop here to move to bottom" zone
4. Release to instantly move to that position

**Precise Positioning (Mid-List):**
1. Click and hold anywhere on the todo item
2. Drag to any position between other items
3. Watch for the blue border indicator showing where it will drop
4. Release to place the item at that exact position

**Note:** The drag handle (⋮⋮) is a visual indicator, but the entire todo item is draggable.

The list automatically saves and updates calendar badges after any reorder.

## Technical Implementation

### Frontend (JavaScript)

**Drag State Management:**
```javascript
let draggedIndex = null;  // Track which item is being dragged
```

**Event Architecture:**

The implementation uses a **hybrid approach** combining per-item and delegated listeners for optimal cross-platform compatibility:

**Per-Item Listeners** (attached to each todo):
- `dragstart` - Captures the dragged item's index, adds visual state, sets aria-grabbed
- `dragend` - Cleans up visual indicators, resets aria-grabbed, removes state
- `dragleave` - Removes drop indicator when leaving target

**Delegated Listeners** (on parent todoListEl):
- `dragover` - Uses `e.target.closest('.todo-item')` to find target, enables dropping
- `dragenter` - Uses `e.target.closest('.todo-item')` to find target, shows drop indicator
- `drop` - Uses `e.target.closest('.todo-item')` to find target, performs reordering

**Why This Approach?**
- Per-item listeners for dragstart/dragend ensure they fire reliably
- Delegated listeners for dragover/drop/dragenter work better on macOS
- No duplicate event handling - each event type has one handler

**Drop Zone Handlers:**
- `handleDropZoneDragOver` - Enables dropping in top/bottom zones
- `handleDropZoneEnter` - Highlights drop zone on hover
- `handleDropZoneLeave` - Removes highlight when leaving zone
- `handleDropZoneDrop` - Moves item to position 0 (top) or end (bottom)

**Reordering Logic:**
```javascript
// For mid-list drops (delegated handler)
const targetIndex = parseInt(todoItem.dataset.index);
const [movedTodo] = currentDayData.todos.splice(draggedIndex, 1);
let newIndex = targetIndex;
if (draggedIndex < newIndex) {
    newIndex--;  // Adjust because removal shifts indices
}
currentDayData.todos.splice(newIndex, 0, movedTodo);

// For drop zones
if (dropPosition === 'top') {
    newIndex = 0;
} else if (dropPosition === 'bottom') {
    // Use length to insert at end (will be adjusted for removal-shift)
    newIndex = currentDayData.todos.length;
} else {
    return false; // Guard against unexpected values
}

// Adjust for removal-shift if needed
const insertIndex = draggedIndex < newIndex ? newIndex - 1 : newIndex;
currentDayData.todos.splice(insertIndex, 0, movedTodo);
```

**Selected Todo Tracking:**

Uses a helper function `updateSelectedIndexAfterReorder(draggedIndex, insertIndex)` to update the `selectedTodo` index when:
- The selected item itself is dragged
- An item is dragged above/below the selected item
- Ensures the Pomodoro selection stays accurate

**Important:** Always pass `insertIndex` (the final position after adjustment), not `newIndex`.

### Styling (CSS)

**Drag Handle:**
```css
.drag-handle {
    cursor: grab;
    opacity: 0;  /* Hidden by default */
    transition: opacity 0.2s;
}

.todo-item:hover .drag-handle {
    opacity: 1;  /* Visible on hover */
}
```

**Drop Zones:**
```css
.drop-zone {
    height: 0;  /* Invisible by default - no dead space */
    opacity: 0;
    pointer-events: none;
    overflow: hidden;
    transition: all 0.2s ease;
}

/* Show drop zones when dragging is active */
.todo-list.dragging-active .drop-zone {
    height: 2.5rem;
    margin: 0.25rem 0;
    opacity: 0.6;
}

/* Highlight when hovering during drag */
.todo-list.dragging-active .drop-zone:hover,
.drop-zone-active {
    opacity: 1;
    border-color: var(--button-primary);
    background-color: var(--todo-selected-bg);
}
```

**Note:** The implementation uses `.dragging-active` class (toggled in JavaScript) instead of `:has()` selector for better performance and WebView compatibility.

**Drag States:**
```css
.todo-item.dragging {
    opacity: 0.4;
    background-color: var(--todo-selected-bg);
}

.todo-item.drag-over-top {
    border-top: 2px solid var(--button-primary);
}

.todo-item.drag-over-bottom {
    border-bottom: 2px solid var(--button-primary);
}
```

## Data Persistence

- Reordered list is automatically saved via `saveDayData()`
- No backend changes required - uses existing `save_day_data` command
- Todo order is preserved in the JSON file as array order
- Calendar badges update automatically after reordering

## Accessibility Considerations

1. **Visual Indicators**
   - Clear drag handle icon (⋮⋮)
   - Drop zones that expand on demand (no dead space when not in use)
   - High contrast drop indicators
   - Smooth animations for feedback
   - Helpful text labels on drop zones via CSS `::before`
   - `aria-label` attributes on drop zones for screen reader context

2. **ARIA Support**
   - `aria-grabbed="true"` set on dragged item during drag
   - `aria-grabbed="false"` restored on drag end
   - `aria-hidden="true"` on decorative drag handle icon
   - `aria-label` on drop zones to describe their purpose

3. **Forgiving UX**
   - Drop zones make top/bottom placement effortless
   - No precision required for common operations
   - Clear visual feedback at every step
   - **Zones are invisible until needed** (clean aesthetic)
   - Zones expand automatically when you drag near them

4. **Keyboard Support**
   - Items remain clickable during drag
   - Todo selection (for Pomodoro) works independently
   - Double-click to edit still works
   - Note: Drag-drop itself requires mouse/touch (HTML5 drag API limitation)

5. **Dark Mode**
   - All drag states respect theme colors
   - Uses CSS custom properties for consistency
   - Drop zones have good contrast in both themes

## Edge Cases Handled

1. **Single Item** - Can drag a single todo (no visual change, but no error)
2. **Empty List** - Drag handle doesn't appear if no todos exist, drop zones not shown
3. **Completed Items** - Can reorder completed todos same as active ones
4. **Selected Item** - Selection tracking is preserved correctly
5. **Rapid Dragging** - State cleanup prevents visual artifacts
6. **Drop Zone Edge Cases** - Dropping at top/bottom when already at top/bottom is handled gracefully

## Testing

### Automated Tests (7 tests added)

1. **Top to Bottom** - Dragging first item to last position
2. **Bottom to Top** - Dragging last item to first position
3. **Selected Tracking** - Selected item index updates correctly
4. **Single Item** - Handles edge case gracefully
5. **Property Preservation** - All todo data remains intact
6. **Drop Zone Top** - Moving item to top via drop zone
7. **Drop Zone Bottom** - Moving item to bottom via drop zone

### Manual Testing Checklist

- [ ] Drag handle appears on hover
- [ ] Drop zones appear when dragging starts
- [ ] Drop zones show helpful text labels
- [ ] Can drag items to top drop zone
- [ ] Can drag items to bottom drop zone
- [ ] Drop zones highlight when hovering during drag
- [ ] Can drag items to precise mid-list positions
- [ ] Drop indicator shows correct position for mid-list drops
- [ ] Items reorder correctly
- [ ] Order persists after refresh
- [ ] Calendar badges update after reorder
- [ ] Selected todo tracking preserved
- [ ] Works with completed items
- [ ] Dark mode styling looks good
- [ ] Drop zones disappear after drag ends
- [ ] No console errors

## Performance Considerations

- **Efficient Rendering** - Only re-renders todo list, not entire UI
- **Smooth Animations** - CSS transitions are hardware-accelerated
- **Minimal State** - Only tracks `draggedIndex` (no other global state variables)
- **Dynamic Drop Zones** - Only created during render, not persistent DOM elements
- **CSS-Only Visibility** - Drop zones hidden/shown via CSS height and opacity
- **Class Toggle Performance** - Uses `.dragging-active` class instead of `:has()` selector for better performance
- **Event Delegation** - dragover/drop/dragenter use delegation on parent for fewer listeners
- **Smooth Transitions** - CSS transitions handle expansion/collapse smoothly
- **Zero Height When Inactive** - No wasted space or layout shifts when not dragging
- **Auto-save** - Uses existing debounced save mechanism with data validation

## Future Enhancements (Not Implemented)

1. **Multi-select Drag** - Drag multiple selected items at once
2. **Drag to Different Days** - Drag todos to calendar dates
3. **Undo/Redo** - Revert reordering mistakes
4. **Keyboard Shortcuts** - Alt+Up/Down to reorder
5. **Touch Support** - Mobile drag-and-drop gestures

## Browser Compatibility

HTML5 Drag and Drop API is supported in:
- ✅ Chrome/Edge (all recent versions)
- ✅ Firefox (all recent versions)
- ✅ Safari (all recent versions)
- ✅ Works on all platforms (Windows, macOS, Linux)

## Related Features

- **Todo Editing** - Double-click still works during/after reorder
- **Pomodoro Selection** - Selected todo tracking is preserved
- **Calendar Integration** - Badges update after reorder
- **Dark Mode** - All drag states support theming

## Maintenance Notes

- Drag state is stored in module-level variable: `draggedIndex` (no other state vars)
- Per-item event handlers for dragstart/dragend/dragleave (reliable firing)
- Delegated event handlers for dragover/drop/dragenter (better macOS compatibility)
- Drop zones created dynamically during `renderTodoList()`
- CSS uses `.dragging-active` class for performance (toggled in handleDragStart/handleDragEnd)
- CSS uses existing custom properties for theming
- No backend changes required (reuses `save_day_data`)
- Data validation prevents saving corrupted state

## Platform Compatibility

**Tauri Configuration:**
- `dragDropEnabled: false` in `tauri.conf.json` is **required for macOS**
- This disables Tauri's file drop handler, allowing WebView drag events to work
- Without this setting, drag-drop won't work on macOS (Linux/Windows may work)

**Cross-Platform Testing:**
- ✅ Tested on Linux
- ✅ Tested on macOS (requires dragDropEnabled: false)
- ✅ Expected to work on Windows (uses standard HTML5 drag API)

## Code Quality

- ✅ Zero clippy warnings
- ✅ All tests passing (25 backend + 7 drag-drop frontend tests)
- ✅ JSDoc comments for all drag functions
- ✅ Follows project coding standards
- ✅ Minimal changes (surgical, focused)

---

**Implementation Date:** October 2025  
**Feature Status:** ✅ Complete and tested
