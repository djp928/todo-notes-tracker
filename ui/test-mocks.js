// Mock Tauri API for testing purposes
// This allows us to test the frontend logic without needing the actual Tauri backend

class MockTauriAPI {
    constructor() {
        this.mockData = new Map();
        this.appDataDir = '/mock/app/data';
        this.mockDelay = 10; // Simulate async operations
    }

    async invoke(command, params = {}) {
        await this.delay(this.mockDelay);
        
        switch (command) {
            case 'get_app_data_dir':
                return this.appDataDir;
                
            case 'load_day_data':
                return this.loadDayData(params.date, params.dataDir);
                
            case 'save_day_data':
                return this.saveDayData(params.dayData, params.dataDir);
                
            case 'create_todo_item':
                return this.createTodoItem(params.text);
                
            case 'start_pomodoro_timer':
                return this.startPomodoroTimer(params.durationMinutes, params.taskText);
                
            case 'stop_pomodoro_timer':
                return Promise.resolve();
                
            case 'send_notification':
                console.log(`[MOCK NOTIFICATION] ${params.title}: ${params.body}`);
                return Promise.resolve();
                
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loadDayData(date, dataDir) {
        const key = `${dataDir}/${date}.json`;
        if (this.mockData.has(key)) {
            return JSON.parse(this.mockData.get(key));
        }
        
        // Return empty day data if not found
        return {
            date: date,
            todos: [],
            notes: ''
        };
    }

    saveDayData(dayData, dataDir) {
        const key = `${dataDir}/${dayData.date}.json`;
        this.mockData.set(key, JSON.stringify(dayData));
        return Promise.resolve();
    }

    createTodoItem(text) {
        const now = new Date().toISOString();
        return {
            id: this.generateMockUuid(),
            text: text,
            completed: false,
            created_at: now,
            move_to_next_day: false
        };
    }

    startPomodoroTimer(durationMinutes, taskText) {
        console.log(`[MOCK POMODORO] Starting ${durationMinutes}min timer for: ${taskText}`);
        return Promise.resolve();
    }

    generateMockUuid() {
        return 'mock-uuid-' + Math.random().toString(36).substr(2, 9);
    }

    // Reset mock data for clean testing
    reset() {
        this.mockData.clear();
    }

    // Get mock data for inspection
    getMockData() {
        const data = {};
        for (let [key, value] of this.mockData) {
            data[key] = JSON.parse(value);
        }
        return data;
    }
}

// Setup mock Tauri environment
const mockTauriAPI = new MockTauriAPI();

// Mock the global Tauri objects
window.__TAURI__ = {
    invoke: mockTauriAPI.invoke.bind(mockTauriAPI),
    core: {
        invoke: mockTauriAPI.invoke.bind(mockTauriAPI)
    }
};

// Mock the invoke function directly (for compatibility)
window.invoke = mockTauriAPI.invoke.bind(mockTauriAPI);

// Mock listen function (simplified)
window.listen = () => Promise.resolve();

// Expose mock API for testing
window.mockTauriAPI = mockTauriAPI;

console.log('Mock Tauri API initialized for testing');