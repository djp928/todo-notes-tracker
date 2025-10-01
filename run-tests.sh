#!/bin/bash

# Test runner script for Todo Notes Tracker
# Runs both Rust backend tests and JavaScript frontend tests

set -e

echo "🧪 Running comprehensive test suite for Todo Notes Tracker"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${2}${1}${NC}"
}

# Navigate to project root
cd "$(dirname "$0")"

# Run Rust backend tests
print_status "Running Rust backend tests..." $YELLOW
echo
cd src-tauri
if cargo test; then
    print_status "✅ Rust tests passed!" $GREEN
else
    print_status "❌ Rust tests failed!" $RED
    exit 1
fi
echo

# Return to root directory
cd ..

# Check if we can run the frontend tests
print_status "Frontend tests available in test-runner.html" $YELLOW
print_status "To run frontend tests:" $YELLOW
echo "1. Start the Tauri app: cd src-tauri && cargo tauri dev"
echo "2. Open ui/test-runner.html in the app or browser"
echo "3. Click 'Run All Tests'"
echo

# Run a quick syntax check on JavaScript files
print_status "Checking JavaScript syntax..." $YELLOW
echo

# Check main.js syntax
if node -c ui/main.js 2>/dev/null; then
    print_status "✅ main.js syntax OK" $GREEN
else
    print_status "❌ main.js syntax error" $RED
    node -c ui/main.js
    exit 1
fi

# Check test files syntax
for testfile in ui/test-*.js; do
    if [ -f "$testfile" ]; then
        if node -c "$testfile" 2>/dev/null; then
            print_status "✅ $(basename $testfile) syntax OK" $GREEN
        else
            print_status "❌ $(basename $testfile) syntax error" $RED
            node -c "$testfile"
            exit 1
        fi
    fi
done

echo
print_status "🎉 All automated tests completed successfully!" $GREEN
print_status "Remember to run the frontend tests manually in the application." $YELLOW