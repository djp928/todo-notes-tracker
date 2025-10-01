// Test utilities and framework
// Simple testing framework for the Todo Notes Tracker application

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
        this.isRunning = false;
    }

    // Register a test
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    // Register a test suite
    describe(suiteName, suiteFn) {
        const originalTest = this.test.bind(this);
        this.test = (testName, testFn) => {
            originalTest(`${suiteName} - ${testName}`, testFn);
        };
        
        suiteFn();
        
        this.test = originalTest;
    }

    // Run all tests
    async runAll() {
        if (this.isRunning) {
            console.warn('Tests are already running');
            return;
        }

        this.isRunning = true;
        this.results = [];
        
        this.updateSummary('running', 'Tests are running...');
        this.clearTestResults();

        for (let i = 0; i < this.tests.length; i++) {
            const test = this.tests[i];
            const result = await this.runSingleTest(test, i + 1);
            this.results.push(result);
            this.renderTestResult(result);
        }

        this.isRunning = false;
        this.updateFinalSummary();
    }

    // Run a single test
    async runSingleTest(test, index) {
        const startTime = Date.now();
        let result = {
            name: test.name,
            status: 'running',
            duration: 0,
            error: null,
            index: index
        };

        try {
            // Reset mock data before each test
            if (window.mockTauriAPI) {
                window.mockTauriAPI.reset();
            }

            // Run the test
            await test.testFn();
            
            result.status = 'pass';
        } catch (error) {
            result.status = 'fail';
            result.error = error;
        } finally {
            result.duration = Date.now() - startTime;
        }

        return result;
    }

    // Update test summary
    updateSummary(status, message) {
        const summaryEl = document.getElementById('test-summary');
        summaryEl.className = `test-summary ${status}`;
        summaryEl.textContent = message;
        summaryEl.style.display = 'block';
    }

    // Update final summary with results
    updateFinalSummary() {
        const passed = this.results.filter(r => r.status === 'pass').length;
        const failed = this.results.filter(r => r.status === 'fail').length;
        const total = this.results.length;
        const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

        let status = 'success';
        let message = `✅ All ${total} tests passed in ${totalTime}ms`;

        if (failed > 0) {
            status = 'error';
            message = `❌ ${failed} of ${total} tests failed (${passed} passed) in ${totalTime}ms`;
        }

        this.updateSummary(status, message);
    }

    // Clear test results display
    clearTestResults() {
        const resultsEl = document.getElementById('test-results');
        resultsEl.innerHTML = '';
    }

    // Render a single test result
    renderTestResult(result) {
        const resultsEl = document.getElementById('test-results');
        
        const testDiv = document.createElement('div');
        testDiv.className = `test-case ${result.status}`;
        
        const statusIcon = result.status === 'pass' ? '✅' : '❌';
        const duration = result.duration < 1000 ? `${result.duration}ms` : `${(result.duration/1000).toFixed(2)}s`;
        
        testDiv.innerHTML = `
            <div>
                ${statusIcon} <strong>${result.name}</strong>
                <span class="test-details">(${duration})</span>
            </div>
        `;

        if (result.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-details';
            errorDiv.textContent = `${result.error.message}\n\nStack:\n${result.error.stack}`;
            testDiv.appendChild(errorDiv);
        }

        resultsEl.appendChild(testDiv);
    }

    // Clear all tests and results
    clear() {
        this.tests = [];
        this.results = [];
        this.clearTestResults();
        const summaryEl = document.getElementById('test-summary');
        summaryEl.style.display = 'none';
    }
}

// Create global test runner instance
const testRunner = new TestRunner();

// Global test functions
function test(name, testFn) {
    testRunner.test(name, testFn);
}

function describe(suiteName, suiteFn) {
    testRunner.describe(suiteName, suiteFn);
}

function runAllTests() {
    testRunner.runAll();
}

function clearResults() {
    testRunner.clear();
}

// Assertion functions
class AssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AssertionError';
    }
}

const assert = {
    equal(actual, expected, message = '') {
        if (actual !== expected) {
            throw new AssertionError(
                `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
            );
        }
    },

    deepEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new AssertionError(
                `${message}\nExpected: ${JSON.stringify(expected, null, 2)}\nActual: ${JSON.stringify(actual, null, 2)}`
            );
        }
    },

    truthy(value, message = '') {
        if (!value) {
            throw new AssertionError(`${message}\nExpected truthy value, got: ${JSON.stringify(value)}`);
        }
    },

    falsy(value, message = '') {
        if (value) {
            throw new AssertionError(`${message}\nExpected falsy value, got: ${JSON.stringify(value)}`);
        }
    },

    throws(fn, expectedError, message = '') {
        try {
            fn();
            throw new AssertionError(`${message}\nExpected function to throw`);
        } catch (error) {
            if (expectedError && !(error instanceof expectedError)) {
                throw new AssertionError(
                    `${message}\nExpected error type: ${expectedError.name}\nActual error: ${error.constructor.name}`
                );
            }
        }
    },

    async throwsAsync(asyncFn, expectedError, message = '') {
        try {
            await asyncFn();
            throw new AssertionError(`${message}\nExpected async function to throw`);
        } catch (error) {
            if (expectedError && !(error instanceof expectedError)) {
                throw new AssertionError(
                    `${message}\nExpected error type: ${expectedError.name}\nActual error: ${error.constructor.name}`
                );
            }
        }
    },

    contains(array, item, message = '') {
        if (!array.includes(item)) {
            throw new AssertionError(
                `${message}\nExpected array to contain: ${JSON.stringify(item)}\nArray: ${JSON.stringify(array)}`
            );
        }
    },

    hasProperty(object, property, message = '') {
        if (!(property in object)) {
            throw new AssertionError(
                `${message}\nExpected object to have property: ${property}\nObject keys: ${Object.keys(object)}`
            );
        }
    },

    lengthOf(array, expectedLength, message = '') {
        if (array.length !== expectedLength) {
            throw new AssertionError(
                `${message}\nExpected length: ${expectedLength}\nActual length: ${array.length}`
            );
        }
    }
};

// Test utilities
const testUtils = {
    // Wait for a condition to be true
    async waitFor(condition, timeout = 5000, interval = 100) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        throw new Error(`Condition not met within ${timeout}ms`);
    },

    // Wait for a specific amount of time
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Create a mock date for testing
    mockDate(dateString) {
        return new Date(dateString);
    },

    // Generate test data
    generateTestTodos(count = 3) {
        const todos = [];
        for (let i = 1; i <= count; i++) {
            todos.push({
                id: `test-todo-${i}`,
                text: `Test Todo ${i}`,
                completed: i % 2 === 0,
                created_at: new Date().toISOString(),
                move_to_next_day: false
            });
        }
        return todos;
    },

    // Create test day data
    createTestDayData(date = '2024-01-15', todos = [], notes = 'Test notes') {
        return {
            date: date,
            todos: todos,
            notes: notes
        };
    }
};

console.log('Test utilities loaded');