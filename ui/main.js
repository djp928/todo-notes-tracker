// Find and initialize Tauri API using the working pattern
function findTauriInvoke() {
    const possiblePaths = [
        window.__TAURI__.invoke,
        window.__TAURI__.core?.invoke,
        window.__TAURI__.tauri?.invoke,
        window.__TAURI_INVOKE__,
    ];
    
    for (let i = 0; i < possiblePaths.length; i++) {
        if (typeof possiblePaths[i] === 'function') {
            return possiblePaths[i];
        }
    }
    return null;
}

async function initTauriAPI() {
    if (!window.__TAURI__) {
        console.error('__TAURI__ not available');
        return false;
    }
    
    const invokeFunc = findTauriInvoke();
    if (!invokeFunc) {
        console.error('No invoke function found');
        return false;
    }
    
    // Test the connection
    try {
        await invokeFunc('get_app_data_dir');
        // Store globally for use throughout the app
        window.invoke = invokeFunc;
        
        return true;
    } catch (error) {
        console.error('Tauri invoke test failed:', error);
        return false;
    }
}

// Application state
let currentDate = new Date();
let currentDayData = { todos: [], notes: '' };
let selectedTodo = null;
let dataDir = '';
let pomodoroTimer = null;
let pomodoroInterval = null;

// Calendar state
let calendarDate = new Date(); // Date for which month is displayed
let activeInputDate = null; // Track which date has active input (YYYY-MM-DD format)
let calendarTodoCounts = {}; // Store todo counts by date key (YYYY-MM-DD) - { total: n, completed: n }

// Calendar input timing constants
// These delays balance responsiveness and smooth input transitions
// - INPUT_FOCUS_DELAY: Short enough to feel instant, but allows DOM to settle before focusing
// - INPUT_BLUR_DELAY: Slightly longer to allow for accidental blurs to be cancelled by user action
// - INPUT_RESTORE_DELAY: Used after DOM recreation to ensure input is available for focus
const INPUT_FOCUS_DELAY = 50;    // ms; minimal perceived delay after input appears
const INPUT_BLUR_DELAY = 150;    // ms; allows user to quickly refocus without hiding input
const INPUT_RESTORE_DELAY = 100; // ms; ensures input is present in DOM before focusing

// Panel resize state
let isResizing = false;
let currentResizeHandle = null;
let startX = 0;
let startCalendarWidth = 320; // Default calendar width
let startNotesWidth = 300;    // Default notes width
const defaultCalendarWidth = 320;
const defaultNotesWidth = 300;

// Zoom state
let zoomLevel = 1.0;
const zoomStep = 0.1;
// Zoom limits will be fetched from backend to ensure consistency
let minZoom = 0.5;
let maxZoom = 3.0;
let zoomSaveTimeout = null; // Debounce timer for zoom saves

// Dark mode state
let darkMode = false;

// DOM elements
const currentDateEl = document.getElementById('current-date');
const todoListEl = document.getElementById('todo-list');
const newTodoInput = document.getElementById('new-todo-input');
const addTodoBtn = document.getElementById('add-todo-btn');
const notesText = document.getElementById('notes-text');
const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');
const todayBtn = document.getElementById('today');
const startPomodoroBtn = document.getElementById('start-pomodoro');
const pomodoroDuration = document.getElementById('pomodoro-duration');
const pomodoroOverlay = document.getElementById('pomodoro-overlay');
const timerTask = document.getElementById('timer-task');
const timerCountdown = document.getElementById('timer-countdown');
const stopTimerBtn = document.getElementById('stop-timer');

// Calendar DOM elements
const calendarPane = document.getElementById('calendar-pane');
const toggleCalendarBtn = document.getElementById('toggle-calendar');
const calendarGrid = document.getElementById('calendar-grid');
const calendarMonthYear = document.getElementById('calendar-month-year');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const toggleNotesBtn = document.getElementById('toggle-notes');
const notesPane = document.getElementById('notes-pane');

// Resize elements
const resizeHandle1 = document.getElementById('resize-handle-1');
const resizeHandle2 = document.getElementById('resize-handle-2');
const resetPanelsBtn = document.getElementById('reset-panels');
const mainContent = document.querySelector('.main-content');

// Zoom elements
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');
const zoomLevelEl = document.getElementById('zoom-level');

// Dark mode element
const darkModeToggleBtn = document.getElementById('dark-mode-toggle');

// Initialize the application
async function initApp() {
    try {
        // Initialize Tauri API
        if (!(await initTauriAPI())) {
            throw new Error('Failed to initialize Tauri API');
        }
        
        // Get the app data directory
        dataDir = await window.invoke('get_app_data_dir');
        
        // Run one-time migration of calendar events to todos
        try {
            await window.invoke('migrate_calendar_events_to_todos', {
                dataDir: dataDir
            });
        } catch (error) {
            console.error('Migration failed but app will continue to work normally:', error);
            // Don't block app startup if migration fails
        }
        
        // Load dark mode preference BEFORE setting up event listeners to avoid race condition
        await loadDarkModePreference();
        
        // Load zoom limits from backend (single source of truth)
        await loadZoomLimits();
        
        // Load zoom preference
        await loadZoomPreference();
        
        // Load and display app version
        await loadAppVersion();
        
        // Load today's data
        await loadDayData(currentDate);
        
        // Set up event listeners (after preference is loaded)
        setupEventListeners();
        
        // Initialize calendar
        await updateCalendar();
        
        // Initialize zoom level (in case preference loading failed)
        applyZoom();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to initialize the application. Error: ' + error.message);
    }
}

