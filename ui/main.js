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
            console.log(`Found working invoke function at path ${i}`);
            return possiblePaths[i];
        }
    }
    return null;
}

async function initTauriAPI() {
    console.log('Initializing Tauri API...');
    
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
        window.listen = () => Promise.resolve(); // Dummy for now
        console.log('✓ Tauri API initialized successfully');
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

// Zoom state
let zoomLevel = 1.0;
const zoomStep = 0.1;
const minZoom = 0.5;
const maxZoom = 3.0;

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
const toggleNotesBtn = document.getElementById('toggle-notes');
const notesPane = document.getElementById('notes-pane');

// Zoom elements
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');
const zoomLevelEl = document.getElementById('zoom-level');

// Initialize the application
async function initApp() {
    try {
        console.log('Initializing app...');
        
        // Initialize Tauri API
        if (!(await initTauriAPI())) {
            throw new Error('Failed to initialize Tauri API');
        }
        
        // Get the app data directory
        dataDir = await window.invoke('get_app_data_dir');
        console.log('App data directory:', dataDir);
        
        // Load today's data
        await loadDayData(currentDate);
        
        // Set up event listeners
        setupEventListeners();
        
        // Set up pomodoro completion handler
        // We'll handle this with a simple timeout since listen isn't working
        console.log('Event listeners set up for pomodoro completion');
        
        // Initialize zoom level
        applyZoom();
        
        // Test zoom functionality after a short delay
        setTimeout(() => {
            console.log('Testing zoom functionality after initialization...');
            console.log('Zoom buttons:', {
                zoomIn: zoomInBtn,
                zoomOut: zoomOutBtn, 
                zoomReset: zoomResetBtn,
                zoomLevel: zoomLevelEl
            });
            
            // Test if we can call zoom functions
            console.log('Current zoom level:', zoomLevel);
            console.log('Testing zoom in function...');
            try {
                const oldLevel = zoomLevel;
                zoomIn();
                console.log('Zoom level after zoomIn():', zoomLevel, 'Changed:', zoomLevel !== oldLevel);
            } catch (e) {
                console.error('Error testing zoomIn:', e);
            }
        }, 1000);
        
        console.log('App initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to initialize the application. Error: ' + error.message);
    }
}

// Set up event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
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
        console.log('Key pressed:', e.key);
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    addTodoBtn.addEventListener('click', () => {
        console.log('Add button clicked');
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
    
    // Zoom controls
    console.log('Zoom buttons found:', {
        zoomIn: zoomInBtn ? 'exists' : 'missing',
        zoomOut: zoomOutBtn ? 'exists' : 'missing', 
        zoomReset: zoomResetBtn ? 'exists' : 'missing',
        zoomLevel: zoomLevelEl ? 'exists' : 'missing'
    });
    
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            console.log('Zoom in button clicked');
            zoomIn();
        });
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            console.log('Zoom out button clicked');
            zoomOut();
        });
    }
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            console.log('Zoom reset button clicked');
            zoomReset();
        });
    }
    
    // Keyboard shortcuts for zoom
    document.addEventListener('keydown', handleZoomKeyboard);
    
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
        console.log('Checkbox clicked for index:', index);
        toggleTodo(index);
    });
    
    const todoText = document.createElement('div');
    todoText.className = `todo-text ${todo.completed ? 'completed' : ''}`;
    todoText.textContent = todo.text;
    todoText.addEventListener('click', () => {
        console.log('Todo text clicked for index:', index);
        selectTodo(index);
    });
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'todo-actions';
    
    const moveBtn = document.createElement('button');
    moveBtn.className = 'action-btn move-btn';
    moveBtn.textContent = '→';
    moveBtn.title = 'Move to next day';
    moveBtn.addEventListener('click', (e) => {
        console.log('Move button clicked for index:', index);
        e.stopPropagation();
        moveTodoToNextDay(index);
    });
    
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete';
        deleteBtn.addEventListener('click', (e) => {
            console.log('Delete button clicked for index:', index);
            e.stopPropagation();
            e.preventDefault();
            
            console.log('Current todos before delete:', currentDayData.todos.length);
            console.log('Todo to delete:', currentDayData.todos[index]);
            
            // Use custom confirm dialog
            console.log('Showing custom confirmation dialog...');
            customConfirm(
                `Delete this todo?\n\n"${currentDayData.todos[index].text}"\n\nThis cannot be undone.`,
                '🗑️ Delete Todo'
            ).then(userConfirmed => {
                console.log('Confirmation result:', userConfirmed);
                
                if (userConfirmed) {
                    console.log('User confirmed deletion - proceeding...');
                    
                    // Update selected todo index if needed
                    if (selectedTodo === index) {
                        selectedTodo = null;
                    } else if (selectedTodo > index) {
                        selectedTodo--;
                    }
                    
                    // Remove the todo
                    currentDayData.todos.splice(index, 1);
                    console.log('Todos after delete:', currentDayData.todos.length);
                    
                    // Update UI
                    renderTodoList();
                    updatePomodoroButton();
                    saveDayData();
                    
                    customAlert('Todo deleted successfully!', '✅ Success');
                } else {
                    console.log('User cancelled deletion');
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
    console.log('addTodo called');
    const text = newTodoInput.value.trim();
    console.log('Todo text:', text);
    
    if (!text) {
        console.log('Empty text, returning');
        return;
    }
    
    try {
        console.log('Calling create_todo_item...');
        const todo = await window.invoke('create_todo_item', {
            text: text
        });
        console.log('Todo created:', todo);
        
        currentDayData.todos.push(todo);
        newTodoInput.value = '';
        renderTodoList();
        saveDayData();
    } catch (error) {
        console.error('Failed to add todo:', error);
        alert('Failed to add todo: ' + error.message);
    }
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
        
        console.log(`Moved todo "${todo.text}" to ${nextDateString}`);
        
    } catch (error) {
        console.error('Failed to move todo to next day:', error);
        alert('Failed to move todo to next day: ' + error.message);
    }
}

// Delete a todo
// Make sure this function is available globally
window.deleteTodo = function(index) {
    console.log('deleteTodo called with index:', index);
    console.log('Current todos:', currentDayData.todos);
    
    if (confirm('Are you sure you want to delete this todo?')) {
        console.log('User confirmed deletion');
        currentDayData.todos.splice(index, 1);
        
        if (selectedTodo === index) {
            selectedTodo = null;
        } else if (selectedTodo > index) {
            selectedTodo--;
        }
        
        console.log('Todos after deletion:', currentDayData.todos);
        renderTodoList();
        updatePomodoroButton();
        saveDayData();
    } else {
        console.log('User cancelled deletion');
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
    console.log('Starting pomodoro...', { selectedTodo, currentDayData });
    
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
    
    console.log(`Starting pomodoro for ${durationInSeconds} seconds for: ${todoText}`);
    
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
        
        console.log('Pomodoro started successfully');
        
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
    console.log('Starting countdown for', totalSeconds, 'seconds');
    
    pomodoroInterval = setInterval(() => {
        remaining--;
        updateDisplay();
        console.log('Countdown:', remaining);
        
        if (remaining <= 0) {
            console.log('Timer finished! Calling completion handler...');
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
                console.log('Showing completion dialog...');
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
    console.log('Toggling notes pane...', { notesPane, toggleNotesBtn });
    
    if (!notesPane) {
        console.error('Notes pane element not found!');
        return;
    }
    
    notesPane.classList.toggle('collapsed');
    const isCollapsed = notesPane.classList.contains('collapsed');
    
    if (toggleNotesBtn) {
        toggleNotesBtn.textContent = isCollapsed ? '+' : '−';
    }
    
    console.log('Notes pane toggled:', isCollapsed ? 'collapsed' : 'expanded');
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
    console.log('Zoom In clicked, current level:', zoomLevel);
    if (zoomLevel < maxZoom) {
        zoomLevel = Math.min(maxZoom, zoomLevel + zoomStep);
        applyZoom();
    } else {
        console.log('Already at maximum zoom:', maxZoom);
    }
}

function zoomOut() {
    console.log('Zoom Out clicked, current level:', zoomLevel);
    if (zoomLevel > minZoom) {
        zoomLevel = Math.max(minZoom, zoomLevel - zoomStep);
        applyZoom();
    } else {
        console.log('Already at minimum zoom:', minZoom);
    }
}

function zoomReset() {
    console.log('Zoom Reset clicked');
    zoomLevel = 1.0;
    applyZoom();
}

function applyZoom() {
    document.documentElement.style.setProperty('--zoom-scale', zoomLevel);
    document.getElementById('zoom-level').textContent = Math.round(zoomLevel * 100) + '%';
    
    console.log('Zoom level set to:', Math.round(zoomLevel * 100) + '%');
}

function handleZoomKeyboard(e) {
    // Check for Cmd (Mac) or Ctrl (Windows/Linux)
    console.log('Key event:', e.key, 'Meta:', e.metaKey, 'Ctrl:', e.ctrlKey);
    
    const isModifierPressed = e.metaKey || e.ctrlKey;
    
    if (isModifierPressed) {
        console.log('Modifier key pressed with:', e.key);
        switch(e.key) {
            case '=':
            case '+':
                console.log('Zoom in keyboard shortcut triggered');
                e.preventDefault();
                zoomIn();
                break;
            case '-':
                console.log('Zoom out keyboard shortcut triggered');
                e.preventDefault();
                zoomOut();
                break;
            case '0':
                console.log('Zoom reset keyboard shortcut triggered');
                e.preventDefault();
                zoomReset();
                break;
        }
    }
}

// Initialize when DOM is ready
function initWhenReady() {
    console.log('DOM ready, initializing todo app...');
    initApp();
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
} else {
    initWhenReady();
}