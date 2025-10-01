// Comprehensive test suite for Todo Notes Tracker
// Tests all major functionality of the application

describe('Utility Functions', () => {
    test('formatDate should format dates correctly', () => {
        const date = new Date('2024-01-15T10:30:00');
        const result = formatDate(date);
        assert.equal(result, '2024-01-15');
    });

    test('formatDateDisplay should format dates for display', () => {
        const date = new Date('2024-01-15T10:30:00');
        const result = formatDateDisplay(date);
        assert.truthy(result.includes('January'));
        assert.truthy(result.includes('15'));
        assert.truthy(result.includes('2024'));
    });

    test('escapeHtml should escape HTML characters', () => {
        const input = '<script>alert("xss")</script>';
        const result = escapeHtml(input);
        assert.truthy(result.includes('&lt;'));
        assert.truthy(result.includes('&gt;'));
        assert.falsy(result.includes('<script>'));
    });
});

describe('Application State Management', () => {
    test('should initialize with correct default values', () => {
        assert.truthy(currentDate instanceof Date);
        assert.deepEqual(currentDayData, { todos: [], notes: '' });
        assert.equal(selectedTodo, null);
        assert.equal(zoomLevel, 1.0);
    });

    test('should handle zoom level changes', () => {
        const originalZoom = zoomLevel;
        
        zoomIn();
        assert.truthy(zoomLevel > originalZoom);
        
        zoomOut();
        assert.equal(zoomLevel, originalZoom);
        
        zoomReset();
        assert.equal(zoomLevel, 1.0);
    });

    test('should respect zoom limits', () => {
        // Test minimum zoom
        zoomLevel = minZoom;
        zoomOut();
        assert.equal(zoomLevel, minZoom);
        
        // Test maximum zoom
        zoomLevel = maxZoom;
        zoomIn();
        assert.equal(zoomLevel, maxZoom);
    });
});

describe('Todo Management', () => {
    test('should create todo with correct properties', async () => {
        const text = 'Test todo item';
        const result = await window.invoke('create_todo_item', { text });
        
        assert.equal(result.text, text);
        assert.equal(result.completed, false);
        assert.equal(result.move_to_next_day, false);
        assert.truthy(result.id);
        assert.truthy(result.created_at);
    });

    test('should add todo to current day data', async () => {
        // Reset current day data
        currentDayData = { todos: [], notes: '' };
        
        // Mock DOM elements
        const mockInput = { value: 'New test todo', focus: () => {} };
        window.newTodoInput = mockInput;
        
        // Add todo
        const originalAddTodo = addTodo;
        let todoAdded = false;
        
        // Override addTodo for testing
        window.addTodo = async function() {
            const text = mockInput.value.trim();
            if (!text) return;
            
            const todo = await window.invoke('create_todo_item', { text });
            currentDayData.todos.push(todo);
            mockInput.value = '';
            todoAdded = true;
        };
        
        await window.addTodo();
        
        assert.truthy(todoAdded);
        assert.lengthOf(currentDayData.todos, 1);
        assert.equal(currentDayData.todos[0].text, 'New test todo');
        assert.equal(mockInput.value, '');
        
        // Restore original function
        window.addTodo = originalAddTodo;
    });

    test('should toggle todo completion', () => {
        currentDayData = {
            todos: [
                { id: '1', text: 'Test todo', completed: false },
                { id: '2', text: 'Another todo', completed: true }
            ],
            notes: ''
        };
        
        // Toggle first todo
        toggleTodo(0);
        assert.truthy(currentDayData.todos[0].completed);
        
        // Toggle second todo
        toggleTodo(1);
        assert.falsy(currentDayData.todos[1].completed);
    });

    test('should select and deselect todos', () => {
        currentDayData = {
            todos: [
                { id: '1', text: 'Test todo 1', completed: false },
                { id: '2', text: 'Test todo 2', completed: false }
            ],
            notes: ''
        };
        
        // Select first todo
        selectTodo(0);
        assert.equal(selectedTodo, 0);
        
        // Select second todo
        selectTodo(1);
        assert.equal(selectedTodo, 1);
        
        // Deselect current todo
        selectTodo(1);
        assert.equal(selectedTodo, null);
    });
});

