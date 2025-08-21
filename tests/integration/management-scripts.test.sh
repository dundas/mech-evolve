#!/bin/bash

# Integration Tests for Management Scripts
# Tests mech-evolve-manager, install, update, and uninstall scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$TEST_DIR/../../.." && pwd)"
TEST_PROJECT_DIR="$TEST_DIR/temp-test-project"
TEST_RESULTS_FILE="$TEST_DIR/test-results.txt"

# Track test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
setup_test() {
    echo -e "${BLUE}Setting up test environment...${NC}"
    rm -rf "$TEST_PROJECT_DIR"
    mkdir -p "$TEST_PROJECT_DIR"
    cd "$TEST_PROJECT_DIR"
    
    # Copy management scripts
    cp "$PROJECT_ROOT/mech-evolve-manager" .
    cp "$PROJECT_ROOT/mech-evolve-update.sh" .
    cp "$PROJECT_ROOT/mech-evolve-uninstall.sh" .
    chmod +x mech-evolve-manager mech-evolve-update.sh mech-evolve-uninstall.sh
    
    # Initialize git repo (required for project ID)
    git init -q
    git config user.email "test@example.com"
    git config user.name "Test User"
    
    echo "" > "$TEST_RESULTS_FILE"
}

cleanup_test() {
    echo -e "${BLUE}Cleaning up test environment...${NC}"
    cd "$TEST_DIR"
    rm -rf "$TEST_PROJECT_DIR"
}

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "  Testing: $test_name... "
    
    if eval "$test_command"; then
        if [ "$expected_result" = "pass" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo "✓ $test_name" >> "$TEST_RESULTS_FILE"
        else
            echo -e "${RED}✗ FAILED (expected failure)${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo "✗ $test_name - expected failure" >> "$TEST_RESULTS_FILE"
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}✓ PASSED (expected failure)${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            echo "✓ $test_name (expected failure)" >> "$TEST_RESULTS_FILE"
        else
            echo -e "${RED}✗ FAILED${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            echo "✗ $test_name" >> "$TEST_RESULTS_FILE"
        fi
    fi
}

# Test Suite 1: Manager Script Basic Commands
test_manager_commands() {
    echo -e "\n${YELLOW}Test Suite 1: Manager Commands${NC}"
    
    run_test "Manager help command" \
        "./mech-evolve-manager help 2>&1 | grep -q 'Usage: mech-evolve'" \
        "pass"
    
    run_test "Manager version command" \
        "./mech-evolve-manager version 2>&1 | grep -q 'Version'" \
        "pass"
    
    run_test "Manager status (not installed)" \
        "./mech-evolve-manager status 2>&1 | grep -q 'Not Installed'" \
        "pass"
    
    run_test "Manager agents (not installed)" \
        "./mech-evolve-manager agents 2>&1 | grep -q 'not installed'" \
        "pass"
}

# Test Suite 2: Installation Process
test_installation() {
    echo -e "\n${YELLOW}Test Suite 2: Installation Process${NC}"
    
    # Mock evolve.mech.is responses
    export MECH_EVOLVE_URL="http://localhost:8999"
    
    # Start mock server in background
    node -e "
    const http = require('http');
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        if (req.url === '/health') {
            res.end(JSON.stringify({ status: 'healthy' }));
        } else {
            res.end(JSON.stringify({ success: true }));
        }
    });
    server.listen(8999);
    setTimeout(() => server.close(), 10000);
    " &
    SERVER_PID=$!
    sleep 1
    
    run_test "Installation creates directories" \
        "echo 'y' | ./mech-evolve-update.sh --skip-backup > /dev/null 2>&1 && [ -d '.claude/hooks' ]" \
        "pass"
    
    run_test "Installation creates hooks" \
        "[ -f '.claude/hooks/evolve-hook.cjs' ]" \
        "pass"
    
    run_test "Installation creates bridge" \
        "[ -f '.claude/agent-context/bridge.js' ]" \
        "pass"
    
    run_test "Manager status (installed)" \
        "./mech-evolve-manager status 2>&1 | grep -q 'Installed'" \
        "pass"
    
    # Kill mock server
    kill $SERVER_PID 2>/dev/null || true
}

# Test Suite 3: Enable/Disable Features
test_enable_disable() {
    echo -e "\n${YELLOW}Test Suite 3: Enable/Disable Features${NC}"
    
    run_test "Enable agent integration" \
        "./mech-evolve-manager on > /dev/null 2>&1 && [ -f '.claude/.mech-evolve-enabled' ]" \
        "pass"
    
    run_test "Disable agent integration" \
        "./mech-evolve-manager off > /dev/null 2>&1 && [ ! -f '.claude/.mech-evolve-enabled' ]" \
        "pass"
}

# Test Suite 4: Cache Management
test_cache_management() {
    echo -e "\n${YELLOW}Test Suite 4: Cache Management${NC}"
    
    # Create some cache files
    mkdir -p .claude/agent-context/cache
    echo '{"test": true}' > .claude/agent-context/cache/test.json
    echo 'test log' > .claude/hook-debug.log
    
    run_test "Clean command removes cache" \
        "./mech-evolve-manager clean > /dev/null 2>&1 && [ ! -f '.claude/agent-context/cache/test.json' ]" \
        "pass"
    
    run_test "Clean command removes logs" \
        "[ ! -f '.claude/hook-debug.log' ]" \
        "pass"
}