// Set up event listeners
function setupEventListeners() {
    
    // Check if elements exist
    if (!newTodoInput) {
        console.error('newTodoInput element not found!');
        return;
    }
    if (!addTodoBtn) {
        console.error('addTodoBtn element not found!');
        return;
    }
    
    // Todo input
    newTodoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    addTodoBtn.addEventListener('click', () => {
        addTodo();
    });
    
    // Navigation
    prevDayBtn.addEventListener('click', () => navigateDay(-1));
    nextDayBtn.addEventListener('click', () => navigateDay(1));
    todayBtn.addEventListener('click', goToToday);
    
    // Notes
    notesText.addEventListener('input', saveNotes);
    
    // Pomodoro
    startPomodoroBtn.addEventListener('click', startPomodoro);
    stopTimerBtn.addEventListener('click', stopPomodoro);
    
    // Toggle notes pane
    toggleNotesBtn.addEventListener('click', toggleNotesPane);
    
    // Calendar controls
    if (toggleCalendarBtn) {
        toggleCalendarBtn.addEventListener('click', toggleCalendarPane);
    }
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => navigateMonth(-1));
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => navigateMonth(1));
    }
    
    // Panel resize controls
    if (resizeHandle1) {
        resizeHandle1.addEventListener('mousedown', (e) => startResize(e, 'calendar'));
    }
    if (resizeHandle2) {
        resizeHandle2.addEventListener('mousedown', (e) => startResize(e, 'notes'));
    }
    if (resetPanelsBtn) {
        resetPanelsBtn.addEventListener('click', resetPanelSizes);
    }
    
    // Global resize handlers
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    
    // Zoom controls
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            zoomIn();
        });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            zoomOut();
        });
    }
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            zoomReset();
        });
    }
    
    // Keyboard shortcuts for zoom
    document.addEventListener('keydown', handleZoomKeyboard);
    
    // Calendar input: hide when pressing ESC or clicking outside
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeDay = document.querySelector('.calendar-day.show-input');
            if (activeDay) {
                activeDay.classList.remove('show-input');
                activeInputDate = null; // Clear tracking
            }
        }
    });
    
    // Use mousedown instead of click to avoid conflicts with calendar day clicks
    document.addEventListener('mousedown', (e) => {
        // If clicking outside calendar grid, hide all event inputs
        const calendarGrid = document.getElementById('calendar-grid');
        // Check if the click is outside the calendar AND not on a calendar day
        if (calendarGrid && !calendarGrid.contains(e.target)) {
            const allDays = document.querySelectorAll('.calendar-day.show-input');
            allDays.forEach(day => day.classList.remove('show-input'));
            activeInputDate = null; // Clear tracking
        }
    });
    
    // Dark mode toggle
    if (darkModeToggleBtn) {
        darkModeToggleBtn.addEventListener('click', () => {
            toggleDarkMode();
        });
    }
    
    // Auto-save on window blur/close
    window.addEventListener('blur', saveDayData);
    window.addEventListener('beforeunload', saveDayData);
}

// Load data for a specific date
async function loadDayData(date) {
    try {
        const dateString = formatDate(date);
        currentDayData = await window.invoke('load_day_data', { 
            date: dateString, 
            dataDir: dataDir 
        });
        
        updateUI();
    } catch (error) {
        console.error('Failed to load day data:', error);
        // Create empty day data if loading fails
        currentDayData = {
            date: formatDate(date),
            todos: [],
            notes: ''
        };
        updateUI();
    }
}

// Save current day data
async function saveDayData() {
    try {
        await window.invoke('save_day_data', {
            dayData: currentDayData,
            dataDir: dataDir
        });
        
        // Update calendar todo counts for the current day
        const dateStr = formatDate(currentDate);
        const total = currentDayData.todos ? currentDayData.todos.length : 0;
        const completed = currentDayData.todos ? currentDayData.todos.filter(todo => todo.completed).length : 0;
        calendarTodoCounts[dateStr] = { total, completed };
        
        // Refresh calendar display to show updated badge
        updateCalendar();
    } catch (error) {
        console.error('Failed to save day data:', error);
    }
}

// Update the UI with current data
function updateUI() {
    // Update date display
    currentDateEl.textContent = formatDateDisplay(currentDate);
    
    // Update todo list
    renderTodoList();
    
    // Update notes
    notesText.value = currentDayData.notes || '';
    
    // Update pomodoro button state
    updatePomodoroButton();
}

// Render the todo list
function renderTodoList() {
    todoListEl.innerHTML = '';
    
    currentDayData.todos.forEach((todo, index) => {
        const todoEl = createTodoElement(todo, index);
        todoListEl.appendChild(todoEl);
    });
}

// Create a todo element
function createTodoElement(todo, index) {
    const todoEl = document.createElement('div');
    todoEl.className = `todo-item ${selectedTodo === index ? 'selected' : ''}`;
    
    // Create elements manually to use proper event listeners
    const checkbox = document.createElement('div');
    checkbox.className = `todo-checkbox ${todo.completed ? 'completed' : ''}`;
    checkbox.addEventListener('click', () => {
        toggleTodo(index);
    });
    
    const todoText = document.createElement('div');
    todoText.className = `todo-text ${todo.completed ? 'completed' : ''}`;
    todoText.textContent = todo.text;
    todoText.addEventListener('click', () => {
        selectTodo(index);
    });
    
    // Add double-click handler to edit todo
    todoText.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        editTodo(index);
    });
    
    // Add notes indicator if todo has notes
    if (todo.notes && todo.notes.trim()) {
        const notesIndicator = document.createElement('span');
        notesIndicator.className = 'notes-indicator';
        notesIndicator.textContent = '📝';
        notesIndicator.title = 'This task has notes';
        todoText.appendChild(notesIndicator);
    }
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'todo-actions';
    
    const moveBtn = document.createElement('button');
    moveBtn.className = 'action-btn move-btn';
    moveBtn.textContent = '→';
    moveBtn.title = 'Move to next day';
    moveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveTodoToNextDay(index);
    });
    
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            
            // Use custom confirm dialog
            customConfirm(
                `Delete this todo?\n\n"${currentDayData.todos[index].text}"\n\nThis cannot be undone.`,
                '🗑️ Delete Todo'
            ).then(userConfirmed => {
                
                if (userConfirmed) {
                    
                    // Update selected todo index if needed
                    if (selectedTodo === index) {
                        selectedTodo = null;
                    } else if (selectedTodo > index) {
                        selectedTodo--;
                    }
                    
                    // Remove the todo
                    currentDayData.todos.splice(index, 1);
                    
                    // Update UI
                    renderTodoList();
                    updatePomodoroButton();
                    saveDayData();
                    
                    customAlert('Todo deleted successfully!', '✅ Success');
                } else {
                }
            });
        });    actionsDiv.appendChild(moveBtn);
    actionsDiv.appendChild(deleteBtn);
    
    todoEl.appendChild(checkbox);
    todoEl.appendChild(todoText);
    todoEl.appendChild(actionsDiv);
    
    return todoEl;
}

// Add a new todo
async function addTodo() {
    const text = newTodoInput.value.trim();
    
    if (!text) {
        return;
    }
    
    try {
        const todo = await window.invoke('create_todo_item', {
            text: text
        });
        
        currentDayData.todos.push(todo);
        newTodoInput.value = '';
        renderTodoList();
        saveDayData();
    } catch (error) {
        console.error('Failed to add todo:', error);
        alert('Failed to add todo: ' + error.message);
    }
}

/**
 * Opens a modal dialog to edit a todo item's text and notes.
 * 
 * @param {number} index - The index of the todo item in the currentDayData.todos array
 * 
 * @description
 * This function displays a modal dialog allowing the user to edit both the todo text
 * and per-item notes. The modal supports:
 * - Text editing with validation (prevents empty text)
 * - Multiline notes with whitespace trimming
 * - Keyboard shortcuts: Ctrl+Enter to save, ESC to cancel
 * - Click outside modal to close (UX enhancement)
 * - Proper event cleanup to prevent memory leaks
 * 
 * @example
 * // Edit the first todo item
 * editTodo(0);
 * 
 * @requires customAlert - For validation error messages
 * @requires renderTodoList - To update UI after changes
 * @requires saveDayData - To persist changes to storage
 * 
 * @throws {Error} Implicitly if modal elements are not found in DOM
 */
function editTodo(index) {
    const todo = currentDayData.todos[index];
    
    // Get modal elements
    const modal = document.getElementById('edit-todo-modal');
    const textInput = document.getElementById('edit-todo-text');
    const notesTextarea = document.getElementById('edit-todo-notes');
    const saveBtn = document.getElementById('edit-todo-save');
    const cancelBtn = document.getElementById('edit-todo-cancel');
    
    // Populate modal with current values
    textInput.value = todo.text;
    notesTextarea.value = todo.notes || '';
    
    // Show modal
    modal.classList.remove('hidden');
    textInput.focus();
    textInput.select();
    
    // Handle save
    const handleSave = () => {
        const newText = textInput.value.trim();
        const newNotes = notesTextarea.value.trim();
        
        if (!newText) {
            customAlert('Task text cannot be empty!', '⚠️ Validation Error');
            return;
        }
        
        // Update todo
        todo.text = newText;
        todo.notes = newNotes;
        
        // Close modal and update UI
        modal.classList.add('hidden');
        cleanup();
        renderTodoList();
        saveDayData();
    };
    
    // Handle cancel
    const handleCancel = () => {
        modal.classList.add('hidden');
        cleanup();
    };
    
    // Handle ESC key (same as cancel)
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            modal.classList.add('hidden');
            cleanup();
        } else if (e.key === 'Enter' && e.ctrlKey) {
            // Ctrl+Enter to save
            handleSave();
        }
    };
    
    // Handle click outside modal to close (UX enhancement)
    const handleOutsideClick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            cleanup();
        }
    };
    
    const cleanup = () => {
        saveBtn.removeEventListener('click', handleSave);
        cancelBtn.removeEventListener('click', handleCancel);
        document.removeEventListener('keydown', handleEsc);
        modal.removeEventListener('click', handleOutsideClick);
    };
    
    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleEsc);
    modal.addEventListener('click', handleOutsideClick);
}

