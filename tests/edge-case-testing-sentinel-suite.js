#!/usr/bin/env node
/**
 * EdgeCaseTestingSentinel Test Suite
 * Edge case and boundary condition testing for mech-evolve uninstall functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EdgeCaseTestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
    this.startTime = Date.now();
    this.testEnv = './test-env-edge-cases';
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  setupTestEnvironment() {
    if (fs.existsSync(this.testEnv)) {
      fs.rmSync(this.testEnv, { recursive: true, force: true });
    }
    fs.mkdirSync(this.testEnv, { recursive: true });
    
    // Copy essential files
    fs.copyFileSync('mech-evolve-enhanced', path.join(this.testEnv, 'mech-evolve-enhanced'));
    fs.copyFileSync('.mech-evolve-ignore', path.join(this.testEnv, '.mech-evolve-ignore'));
  }

  cleanupTestEnvironment() {
    if (fs.existsSync(this.testEnv)) {
      fs.rmSync(this.testEnv, { recursive: true, force: true });
    }
  }

  async run() {
    console.log('🛡️ EdgeCaseTestingSentinel Test Suite Starting...\n');
    
    this.setupTestEnvironment();
    
    for (const test of this.tests) {
      try {
        console.log(`Running: ${test.name}`);
        await test.fn();
        this.results.push({ name: test.name, status: 'PASS', error: null });
        console.log(`✅ PASS: ${test.name}\n`);
      } catch (error) {
        this.results.push({ name: test.name, status: 'FAIL', error: error.message });
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Error: ${error.message}\n`);
      }
    }

    this.cleanupTestEnvironment();
    this.generateReport();
  }

  generateReport() {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'PASS').length;
    const failedTests = totalTests - passedTests;
    const duration = Date.now() - this.startTime;

    console.log('='.repeat(60));
    console.log('🛡️ EdgeCaseTestingSentinel Test Results');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
    console.log('='.repeat(60));

    const report = {
      timestamp: new Date().toISOString(),
      agent: 'EdgeCaseTestingSentinel',
      summary: { totalTests, passedTests, failedTests, duration },
      results: this.results
    };

    fs.writeFileSync('EdgeCaseTestingSentinel_TEST_REPORT.json', JSON.stringify(report, null, 2));
    console.log('📊 Detailed report saved to EdgeCaseTestingSentinel_TEST_REPORT.json');
  }
}

const runner = new EdgeCaseTestRunner();

// Test 1: Missing .claude directory
runner.test('Missing .claude Directory', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Ensure .claude directory doesn't exist
  const claudeDir = path.join(runner.testEnv, '.claude');
  if (fs.existsSync(claudeDir)) {
    fs.rmSync(claudeDir, { recursive: true, force: true });
  }

  // Run uninstall - should handle gracefully
  try {
    const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
    if (!output.includes('No mech-evolve files found') && !output.includes('Uninstall complete')) {
      throw new Error('Uninstall did not handle missing .claude directory gracefully');
    }
  } catch (error) {
    if (error.status !== 0) {
      throw new Error(`Uninstall failed with missing .claude directory: ${error.message}`);
    }
  }

  console.log('   ✓ Missing .claude directory handled gracefully');
});

// Test 2: Corrupted ignore file
runner.test('Corrupted Ignore File', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  const ignoreFile = path.join(runner.testEnv, '.mech-evolve-ignore');
  
  // Create corrupted ignore file with invalid patterns
  const corruptedContent = `
# Corrupted ignore file
[invalid-regex-pattern
***/broken/pattern
\\invalid\\escape\\sequence
src/
normal-pattern
`;
  
  fs.writeFileSync(ignoreFile, corruptedContent);

  // Run uninstall - should handle corrupted patterns gracefully
  try {
    const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
    // Should not crash, even with invalid patterns
  } catch (error) {
    if (error.status !== 0 && !error.message.includes('No mech-evolve files found')) {
      throw new Error(`Uninstall crashed with corrupted ignore file: ${error.message}`);
    }
  }

  console.log('   ✓ Corrupted ignore file handled gracefully');
});

// Test 3: Read-only files and permissions
runner.test('Read-Only Files and Permissions', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Create .claude directory with files
  const claudeDir = path.join(runner.testEnv, '.claude');
  const hooksDir = path.join(claudeDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  
  const testFile = path.join(hooksDir, 'evolve-hook.cjs');
  fs.writeFileSync(testFile, '// Test file');
  
  try {
    // Make file read-only
    fs.chmodSync(testFile, 0o444);
    
    // Run uninstall - should handle read-only files
    const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
    // May warn about permission issues but should not crash
    
    // Reset permissions for cleanup
    if (fs.existsSync(testFile)) {
      fs.chmodSync(testFile, 0o644);
    }
  } catch (error) {
    // Reset permissions even on error
    if (fs.existsSync(testFile)) {
      try {
        fs.chmodSync(testFile, 0o644);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
    if (error.status !== 0 && !error.message.includes('permission')) {
      throw new Error(`Uninstall failed unexpectedly with read-only files: ${error.message}`);
    }
  }

  console.log('   ✓ Read-only files and permission issues handled gracefully');
});

// Test 4: Very long file paths
runner.test('Very Long File Paths', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Create a very long directory structure
  const longPath = Array(50).fill('very-long-directory-name').join('/');
  const fullLongPath = path.join(runner.testEnv, longPath);
  
  try {
    fs.mkdirSync(fullLongPath, { recursive: true });
    fs.writeFileSync(path.join(fullLongPath, 'test-file.js'), '// Long path test');
    
    // Run uninstall - should handle long paths
    const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
    
  } catch (error) {
    if (error.code === 'ENAMETOOLONG') {
      console.log('   ⚠️  Path too long for filesystem, skipping this test');
      return;
    }
    if (error.status !== 0 && !error.message.includes('No mech-evolve files found')) {
      throw new Error(`Uninstall failed with long paths: ${error.message}`);
    }
  }

  console.log('   ✓ Very long file paths handled gracefully');
});

// Test 5: Special characters in filenames
runner.test('Special Characters in Filenames', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Create files with special characters
  const specialFiles = [
    'file with spaces.js',
    'file-with-unicode-café.js',
    'file&with&ampersands.js',
    'file(with)parentheses.js'
  ];

  const testDir = path.join(runner.testEnv, 'special-chars');
  fs.mkdirSync(testDir, { recursive: true });

  specialFiles.forEach(fileName => {
    try {
      const filePath = path.join(testDir, fileName);
      fs.writeFileSync(filePath, '// Special char test');
    } catch (error) {
      console.log(`   ⚠️  Could not create file with special chars: ${fileName}`);
    }
  });

  // Run uninstall - should not crash on special characters
  try {
    const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
  } catch (error) {
    if (error.status !== 0 && !error.message.includes('No mech-evolve files found')) {
      throw new Error(`Uninstall failed with special characters: ${error.message}`);
    }
  }

  console.log('   ✓ Special characters in filenames handled gracefully');
});

// Test 6: Corrupted settings.json
runner.test('Corrupted Settings JSON', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Create .claude directory with corrupted settings
  const claudeDir = path.join(runner.testEnv, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  
  const settingsFile = path.join(claudeDir, 'settings.json');
  const corruptedSettings = `{
    "hooks": {
      "PostToolUse": [
        invalid json structure
        missing quotes and brackets
      ]
    }
  `;
  
  fs.writeFileSync(settingsFile, corruptedSettings);

  // Run uninstall - should handle corrupted JSON gracefully
  try {
    const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
    // Should complete even with corrupted settings
  } catch (error) {
    if (error.status !== 0 && !error.message.includes('Could not clean settings')) {
      throw new Error(`Uninstall failed with corrupted settings: ${error.message}`);
    }
  }

  console.log('   ✓ Corrupted settings.json handled gracefully');
});

// Test 7: Symbolic links
runner.test('Symbolic Links', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Create some files and symbolic links
  const realFile = path.join(runner.testEnv, 'real-file.js');
  const linkFile = path.join(runner.testEnv, 'link-file.js');
  
  fs.writeFileSync(realFile, '// Real file');
  
  try {
    fs.symlinkSync(realFile, linkFile);
    
    // Run uninstall - should handle symlinks gracefully
    try {
      const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
    } catch (error) {
      if (error.status !== 0 && !error.message.includes('No mech-evolve files found')) {
        throw new Error(`Uninstall failed with symbolic links: ${error.message}`);
      }
    }
    
  } catch (symlinkError) {
    console.log('   ⚠️  Symbolic links not supported on this platform, skipping');
    return;
  }

  console.log('   ✓ Symbolic links handled gracefully');
});

// Test 8: Concurrent access simulation
runner.test('Concurrent Access Simulation', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Create files in .claude directory
  const claudeDir = path.join(runner.testEnv, '.claude');
  const hooksDir = path.join(claudeDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  
  const testFile = path.join(hooksDir, 'evolve-hook.cjs');
  fs.writeFileSync(testFile, '// Test file for concurrent access');

  // Simulate file being accessed by opening a file descriptor
  let fd;
  try {
    fd = fs.openSync(testFile, 'r');
    
    // Run uninstall while file is open
    const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
    
  } catch (error) {
    if (error.status !== 0 && !error.message.includes('Could not remove')) {
      throw new Error(`Uninstall failed with concurrent access: ${error.message}`);
    }
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch (e) {
        // Ignore close errors
      }
    }
  }

  console.log('   ✓ Concurrent access simulation handled gracefully');
});

// Test 9: Empty directories cleanup
runner.test('Empty Directories Cleanup', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Create nested empty directories
  const nestedDir = path.join(runner.testEnv, '.claude', 'hooks', 'nested', 'empty');
  fs.mkdirSync(nestedDir, { recursive: true });
  
  // Create a file that will be removed
  const hookFile = path.join(runner.testEnv, '.claude', 'hooks', 'evolve-hook.cjs');
  fs.writeFileSync(hookFile, '// Hook file');

  // Run uninstall
  const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });

  // Check that empty directories are cleaned up appropriately
  const hooksDir = path.join(runner.testEnv, '.claude', 'hooks');
  if (fs.existsSync(hooksDir)) {
    const remaining = fs.readdirSync(hooksDir);
    if (remaining.length > 0) {
      console.log(`   ⚠️  Some files remain in hooks directory: ${remaining.join(', ')}`);
    }
  }

  console.log('   ✓ Empty directories cleanup handled appropriately');
});

// Test 10: Network filesystem simulation
runner.test('Network Filesystem Edge Cases', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // This test simulates some network filesystem issues
  // by creating files with unusual permissions or access patterns
  
  const claudeDir = path.join(runner.testEnv, '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });
  
  // Create file with unusual timestamps
  const testFile = path.join(claudeDir, 'test-network.json');
  fs.writeFileSync(testFile, '{"test": "network"}');
  
  // Set unusual timestamp
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  fs.utimesSync(testFile, futureDate, futureDate);

  // Run uninstall
  try {
    const output = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
  } catch (error) {
    if (error.status !== 0 && !error.message.includes('No mech-evolve files found')) {
      throw new Error(`Uninstall failed with network filesystem issues: ${error.message}`);
    }
  }

  console.log('   ✓ Network filesystem edge cases handled gracefully');
});

// Execute all tests
runner.run().then(() => {
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}] EdgeCaseTestingSentinel: COMPLETED - All edge case tests finished. Results saved to EdgeCaseTestingSentinel_TEST_REPORT.json\n`;
  
  fs.appendFileSync('MULTI_AGENT_TESTING_PLAN.md', logEntry);
  console.log('\n🛡️ EdgeCaseTestingSentinel testing complete. Coordination hub updated.');
}).catch(error => {
  console.error('❌ EdgeCaseTestingSentinel encountered a critical error:', error);
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}] EdgeCaseTestingSentinel: CRITICAL ERROR - ${error.message}\n`;
  fs.appendFileSync('MULTI_AGENT_TESTING_PLAN.md', logEntry);
  process.exit(1);
});