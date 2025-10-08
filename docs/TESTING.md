# Testing Guide for Todo Notes Tracker

## Overview

This document describes the comprehensive testing strategy for the Todo Notes Tracker application. The project includes unit tests, integration tests, and manual testing procedures to ensure reliability and quality.

## Test Structure

### Backend Tests (Rust)
Location: `src-tauri/src/main.rs` (test module)

The Rust backend has comprehensive unit tests covering:

- **Todo Item Creation**: Tests creation of todo items with proper UUIDs, timestamps, and defaults
- **Data Serialization**: Tests JSON serialization/deserialization of todos and day data
- **File Operations**: Tests saving and loading day data to/from JSON files
- **Error Handling**: Tests handling of invalid dates, missing files, and malformed data
- **Edge Cases**: Tests empty todos, very long text, special characters, and Unicode

### Frontend Tests (JavaScript)
Location: `ui/test-*.js` files

The JavaScript frontend has comprehensive tests covering:

- **Utility Functions**: Date formatting, HTML escaping, etc.
- **State Management**: Application state, zoom levels, selections
- **Todo Management**: Creating, toggling, selecting todos
- **Data Persistence**: Saving and loading data via Tauri API
- **Navigation**: Day navigation, date handling
- **Pomodoro Timer**: Timer functionality and UI updates
- **Notes Management**: Notes saving and UI toggling
- **Error Handling**: Graceful handling of API failures
- **Integration Tests**: Complete workflows and data flow

### Test Infrastructure

#### Mock System (`test-mocks.js`)
- Provides a complete mock of the Tauri API for frontend testing
- Simulates file storage, todo creation, and all backend operations
- Allows testing without needing the actual Rust backend

#### Test Framework (`test-utils.js`)
- Custom lightweight testing framework
- Assertion functions for various test scenarios
- Test utilities for data generation and async operations
- Clean test result reporting

#### Test Runner (`test-runner.html`)
- Interactive test runner with visual feedback
- Real-time test results with pass/fail indicators
- Error details and stack traces for debugging
- Can be run in the actual Tauri app or any modern browser

## Running Tests

### Automated Testing
```bash
# Run all automated tests
./run-tests.sh

# Run only Rust tests
cd src-tauri && cargo test

# Run only JavaScript syntax checks
node -c ui/main.js
node -c ui/test-*.js
```

### Manual Frontend Testing
1. Start the Tauri app: `cd src-tauri && cargo tauri dev`
2. Open `ui/test-runner.html` in the app
3. Click "Run All Tests" button
4. Review test results and any failures

### Continuous Integration
The project includes GitHub Actions configuration (`.github/workflows/tests.yml`) that:
- Runs Rust tests with `cargo test`
- Checks Rust code formatting and linting
- Validates JavaScript syntax
- Performs basic HTML structure validation
- Builds the complete Tauri application

## Test Categories

### Unit Tests
- Test individual functions and components in isolation
- Mock external dependencies (file system, Tauri API)
- Focus on correctness of business logic

### Integration Tests
- Test complete workflows end-to-end
- Test interaction between frontend and backend
- Verify data persistence across app restarts

### Error Handling Tests
- Test graceful handling of file system errors
- Test invalid input handling
- Test network/API failure scenarios

### Edge Case Tests
- Test boundary conditions (empty data, very large data)
- Test special characters and Unicode
- Test date boundary conditions

## Test Coverage

### Backend Coverage
- ✅ Todo item creation and validation
- ✅ Data serialization/deserialization
- ✅ File I/O operations
- ✅ Date parsing and validation
- ✅ Error handling for all public APIs
- ✅ Edge cases and boundary conditions

### Frontend Coverage
- ✅ All utility functions
- ✅ State management and updates
- ✅ User interactions (clicks, keyboard)
- ✅ Data flow and persistence
- ✅ Timer and navigation functionality
- ✅ Error handling and recovery
- ✅ DOM manipulation safety

## Best Practices

### Writing Tests
1. **Descriptive Names**: Test names should clearly describe what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, action, and verification
3. **Isolation**: Each test should be independent and not rely on other tests
4. **Clean Up**: Reset state between tests to avoid interference
5. **Edge Cases**: Always test boundary conditions and error scenarios

### Maintaining Tests
1. **Update Tests with Code Changes**: When adding features, add corresponding tests
2. **Keep Tests Simple**: Tests should be easier to understand than the code they test
3. **Regular Execution**: Run tests frequently during development
4. **Monitor Coverage**: Ensure new code is adequately tested

## Testing Checklist

Before merging changes, ensure:

- [ ] All Rust tests pass (`cargo test`)
- [ ] All JavaScript tests pass (via test runner)
- [ ] No syntax errors in any files
- [ ] New functionality has corresponding tests
- [ ] Edge cases are covered
- [ ] Error handling is tested
- [ ] Integration scenarios work end-to-end

## Mock Data for Testing

The test suite includes utilities for generating consistent test data:

```javascript
// Generate test todos
const todos = testUtils.generateTestTodos(3);

// Create test day data
const dayData = testUtils.createTestDayData('2024-01-15', todos, 'Test notes');

// Mock specific dates
const testDate = testUtils.mockDate('2024-01-15T10:30:00');
```

## Debugging Test Failures

### Rust Test Failures
```bash
# Run specific test
cargo test test_name -- --nocapture

# Run tests with debug output
RUST_LOG=debug cargo test

# Run tests in single thread for debugging
cargo test -- --test-threads=1
```

### JavaScript Test Failures
1. Open browser developer tools
2. Check console for detailed error messages
3. Use debugger statements in test code
4. Inspect mock data state with `window.mockTauriAPI.getMockData()`

### Common Issues
- **File Permission Errors**: Ensure test directories are writable
- **Async Timing Issues**: Add appropriate delays in async tests
- **DOM Element Missing**: Check that required HTML elements exist in test environment
- **State Pollution**: Ensure tests properly reset global state

## Performance Testing

While automated performance testing isn't included, manual performance testing should verify:

- App startup time under 2 seconds
- Todo operations (add/edit/delete) under 100ms
- Data loading/saving under 500ms
- Smooth UI interactions at 60fps
- Memory usage stable during extended use

## Security Testing

Manual security testing should verify:

- No XSS vulnerabilities in todo text or notes
- Proper data sanitization for file operations
- No injection vulnerabilities in date parsing
- Secure file permissions for data directory

## Future Testing Enhancements

Potential additions to the test suite:

1. **Visual Regression Testing**: Screenshots comparison for UI changes
2. **Accessibility Testing**: Automated a11y checks
3. **Performance Monitoring**: Automated performance benchmarks
4. **End-to-End Testing**: Complete user workflows with real app
5. **Load Testing**: Handling large amounts of todos/data
6. **Cross-Platform Testing**: Verify functionality across different operating systems