// Toggle todo completion
function toggleTodo(index) {
    currentDayData.todos[index].completed = !currentDayData.todos[index].completed;
    renderTodoList();
    saveDayData();
}

// Select a todo for pomodoro
function selectTodo(index) {
    selectedTodo = selectedTodo === index ? null : index;
    renderTodoList();
    updatePomodoroButton();
}

// Move todo to next day
async function moveTodoToNextDay(index) {
    const todo = currentDayData.todos[index];
    
    try {
        // Calculate next day
        const nextDay = new Date(currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDateString = formatDate(nextDay);
        
        // Load next day's data
        const nextDayData = await window.invoke('load_day_data', { 
            date: nextDateString, 
            dataDir: dataDir 
        });
        
        // Add todo to next day (reset completion status)
        const movedTodo = {
            ...todo,
            completed: false,
            move_to_next_day: false
        };
        nextDayData.todos.push(movedTodo);
        
        // Save next day's data
        await window.invoke('save_day_data', {
            dayData: nextDayData,
            dataDir: dataDir
        });
        
        // Remove from current day
        currentDayData.todos.splice(index, 1);
        
        // Update UI and save current day
        renderTodoList();
        await saveDayData();
        
        
    } catch (error) {
        console.error('Failed to move todo to next day:', error);
        alert('Failed to move todo to next day: ' + error.message);
    }
}

// Delete a todo
// Make sure this function is available globally
window.deleteTodo = function(index) {
    
    if (confirm('Are you sure you want to delete this todo?')) {
        currentDayData.todos.splice(index, 1);
        
        if (selectedTodo === index) {
            selectedTodo = null;
        } else if (selectedTodo > index) {
            selectedTodo--;
        }
        
        renderTodoList();
        updatePomodoroButton();
        saveDayData();
    } else {
    }
};

// Save notes
function saveNotes() {
    currentDayData.notes = notesText.value;
    // Debounce the save operation
    clearTimeout(saveNotesTimeout);
    saveNotesTimeout = setTimeout(saveDayData, 1000);
}
let saveNotesTimeout;

// Navigate between days
async function navigateDay(offset) {
    await saveDayData();
    
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset);
    currentDate = newDate;
    selectedTodo = null;
    
    await loadDayData(currentDate);
}

// Go to today
async function goToToday() {
    await saveDayData();
    
    currentDate = new Date();
    selectedTodo = null;
    
    await loadDayData(currentDate);
}

// Update pomodoro button state
function updatePomodoroButton() {
    const hasSelectedTodo = selectedTodo !== null && !currentDayData.todos[selectedTodo]?.completed;
    startPomodoroBtn.disabled = !hasSelectedTodo;
    
    if (hasSelectedTodo) {
        const todoText = currentDayData.todos[selectedTodo].text;
        startPomodoroBtn.textContent = `🍅 Start (${pomodoroDuration.value}min)`;
    } else {
        startPomodoroBtn.textContent = '🍅 Select a task first';
    }
}

// Start pomodoro timer
async function startPomodoro() {
    
    if (selectedTodo === null || !currentDayData.todos[selectedTodo]) {
        console.error('No todo selected for pomodoro');
        return;
    }
    
    const durationValue = pomodoroDuration.value;
    let durationInSeconds;
    let durationInMinutes;
    
    if (durationValue === '10s') {
        durationInSeconds = 10;
        durationInMinutes = 1; // Use 1 minute for backend (minimum u32), but frontend will use 10 seconds
    } else {
        durationInMinutes = parseInt(durationValue);
        durationInSeconds = durationInMinutes * 60;
    }
    
    const todoText = currentDayData.todos[selectedTodo].text;
    
    
    try {
        // Show timer overlay
        timerTask.textContent = todoText;
        pomodoroOverlay.classList.remove('hidden');
        
        // Start countdown display (frontend timer)
        startCountdown(durationInSeconds);
        
        // Only call backend timer for non-test durations
        if (durationValue !== '10s') {
            await window.invoke('start_pomodoro_timer', {
                durationMinutes: durationInMinutes,
                taskText: todoText
            });
        }
        
        
    } catch (error) {
        console.error('Failed to start pomodoro:', error);
        pomodoroOverlay.classList.add('hidden');
        alert('Failed to start pomodoro timer: ' + error.message);
    }
}