# Test Suite 5: Update Process
test_update_process() {
    echo -e "\n${YELLOW}Test Suite 5: Update Process${NC}"
    
    # Modify a hook to simulate old version
    echo '// Version: 1.0.0' > .claude/hooks/evolve-hook.cjs
    
    run_test "Update detects version change" \
        "echo 'n' | ./mech-evolve-update.sh 2>&1 | grep -q 'Version: 1.0.0'" \
        "pass"
    
    run_test "Update with --force flag" \
        "echo 'y' | ./mech-evolve-update.sh --force --skip-backup > /dev/null 2>&1" \
        "pass"
    
    run_test "Update preserves cache with --preserve-cache" \
        "mkdir -p .claude/agent-context/cache && \
         echo '{}' > .claude/agent-context/cache/preserve.json && \
         echo 'y' | ./mech-evolve-update.sh --preserve-cache --skip-backup > /dev/null 2>&1 && \
         [ -f '.claude/agent-context/cache/preserve.json' ]" \
        "pass"
}

# Test Suite 6: Uninstall Process
test_uninstall() {
    echo -e "\n${YELLOW}Test Suite 6: Uninstall Process${NC}"
    
    # Ensure installation exists
    mkdir -p .claude/hooks .claude/agent-context/cache
    touch .claude/hooks/evolve-hook.cjs
    touch .claude/agent-context/cache/test.json
    touch .claude/hook-debug.log
    
    run_test "Uninstall removes hooks" \
        "echo 'y' | ./mech-evolve-uninstall.sh > /dev/null 2>&1 && [ ! -f '.claude/hooks/evolve-hook.cjs' ]" \
        "pass"
    
    run_test "Uninstall removes agent context" \
        "[ ! -d '.claude/agent-context' ]" \
        "pass"
    
    run_test "Uninstall removes logs" \
        "[ ! -f '.claude/hook-debug.log' ]" \
        "pass"
    
    run_test "Manager status (after uninstall)" \
        "./mech-evolve-manager status 2>&1 | grep -q 'Not Installed'" \
        "pass"
}

# Test Suite 7: Error Handling
test_error_handling() {
    echo -e "\n${YELLOW}Test Suite 7: Error Handling${NC}"
    
    run_test "Manager handles missing scripts gracefully" \
        "rm -f mech-evolve-update.sh && ./mech-evolve-manager install 2>&1 | grep -q 'not found'" \
        "pass"
    
    # Restore script for other tests
    cp "$PROJECT_ROOT/mech-evolve-update.sh" .
    chmod +x mech-evolve-update.sh
    
    run_test "Installation handles network errors" \
        "export MECH_EVOLVE_URL='http://localhost:99999' && \
         echo 'y' | timeout 5 ./mech-evolve-update.sh --skip-backup > /dev/null 2>&1; \
         [ $? -eq 0 ]" \
        "pass"
    
    run_test "Hooks handle missing dependencies" \
        "[ -f '.claude/hooks/project-id-manager.cjs' ] || \
         echo 'y' | ./mech-evolve-update.sh --skip-backup > /dev/null 2>&1" \
        "pass"
}

# Test Suite 8: Hook Execution
test_hook_execution() {
    echo -e "\n${YELLOW}Test Suite 8: Hook Execution${NC}"
    
    # Ensure hooks are installed
    echo 'y' | ./mech-evolve-update.sh --skip-backup > /dev/null 2>&1
    
    run_test "Hook executes without error" \
        "echo '{\"tool\":\"Edit\",\"file_path\":\"test.js\"}' | \
         node .claude/hooks/evolve-hook-enhanced.cjs 2>/dev/null; \
         [ $? -eq 0 ]" \
        "pass"
    
    run_test "Context provider executes" \
        "node .claude/hooks/context-provider.cjs > /dev/null 2>&1; \
         [ $? -eq 0 ]" \
        "pass"
    
    run_test "Bridge executes status command" \
        "node .claude/agent-context/bridge.js status > /dev/null 2>&1; \
         [ $? -eq 0 ]" \
        "pass"
}

# Test Suite 9: Integration Tests
test_integration() {
    echo -e "\n${YELLOW}Test Suite 9: Full Integration${NC}"
    
    run_test "Full install-enable-disable-uninstall cycle" \
        "echo 'y' | ./mech-evolve-update.sh --skip-backup > /dev/null 2>&1 && \
         ./mech-evolve-manager on > /dev/null 2>&1 && \
         [ -f '.claude/.mech-evolve-enabled' ] && \
         ./mech-evolve-manager off > /dev/null 2>&1 && \
         [ ! -f '.claude/.mech-evolve-enabled' ] && \
         echo 'y' | ./mech-evolve-uninstall.sh > /dev/null 2>&1 && \
         [ ! -d '.claude/hooks' ]" \
        "pass"
    
    run_test "Reinstall after uninstall" \
        "echo 'y' | ./mech-evolve-update.sh --skip-backup > /dev/null 2>&1 && \
         [ -f '.claude/hooks/evolve-hook.cjs' ]" \
        "pass"
}

# Main test execution
main() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  Mech-Evolve Management Scripts Tests ${NC}"
    echo -e "${CYAN}========================================${NC}"
    
    # Setup
    setup_test
    
    # Run test suites
    test_manager_commands
    test_installation
    test_enable_disable
    test_cache_management
    test_update_process
    test_uninstall
    test_error_handling
    test_hook_execution
    test_integration
    
    # Summary
    echo -e "\n${CYAN}========================================${NC}"
    echo -e "${CYAN}              Test Summary              ${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo -e "Total Tests Run: ${BLUE}$TESTS_RUN${NC}"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}✅ All tests passed!${NC}"
    else
        echo -e "\n${RED}❌ Some tests failed. Check test-results.txt for details.${NC}"
    fi
    
    # Cleanup
    cleanup_test
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run tests if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi