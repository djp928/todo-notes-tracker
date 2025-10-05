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
let calendarEvents = {}; // Store events by date key (YYYY-MM-DD)

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
const minZoom = 0.5;
const maxZoom = 3.0;

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
        
        // Load dark mode preference BEFORE setting up event listeners to avoid race condition
        await loadDarkModePreference();
        
        // Load zoom preference
        await loadZoomPreference();
        
        // Load today's data
        await loadDayData(currentDate);
        
        // Load calendar events
        await loadCalendarEventsFromStorage();
        
        // Set up event listeners (after preference is loaded)
        setupEventListeners();
        
        // Initialize calendar
        updateCalendar();
        
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
function navigateMonth(direction) {
    calendarDate.setMonth(calendarDate.getMonth() + direction);
    updateCalendar();
}

// Generate and display calendar
function updateCalendar() {
    if (!calendarGrid || !calendarMonthYear) {
        console.error('Calendar elements not found!');
        return;
    }
    
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
    
    // Event input
    const eventInput = document.createElement('input');
    eventInput.type = 'text';
    eventInput.className = 'calendar-event-input';
    eventInput.placeholder = 'Add event...';
    eventInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && eventInput.value.trim()) {
            addCalendarEvent(date, eventInput.value.trim());
            eventInput.value = '';
        }
    });
    dayEl.appendChild(eventInput);
    
    // Events container
    const eventsContainer = document.createElement('div');
    eventsContainer.className = 'calendar-events';
    dayEl.appendChild(eventsContainer);
    
    // Load existing events for this day
    loadCalendarEventsForDay(dateStr, eventsContainer);
    
    // Click handler to navigate to this day
    dayEl.addEventListener('click', (e) => {
        if (e.target !== eventInput) {
            navigateToDate(date);
        }
    });
    
    return dayEl;
}

// Add an event to a calendar day
async function addCalendarEvent(date, eventText) {
    try {
        const dateStr = formatDate(date);
        
        // Store event in calendar events
        if (!calendarEvents[dateStr]) {
            calendarEvents[dateStr] = [];
        }
        calendarEvents[dateStr].push(eventText);
        
        // Save calendar events to storage
        await saveCalendarEvents();
        
        // Create a corresponding todo item
        await createTodoFromEvent(date, eventText);
        
        // Update calendar display
        updateCalendar();
        
    } catch (error) {
        console.error('Failed to add calendar event:', error);
        showCustomAlert('Error', 'Failed to add calendar event: ' + error.message);
    }
}

// Create a todo item from a calendar event
async function createTodoFromEvent(date, eventText) {
    try {
        // Load the day data for the event date
        const dateStr = formatDate(date);
        
        const dayData = await window.invoke('load_day_data', { 
            date: dateStr, 
            dataDir: dataDir 
        });
        
        
        // Ensure the dayData has the correct date field (the backend expects a date field)
        if (!dayData.date) {
            dayData.date = dateStr;
        }
        
        // Create the todo item using the backend command (same as regular todo creation)
        const newTodo = await window.invoke('create_todo_item', {
            text: `📅 ${eventText}`
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
        } else {
        }
        
    } catch (error) {
        console.error('Failed to create todo from event:', error);
        throw error;
    }
}

// Load events for a specific day and display them in the UI
function loadCalendarEventsForDay(dateStr, container) {
    if (calendarEvents[dateStr]) {
        calendarEvents[dateStr].forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'calendar-event';
            eventEl.textContent = event;
            eventEl.addEventListener('click', (e) => {
                e.stopPropagation();
                // TODO: Add event editing/deletion functionality
            });
            container.appendChild(eventEl);
        });
    }
}

// Navigate to a specific date
async function navigateToDate(date) {
    currentDate = new Date(date);
    calendarDate = new Date(date); // Update calendar view to show the selected month
    await loadDayData(currentDate);
    updateCalendar(); // Refresh calendar to show new selection
}

// Save calendar events to persistent storage
async function saveCalendarEvents() {
    try {
        await window.invoke('save_calendar_events', {
            events: calendarEvents,
            dataDir: dataDir
        });
    } catch (error) {
        console.error('Failed to save calendar events:', error);
    }
}

// Load calendar events from persistent storage
async function loadCalendarEventsFromStorage() {
    try {
        const events = await window.invoke('load_calendar_events', {
            dataDir: dataDir
        });
        calendarEvents = events || {};
    } catch (error) {
        console.error('Failed to load calendar events:', error);
        // Initialize with empty object if loading fails
        calendarEvents = {};
    }
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
        saveZoomPreference();
    } else {
    }
}

function zoomOut() {
    if (zoomLevel > minZoom) {
        zoomLevel = Math.max(minZoom, zoomLevel - zoomStep);
        applyZoom();
        saveZoomPreference();
    } else {
    }
}

function zoomReset() {
    zoomLevel = 1.0;
    applyZoom();
    saveZoomPreference();
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
        document.body.classList.add('dark-mode');
        if (darkModeToggleBtn) {
            darkModeToggleBtn.textContent = '☀️';
            darkModeToggleBtn.title = 'Switch to light mode';
            darkModeToggleBtn.setAttribute('aria-checked', 'true');
        }
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
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

async function loadZoomPreference() {
    try {
        zoomLevel = await window.invoke('load_zoom_preference');
        // Update localStorage cache to stay in sync
        localStorage.setItem('zoomLevel', zoomLevel.toString());
        applyZoom();
    } catch (error) {
        console.error('Failed to load zoom preference:', error);
        // Default to 100% zoom if loading fails
        zoomLevel = 1.0;
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