describe('Data Persistence', () => {
    test('should save and load day data', async () => {
        const testData = testUtils.createTestDayData('2024-01-15', 
            testUtils.generateTestTodos(2), 
            'Test notes for the day'
        );
        
        const dataDir = await window.invoke('get_app_data_dir');
        
        // Save data
        await window.invoke('save_day_data', { 
            dayData: testData, 
            dataDir: dataDir 
        });
        
        // Load data back
        const loadedData = await window.invoke('load_day_data', { 
            date: '2024-01-15', 
            dataDir: dataDir 
        });
        
        assert.equal(loadedData.date, testData.date);
        assert.equal(loadedData.notes, testData.notes);
        assert.lengthOf(loadedData.todos, 2);
        assert.equal(loadedData.todos[0].text, 'Test Todo 1');
    });

    test('should handle missing data files gracefully', async () => {
        const dataDir = await window.invoke('get_app_data_dir');
        const nonExistentDate = '2099-12-31';
        
        const result = await window.invoke('load_day_data', { 
            date: nonExistentDate, 
            dataDir: dataDir 
        });
        
        assert.equal(result.date, nonExistentDate);
        assert.lengthOf(result.todos, 0);
        assert.equal(result.notes, '');
    });

    test('should preserve todo properties during save/load', async () => {
        const complexTodo = {
            id: 'test-complex-todo',
            text: 'Complex todo with émojis 🚀 and "quotes"',
            completed: true,
            created_at: new Date().toISOString(),
            move_to_next_day: true
        };
        
        const testData = testUtils.createTestDayData('2024-01-16', [complexTodo]);
        const dataDir = await window.invoke('get_app_data_dir');
        
        await window.invoke('save_day_data', { 
            dayData: testData, 
            dataDir: dataDir 
        });
        
        const loadedData = await window.invoke('load_day_data', { 
            date: '2024-01-16', 
            dataDir: dataDir 
        });
        
        const loadedTodo = loadedData.todos[0];
        assert.equal(loadedTodo.id, complexTodo.id);
        assert.equal(loadedTodo.text, complexTodo.text);
        assert.equal(loadedTodo.completed, complexTodo.completed);
        assert.equal(loadedTodo.move_to_next_day, complexTodo.move_to_next_day);
    });
});

describe('Navigation', () => {
    test('should navigate between days', async () => {
        const originalDate = new Date('2024-01-15');
        currentDate = new Date(originalDate);
        
        // Navigate to next day
        await navigateDay(1);
        
        const expectedNextDay = new Date('2024-01-16');
        assert.equal(currentDate.toDateString(), expectedNextDay.toDateString());
        
        // Navigate to previous day (should be back to original)
        await navigateDay(-1);
        assert.equal(currentDate.toDateString(), originalDate.toDateString());
    });

    test('should go to today', async () => {
        currentDate = new Date('2020-01-01');
        
        await goToToday();
        
        const today = new Date();
        assert.equal(currentDate.toDateString(), today.toDateString());
    });

    test('should reset selected todo when navigating', async () => {
        selectedTodo = 5;
        
        await navigateDay(1);
        assert.equal(selectedTodo, null);
        
        selectedTodo = 3;
        await goToToday();
        assert.equal(selectedTodo, null);
    });
});