// Start countdown display
function startCountdown(totalSeconds) {
    let remaining = totalSeconds;
    
    const updateDisplay = () => {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        timerCountdown.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    
    updateDisplay();
    
    pomodoroInterval = setInterval(() => {
        remaining--;
        updateDisplay();
        
        if (remaining <= 0) {
            clearInterval(pomodoroInterval);
            pomodoroInterval = null;
            
            // Hide timer overlay
            pomodoroOverlay.classList.add('hidden');
            
            // Visual notifications
            console.log('\x07\x07\x07'); // Bell characters
            
            // Title flash
            const originalTitle = document.title;
            document.title = '🍅 TIMER DONE! 🍅';
            setTimeout(() => {
                document.title = originalTitle;
            }, 5000);
            
            // Background color flash
            document.body.style.backgroundColor = '#ff6b6b';
            setTimeout(() => {
                document.body.style.backgroundColor = '';
            }, 1000);
            
            // Show custom completion dialog
            setTimeout(() => {
                customAlert(
                    'Pomodoro session complete!\n\nGreat job! Time for a well-deserved break! 🎉',
                    '🍅 Pomodoro Complete!'
                ).then(() => {
                    // Ask to complete task
                    if (selectedTodo !== null) {
                        customConfirm(
                            'Mark this task as completed?',
                            '✅ Complete Task?'
                        ).then(shouldComplete => {
                            if (shouldComplete) {
                                currentDayData.todos[selectedTodo].completed = true;
                                selectedTodo = null;
                                renderTodoList();
                                updatePomodoroButton();
                                saveDayData();
                            }
                        });
                    }
                });
            }, 500);
        }
    }, 1000);
}

// This function is no longer used - simplified completion handling is in startCountdown

// Stop pomodoro timer
async function stopPomodoro() {
    pomodoroOverlay.classList.add('hidden');
    if (pomodoroInterval) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
    }
    
    // Tell backend to restore window size
    try {
        await window.invoke('stop_pomodoro_timer');
    } catch (error) {
        console.error('Failed to stop pomodoro timer:', error);
    }
}

// Handle pomodoro completion
async function handlePomodoroComplete(taskText) {
    stopPomodoro();
    
    // Send notification
    await window.invoke('send_notification', {
        title: 'Pomodoro Complete!',
        body: `Great job completing: ${taskText}. Time for a break!`
    });
    
    // Mark the selected todo as completed if user wants
    if (selectedTodo !== null && confirm('Pomodoro session complete! Mark this task as done?')) {
        currentDayData.todos[selectedTodo].completed = true;
        selectedTodo = null;
        renderTodoList();
        updatePomodoroButton();
        saveDayData();
    }
}

// Show browser notification
function showNotification(title, body) {
    // Check if the browser supports notifications
    if ('Notification' in window) {
        // Check if permission is granted
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            // Request permission
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body });
                }
            });
        }
    }
}

// Toggle notes pane
function toggleNotesPane() {
    
    if (!notesPane) {
        console.error('Notes pane element not found!');
        return;
    }
    
    notesPane.classList.toggle('collapsed');
    const isCollapsed = notesPane.classList.contains('collapsed');
    
    // Handle width when expanding/collapsing to work with resize functionality
    if (isCollapsed) {
        // When collapsing, the CSS will handle the 40px width
        notesPane.style.width = '';
    } else {
        // When expanding, restore to default or current width
        if (!notesPane.style.width || notesPane.style.width === '40px') {
            notesPane.style.width = defaultNotesWidth + 'px';
        }
    }
    
    if (toggleNotesBtn) {
        toggleNotesBtn.textContent = isCollapsed ? '+' : '−';
    }
    
}

// Toggle calendar pane
function toggleCalendarPane() {
    
    if (!calendarPane) {
        console.error('Calendar pane element not found!');
        return;
    }
    
    calendarPane.classList.toggle('collapsed');
    const isCollapsed = calendarPane.classList.contains('collapsed');
    
    // Handle width when expanding/collapsing to work with resize functionality
    if (isCollapsed) {
        // When collapsing, the CSS will handle the 40px width
        calendarPane.style.width = '';
    } else {
        // When expanding, restore to default or current width
        if (!calendarPane.style.width || calendarPane.style.width === '40px') {
            calendarPane.style.width = defaultCalendarWidth + 'px';
        }
    }
    
    if (toggleCalendarBtn) {
        toggleCalendarBtn.textContent = isCollapsed ? '+' : '−';
    }
    
}

// Navigate calendar months
async function navigateMonth(direction) {
    calendarDate.setMonth(calendarDate.getMonth() + direction);
    await updateCalendar();
}

// Generate and display calendar
async function updateCalendar() {
    if (!calendarGrid || !calendarMonthYear) {
        console.error('Calendar elements not found!');
        return;
    }
    
    // Load todo counts for the calendar month
    await loadCalendarTodoCounts();
    
    // Update month/year display
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[calendarDate.getMonth()];
    const year = calendarDate.getFullYear();
    calendarMonthYear.textContent = `${monthName} ${year}`;
    
    // Clear existing calendar
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const headerEl = document.createElement('div');
        headerEl.className = 'calendar-day-header';
        headerEl.textContent = day;
        calendarGrid.appendChild(headerEl);
    });
    
    // Calculate first day of month and number of days
    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const lastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay()); // Start from Sunday
    
    const today = new Date();
    const todayStr = formatDate(today);
    const currentDateStr = formatDate(currentDate);
    
    // Generate calendar days (6 weeks = 42 days)
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayEl = createCalendarDay(date, today, todayStr, currentDateStr);
        calendarGrid.appendChild(dayEl);
    }
    
    // Restore input state if there was an active input before calendar refresh
    if (activeInputDate) {
        const targetDay = calendarGrid.querySelector(`[data-date="${activeInputDate}"]`);
        if (targetDay) {
            targetDay.classList.add('show-input');
            // Focus the input after a small delay
            setTimeout(() => {
                const input = targetDay.querySelector('.calendar-event-input');
                if (input) {
                    input.focus();
                }
            }, INPUT_RESTORE_DELAY);
        }
    }
}

// Create a calendar day element
function createCalendarDay(date, today, todayStr, currentDateStr) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    const dateStr = formatDate(date);
    const dayNumber = date.getDate();
    const isCurrentMonth = date.getMonth() === calendarDate.getMonth();
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === currentDateStr;
    
    // Store date string as data attribute for easy lookup
    dayEl.dataset.date = dateStr;
    
    // Add appropriate classes
    if (!isCurrentMonth) {
        dayEl.classList.add('other-month');
    }
    if (isToday) {
        dayEl.classList.add('today');
    }
    if (isSelected) {
        dayEl.classList.add('selected');
    }
    
    // Day number
    const dayNumberEl = document.createElement('div');
    dayNumberEl.className = 'calendar-day-number';
    dayNumberEl.textContent = dayNumber;
    dayEl.appendChild(dayNumberEl);
    
    // Todo input (for creating quick todos on calendar days)
    const todoInput = document.createElement('input');
    todoInput.type = 'text';
    todoInput.className = 'calendar-event-input';
    todoInput.placeholder = 'Add todo...';
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && todoInput.value.trim()) {
            addCalendarTodo(date, todoInput.value.trim());
            todoInput.value = '';
            // Keep the input visible and focused so user can add more todos
            todoInput.focus();
        }
    });
    todoInput.addEventListener('blur', (e) => {
        // Hide input when it loses focus, but with a small delay
        // to allow clicking on the input again without it hiding
        setTimeout(() => {
            if (document.activeElement !== todoInput) {
                dayEl.classList.remove('show-input');
                activeInputDate = null; // Clear tracking
            }
        }, INPUT_BLUR_DELAY);
    });
    // Prevent clicks on input from propagating to day click handler
    todoInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    dayEl.appendChild(todoInput);
    
    // Events container (kept for styling compatibility, but no longer used for events)
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'calendar-events';
    dayEl.appendChild(eventsContainer);
    
    // Add todo count badge if there are todos for this day
    const todoCount = calendarTodoCounts[dateStr];
    if (todoCount && todoCount.total > 0) {
        const badge = document.createElement('div');
        badge.className = 'calendar-todo-badge';
        
        // Determine badge class based on completion status
        if (todoCount.completed === todoCount.total) {
            badge.classList.add('all-complete');
        } else if (todoCount.completed > 0) {
            badge.classList.add('partial-complete');
        } else {
            badge.classList.add('none-complete');
        }
        
        // Display format: "2/5" (completed/total)
        badge.textContent = `${todoCount.completed}/${todoCount.total}`;
        badge.title = `${todoCount.completed} of ${todoCount.total} todos completed`;
        
        dayEl.appendChild(badge);
    }
    
    // Click handler to navigate to this day and show input
    dayEl.addEventListener('click', (e) => {
        // Stop propagation to prevent document click handler from firing
        e.stopPropagation();
        
        // If clicking on the input itself, let it handle normally
        if (e.target === todoInput) {
            return;
        }
        
        // Remove show-input class from the currently active day, if it's not the one being clicked
        const activeDay = document.querySelector('.calendar-day.show-input');
        if (activeDay && activeDay !== dayEl) {
            activeDay.classList.remove('show-input');
        }
        
        // Check if this day already has input showing
        const hadInput = dayEl.classList.contains('show-input');
        
        if (hadInput) {
            // Hide the input
            dayEl.classList.remove('show-input');
            activeInputDate = null;
        } else {
            // Show the input and track it
            dayEl.classList.add('show-input');
            activeInputDate = dateStr;
            
            // Focus the input after a small delay
            setTimeout(() => {
                todoInput.focus();
            }, INPUT_FOCUS_DELAY);
        }
        
        // Navigate to this day
        navigateToDate(date);
    });
    
    return dayEl;
}

// Add a todo directly from the calendar
async function addCalendarTodo(date, todoText) {
    try {
        const dateStr = formatDate(date);
        
        // Load the day data for the date
        const dayData = await window.invoke('load_day_data', { 
            date: dateStr, 
            dataDir: dataDir 
        });
        
        // Ensure the dayData has the correct date field
        if (!dayData.date) {
            dayData.date = dateStr;
        }
        
        // Create the todo item using the backend command
        const newTodo = await window.invoke('create_todo_item', {
            text: todoText
        });
        
        dayData.todos.push(newTodo);
        
        // Save the updated day data
        await window.invoke('save_day_data', {
            dayData: dayData,
            dataDir: dataDir
        });
        
        // If this is the current day, update the UI
        if (dateStr === formatDate(currentDate)) {
            currentDayData = dayData;
            updateUI();
        }
        
        // Update calendar display to show new todo count
        await updateCalendar();
        
    } catch (error) {
        console.error('Failed to add todo from calendar:', error);
        showCustomAlert('Error', 'Failed to add todo: ' + error.message);
    }
}

// Navigate to a specific date
async function navigateToDate(date) {
    currentDate = new Date(date);
    calendarDate = new Date(date); // Update calendar view to show the selected month
    await loadDayData(currentDate);
    await updateCalendar(); // Refresh calendar to show new selection
}

/// Load todo counts for all days in the current calendar month
/// This loads the actual todo data for each day to display counts in the calendar
async function loadCalendarTodoCounts() {
    calendarTodoCounts = {}; // Clear existing counts
    
    // Get first and last day of the calendar view (6 weeks = 42 days)
    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay()); // Start from Sunday
    
    // Load todos for all 42 days shown in calendar
    const loadPromises = [];
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = formatDate(date);
        
        // Load day data for this date
        const promise = window.invoke('load_day_data', { 
            date: dateStr, 
            dataDir: dataDir 
        }).then(dayData => {
            // Count total and completed todos
            const total = dayData.todos ? dayData.todos.length : 0;
            const completed = dayData.todos ? dayData.todos.filter(todo => todo.completed).length : 0;
            
            calendarTodoCounts[dateStr] = { total, completed };
        }).catch(error => {
            // If loading fails, assume no todos
            calendarTodoCounts[dateStr] = { total: 0, completed: 0 };
        });
        
        loadPromises.push(promise);
    }
    
    // Wait for all loads to complete
    await Promise.all(loadPromises);
}

// Panel resizing functions
function startResize(e, panelType) {
    e.preventDefault();
    isResizing = true;
    currentResizeHandle = panelType;
    startX = e.clientX;
    
    if (panelType === 'calendar') {
        startCalendarWidth = calendarPane.offsetWidth;
    } else if (panelType === 'notes') {
        startNotesWidth = notesPane.offsetWidth;
    }
    
    mainContent.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    
}

function handleResize(e) {
    if (!isResizing || !currentResizeHandle) return;
    
    e.preventDefault();
    const deltaX = e.clientX - startX;
    
    if (currentResizeHandle === 'calendar') {
        const newWidth = Math.max(200, Math.min(600, startCalendarWidth + deltaX));
        if (!calendarPane.classList.contains('collapsed')) {
            calendarPane.style.width = newWidth + 'px';
        }
    } else if (currentResizeHandle === 'notes') {
        const newWidth = Math.max(200, Math.min(500, startNotesWidth - deltaX));
        if (!notesPane.classList.contains('collapsed')) {
            notesPane.style.width = newWidth + 'px';
        }
    }
}

function stopResize() {
    if (!isResizing) return;
    
    isResizing = false;
    currentResizeHandle = null;
    mainContent.classList.remove('resizing');
    document.body.style.cursor = '';
    
}

function resetPanelSizes() {
    
    if (!calendarPane.classList.contains('collapsed')) {
        calendarPane.style.width = defaultCalendarWidth + 'px';
    }
    if (!notesPane.classList.contains('collapsed')) {
        notesPane.style.width = defaultNotesWidth + 'px';
    }
    
    // Update calendar display to handle any sizing changes
    updateCalendar();
}

// Utility functions
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listener for pomodoro duration change
if (pomodoroDuration) {
    pomodoroDuration.addEventListener('change', updatePomodoroButton);
}

// Custom modal functions to replace alert() and confirm()
function customAlert(message, title = '🍅 Alert') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const okBtn = document.getElementById('modal-ok');
        const cancelBtn = document.getElementById('modal-cancel');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Hide cancel button for alerts
        cancelBtn.classList.add('hidden');
        okBtn.textContent = 'OK';
        
        // Show modal
        modal.classList.remove('hidden');
        okBtn.focus();
        
        // Handle OK click
        const handleOk = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
            resolve(true);
        };
        
        okBtn.addEventListener('click', handleOk);
        
        // Handle ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.classList.add('hidden');
                document.removeEventListener('keydown', handleEsc);
                resolve(true);
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

function customConfirm(message, title = '🤔 Confirm') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const okBtn = document.getElementById('modal-ok');
        const cancelBtn = document.getElementById('modal-cancel');
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Show both buttons for confirm
        cancelBtn.classList.remove('hidden');
        okBtn.textContent = 'OK';
        cancelBtn.textContent = 'Cancel';
        
        // Show modal
        modal.classList.remove('hidden');
        okBtn.focus();
        
        // Handle OK click
        const handleOk = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(true);
        };
        
        // Handle Cancel click
        const handleCancel = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(false);
        };
        
        // Handle ESC key (same as cancel)
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.classList.add('hidden');
                cleanup();
                resolve(false);
            }
        };
        
        const cleanup = () => {
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleEsc);
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        document.addEventListener('keydown', handleEsc);
    });
}

// Zoom functions
function zoomIn() {
    if (zoomLevel < maxZoom) {
        zoomLevel = Math.min(maxZoom, zoomLevel + zoomStep);
        applyZoom();
        debouncedSaveZoom();
    }
}

function zoomOut() {
    if (zoomLevel > minZoom) {
        zoomLevel = Math.max(minZoom, zoomLevel - zoomStep);
        applyZoom();
        debouncedSaveZoom();
    }
}

function zoomReset() {
    zoomLevel = 1.0;
    applyZoom();
    // Clear any pending debounced save to avoid extra write
    if (zoomSaveTimeout) {
        clearTimeout(zoomSaveTimeout);
        zoomSaveTimeout = null;
    }
    // Reset should save immediately since it's an explicit action
    saveZoomPreference();
}

// Debounced zoom save to reduce filesystem writes
function debouncedSaveZoom() {
    // Clear any existing timeout
    if (zoomSaveTimeout) {
        clearTimeout(zoomSaveTimeout);
    }
    // Set new timeout to save after 300ms of no changes
    zoomSaveTimeout = setTimeout(() => {
        saveZoomPreference();
    }, 300);
}

function applyZoom() {
    document.documentElement.style.setProperty('--zoom-scale', zoomLevel);
    document.getElementById('zoom-level').textContent = Math.round(zoomLevel * 100) + '%';
    
}

function handleZoomKeyboard(e) {
    // Check for Cmd (Mac) or Ctrl (Windows/Linux)
    
    const isModifierPressed = e.metaKey || e.ctrlKey;
    
    if (isModifierPressed) {
        switch(e.key) {
            case '=':
            case '+':
                e.preventDefault();
                zoomIn();
                break;
            case '-':
                e.preventDefault();
                zoomOut();
                break;
            case '0':
                e.preventDefault();
                zoomReset();
                break;
        }
    }
}

// Dark mode functions
function toggleDarkMode() {
    darkMode = !darkMode;
    applyDarkMode();
    saveDarkModePreference();
}

function applyDarkMode() {
    if (darkMode) {
        document.documentElement.classList.add('dark-mode');
        if (darkModeToggleBtn) {
            darkModeToggleBtn.textContent = '☀️';
            darkModeToggleBtn.title = 'Switch to light mode';
            darkModeToggleBtn.setAttribute('aria-checked', 'true');
        }
    } else {
        document.documentElement.classList.remove('dark-mode');
        if (darkModeToggleBtn) {
            darkModeToggleBtn.textContent = '🌙';
            darkModeToggleBtn.title = 'Switch to dark mode';
            darkModeToggleBtn.setAttribute('aria-checked', 'false');
        }
    }
    console.log('Dark mode:', darkMode ? 'enabled' : 'disabled');
}

async function saveDarkModePreference() {
    try {
        // Cache in localStorage for instant loading on next startup
        localStorage.setItem('darkMode', darkMode.toString());
        
        // Save to backend for persistence across devices/reinstalls
        await window.invoke('save_dark_mode_preference', {
            darkMode: darkMode
        });
    } catch (error) {
        console.error('Failed to save dark mode preference:', error);
    }
}

async function loadDarkModePreference() {
    try {
        darkMode = await window.invoke('load_dark_mode_preference');
        // Update localStorage cache to stay in sync
        localStorage.setItem('darkMode', darkMode.toString());
        applyDarkMode();
    } catch (error) {
        console.error('Failed to load dark mode preference:', error);
        // Default to light mode if loading fails
        darkMode = false;
        applyDarkMode();
    }
}

async function saveZoomPreference() {
    try {
        // Cache in localStorage for instant loading on next startup
        localStorage.setItem('zoomLevel', zoomLevel.toString());
        
        // Save to backend for persistence across devices/reinstalls
        await window.invoke('save_zoom_preference', {
            zoomLevel: zoomLevel
        });
    } catch (error) {
        console.error('Failed to save zoom preference:', error);
    }
}

async function loadZoomLimits() {
    try {
        const limits = await window.invoke('get_zoom_limits');
        minZoom = limits.min_zoom;
        maxZoom = limits.max_zoom;
        console.log('Zoom limits loaded from backend:', minZoom, '-', maxZoom);
    } catch (error) {
        console.error('Failed to load zoom limits, using defaults:', error);
        // Fallback to defaults (already set)
    }
}

/**
 * Load and display the application version from the backend.
 * 
 * This fetches the version defined in Cargo.toml at compile time,
 * ensuring the UI always shows the correct version number.
 */
async function loadAppVersion() {
    try {
        const version = await window.invoke('get_app_version');
        const versionEl = document.getElementById('app-version');
        if (versionEl) {
            versionEl.textContent = `v${version}`;
        }
    } catch (error) {
        console.error('Failed to load app version:', error);
        // Keep default "Loading..." or set a fallback
        const versionEl = document.getElementById('app-version');
        if (versionEl) {
            versionEl.textContent = 'v?.?.?';
        }
    }
}

async function loadZoomPreference() {
    try {
        zoomLevel = await window.invoke('load_zoom_preference');
        
        // Validate and clamp zoom level to supported range using defined constants
        if (Number.isNaN(zoomLevel) || zoomLevel < minZoom || zoomLevel > maxZoom) {
            console.warn('Invalid zoom level loaded:', zoomLevel, '- resetting to 1.0');
            zoomLevel = 1.0;
        }
        
        // Update localStorage cache to stay in sync
        localStorage.setItem('zoomLevel', zoomLevel.toString());
        applyZoom();
    } catch (error) {
        console.error('Failed to load zoom preference:', error);
        // Default to 100% zoom if loading fails
        zoomLevel = 1.0;
        // Update cache to prevent visual flash on next startup
        localStorage.setItem('zoomLevel', zoomLevel.toString());
        applyZoom();
    }
}

// Initialize when DOM is ready
function initWhenReady() {
    initApp();
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
    initWhenReady();
}