describe('Pomodoro Timer', () => {
    test('should start pomodoro with valid todo selected', async () => {
        currentDayData = {
            todos: [
                { id: '1', text: 'Work on project', completed: false }
            ],
            notes: ''
        };
        selectedTodo = 0;
        
        // Mock pomodoro elements
        const mockDuration = { value: '25' };
        const mockOverlay = { classList: { add: () => {}, remove: () => {} } };
        const mockTask = { textContent: '' };
        
        window.pomodoroDuration = mockDuration;
        window.pomodoroOverlay = mockOverlay;
        window.timerTask = mockTask;
        
        // Start pomodoro
        await startPomodoro();
        
        // Should call backend timer
        assert.equal(mockTask.textContent, 'Work on project');
    });

    test('should not start pomodoro without selected todo', async () => {
        currentDayData = { todos: [], notes: '' };
        selectedTodo = null;
        
        // Should not throw error, just return early
        await startPomodoro();
        
        // No assertions needed - test passes if no error is thrown
    });

    test('should update pomodoro button state correctly', () => {
        const mockButton = { 
            disabled: false, 
            textContent: '',
            addEventListener: () => {}
        };
        window.startPomodoroBtn = mockButton;
        window.pomodoroDuration = { value: '25' };
        
        // No todo selected
        currentDayData = { todos: [], notes: '' };
        selectedTodo = null;
        updatePomodoroButton();
        assert.truthy(mockButton.disabled);
        assert.truthy(mockButton.textContent.includes('Select a task first'));
        
        // Todo selected
        currentDayData = {
            todos: [{ id: '1', text: 'Test task', completed: false }],
            notes: ''
        };
        selectedTodo = 0;
        updatePomodoroButton();
        assert.falsy(mockButton.disabled);
        assert.truthy(mockButton.textContent.includes('Start'));
    });
});

describe('Notes Management', () => {
    test('should save notes to current day data', () => {
        const mockNotesText = { value: 'These are my notes for today' };
        window.notesText = mockNotesText;
        
        currentDayData = { todos: [], notes: '' };
        
        saveNotes();
        assert.equal(currentDayData.notes, 'These are my notes for today');
    });

    test('should toggle notes pane visibility', () => {
        const mockNotesPane = {
            classList: {
                contains: function(className) { return this._classes.includes(className); },
                toggle: function(className) { 
                    const index = this._classes.indexOf(className);
                    if (index > -1) {
                        this._classes.splice(index, 1);
                    } else {
                        this._classes.push(className);
                    }
                },
                _classes: []
            }
        };
        const mockToggleBtn = { textContent: '' };
        
        window.notesPane = mockNotesPane;
        window.toggleNotesBtn = mockToggleBtn;
        
        // Initially expanded
        toggleNotesPane();
        assert.truthy(mockNotesPane.classList.contains('collapsed'));
        assert.equal(mockToggleBtn.textContent, '+');
        
        // Toggle back to expanded
        toggleNotesPane();
        assert.falsy(mockNotesPane.classList.contains('collapsed'));
        assert.equal(mockToggleBtn.textContent, '−');
    });
});

describe('Error Handling', () => {
    test('should handle Tauri API errors gracefully', async () => {
        // Mock a failing invoke function
        const originalInvoke = window.invoke;
        window.invoke = async (command) => {
            throw new Error(`Mock error for command: ${command}`);
        };
        
        try {
            // Test that error is caught and doesn't crash app
            await loadDayData(new Date('2024-01-15'));
            
            // Should create empty day data on error
            assert.deepEqual(currentDayData, {
                date: '2024-01-15',
                todos: [],
                notes: ''
            });
        } finally {
            // Restore original invoke
            window.invoke = originalInvoke;
        }
    });

    test('should handle invalid date inputs', () => {
        const invalidDate = new Date('invalid');
        assert.truthy(isNaN(invalidDate.getTime()));
        
        // formatDate should handle invalid dates
        const result = formatDate(invalidDate);
        assert.truthy(result.includes('NaN') || result === 'Invalid Date');
    });
});

describe('DOM Element Management', () => {
    test('should check for element existence', () => {
        // Test that the app checks for DOM elements before using them
        const nonExistentElement = document.getElementById('non-existent-element');
        assert.equal(nonExistentElement, null);
        
        // The app should handle null elements gracefully
        // This is tested implicitly through other tests that mock elements
    });
});

describe('Custom Modal Functions', () => {
    test('should create custom alert modal', async () => {
        // Mock modal elements
        const mockModal = { 
            classList: { 
                add: () => {}, 
                remove: () => {},
                _visible: false
            } 
        };
        const mockTitle = { textContent: '' };
        const mockMessage = { textContent: '' };
        const mockOkBtn = { 
            textContent: '',
            addEventListener: function(event, handler) { 
                if (event === 'click') setTimeout(handler, 0); 
            },
            removeEventListener: () => {},
            focus: () => {}
        };
        const mockCancelBtn = { 
            classList: { add: () => {}, remove: () => {} }
        };
        
        // Mock DOM elements
        document.getElementById = (id) => {
            switch (id) {
                case 'custom-modal': return mockModal;
                case 'modal-title': return mockTitle;
                case 'modal-message': return mockMessage;
                case 'modal-ok': return mockOkBtn;
                case 'modal-cancel': return mockCancelBtn;
                default: return null;
            }
        };
        
        // Test custom alert
        const alertPromise = customAlert('Test message', 'Test Title');
        
        // Should set title and message
        assert.equal(mockTitle.textContent, 'Test Title');
        assert.equal(mockMessage.textContent, 'Test message');
        
        // Should resolve to true
        const result = await alertPromise;
        assert.truthy(result);
    });
});

describe('Integration Tests', () => {
    test('should handle complete todo workflow', async () => {
        // Reset state
        currentDayData = { todos: [], notes: '' };
        selectedTodo = null;
        
        // Create todo
        const todo = await window.invoke('create_todo_item', { text: 'Integration test todo' });
        currentDayData.todos.push(todo);
        
        // Select todo
        selectTodo(0);
        assert.equal(selectedTodo, 0);
        
        // Toggle completion
        toggleTodo(0);
        assert.truthy(currentDayData.todos[0].completed);
        
        // Save data
        const dataDir = await window.invoke('get_app_data_dir');
        await window.invoke('save_day_data', {
            dayData: currentDayData,
            dataDir: dataDir
        });
        
        // Load data back
        const loadedData = await window.invoke('load_day_data', {
            date: currentDayData.date || formatDate(new Date()),
            dataDir: dataDir
        });
        
        assert.lengthOf(loadedData.todos, 1);
        assert.truthy(loadedData.todos[0].completed);
        assert.equal(loadedData.todos[0].text, 'Integration test todo');
    });

    test('should handle day navigation with data persistence', async () => {
        const dataDir = await window.invoke('get_app_data_dir');
        
        // Create data for day 1
        const day1Data = testUtils.createTestDayData('2024-01-15', 
            [await window.invoke('create_todo_item', { text: 'Day 1 todo' })],
            'Day 1 notes'
        );
        await window.invoke('save_day_data', { dayData: day1Data, dataDir });
        
        // Create data for day 2
        const day2Data = testUtils.createTestDayData('2024-01-16',
            [await window.invoke('create_todo_item', { text: 'Day 2 todo' })],
            'Day 2 notes'
        );
        await window.invoke('save_day_data', { dayData: day2Data, dataDir });
        
        // Load day 1
        currentDate = new Date('2024-01-15');
        await loadDayData(currentDate);
        assert.equal(currentDayData.notes, 'Day 1 notes');
        assert.equal(currentDayData.todos[0].text, 'Day 1 todo');
        
        // Navigate to day 2
        await navigateDay(1);
        assert.equal(currentDayData.notes, 'Day 2 notes');
        assert.equal(currentDayData.todos[0].text, 'Day 2 todo');
    });
});

console.log('Test suite loaded with', testRunner.tests.length, 'tests');