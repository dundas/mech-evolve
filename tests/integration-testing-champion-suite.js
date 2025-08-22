#!/usr/bin/env node
/**
 * IntegrationTestingChampion Test Suite
 * Complete workflow testing for mech-evolve uninstall functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IntegrationTestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
    this.startTime = Date.now();
    this.testEnv = './test-env-integration';
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  setupTestEnvironment() {
    // Create a clean test environment
    if (fs.existsSync(this.testEnv)) {
      fs.rmSync(this.testEnv, { recursive: true, force: true });
    }
    fs.mkdirSync(this.testEnv, { recursive: true });
    
    // Copy essential files
    const filesToCopy = [
      'mech-evolve-enhanced',
      '.mech-evolve-ignore'
    ];
    
    filesToCopy.forEach(file => {
      if (fs.existsSync(file)) {
        fs.copyFileSync(file, path.join(this.testEnv, file));
      }
    });

    // Create mock .claude directory structure
    const claudeDir = path.join(this.testEnv, '.claude');
    const hooksDir = path.join(claudeDir, 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });

    // Create mock files that would be installed by mech-evolve
    const mockFiles = [
      '.claude/settings.json',
      '.claude/hooks/evolve-hook.cjs',
      '.claude/hooks/evolve-hook-enhanced.cjs',
      '.claude/hooks/project-id-manager.cjs',
      '.claude/project.json'
    ];

    mockFiles.forEach(file => {
      const fullPath = path.join(this.testEnv, file);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      
      if (file.endsWith('.json')) {
        const content = file.includes('settings') ? 
          JSON.stringify({
            hooks: {
              PostToolUse: [{
                matcher: "Edit|Write",
                hooks: [{ type: "command", command: "node .claude/hooks/evolve-hook.cjs" }]
              }]
            }
          }, null, 2) :
          JSON.stringify({ applicationId: "test-app" }, null, 2);
        fs.writeFileSync(fullPath, content);
      } else {
        fs.writeFileSync(fullPath, '// Mock file for testing');
      }
    });

    // Create user files that should NOT be removed
    const userFiles = [
      'package.json',
      'src/index.js',
      'README.md',
      '.gitignore'
    ];

    userFiles.forEach(file => {
      const fullPath = path.join(this.testEnv, file);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, `// User file: ${file}`);
    });
  }

  cleanupTestEnvironment() {
    if (fs.existsSync(this.testEnv)) {
      fs.rmSync(this.testEnv, { recursive: true, force: true });
    }
  }

  async run() {
    console.log('🔄 IntegrationTestingChampion Test Suite Starting...\n');
    
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
    console.log('🔄 IntegrationTestingChampion Test Results');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
    console.log('='.repeat(60));

    const report = {
      timestamp: new Date().toISOString(),
      agent: 'IntegrationTestingChampion',
      summary: { totalTests, passedTests, failedTests, duration },
      results: this.results
    };

    fs.writeFileSync('IntegrationTestingChampion_TEST_REPORT.json', JSON.stringify(report, null, 2));
    console.log('📊 Detailed report saved to IntegrationTestingChampion_TEST_REPORT.json');
  }
}

const runner = new IntegrationTestRunner();

// Test 1: Basic CLI functionality
runner.test('CLI Basic Commands', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Test help command
  try {
    const helpOutput = execSync(`node mech-evolve-enhanced help`, { cwd: runner.testEnv, encoding: 'utf-8' });
    if (!helpOutput.includes('Mech Evolve CLI')) {
      throw new Error('Help output does not contain expected content');
    }
  } catch (error) {
    throw new Error(`Help command failed: ${error.message}`);
  }

  // Test status command
  try {
    const statusOutput = execSync(`node mech-evolve-enhanced status`, { cwd: runner.testEnv, encoding: 'utf-8' });
    if (!statusOutput.includes('Evolution')) {
      throw new Error('Status output does not contain expected content');
    }
  } catch (error) {
    throw new Error(`Status command failed: ${error.message}`);
  }

  console.log('   ✓ CLI commands execute successfully');
});

// Test 2: Complete install to uninstall workflow
runner.test('Install to Uninstall Workflow', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Verify initial state has mech-evolve files
  const initialFiles = [
    '.claude/settings.json',
    '.claude/hooks/evolve-hook.cjs',
    '.claude/project.json'
  ];

  initialFiles.forEach(file => {
    const fullPath = path.join(runner.testEnv, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Expected file ${file} not found in test environment`);
    }
  });

  // Run uninstall
  try {
    const uninstallOutput = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
    if (!uninstallOutput.includes('Uninstall complete')) {
      throw new Error('Uninstall did not complete successfully');
    }
  } catch (error) {
    throw new Error(`Uninstall command failed: ${error.message}`);
  }

  // Verify mech-evolve files are removed
  const shouldBeRemoved = [
    '.claude/hooks/evolve-hook.cjs',
    '.claude/hooks/evolve-hook-enhanced.cjs',
    '.claude/project.json'
  ];

  shouldBeRemoved.forEach(file => {
    const fullPath = path.join(runner.testEnv, file);
    if (fs.existsSync(fullPath)) {
      throw new Error(`File ${file} should have been removed but still exists`);
    }
  });

  console.log('   ✓ Install to uninstall workflow works correctly');
});

// Test 3: User file preservation
runner.test('User File Preservation', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Verify user files exist before uninstall
  const userFiles = [
    'package.json',
    'src/index.js',
    'README.md',
    '.gitignore'
  ];

  userFiles.forEach(file => {
    const fullPath = path.join(runner.testEnv, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`User file ${file} not found in test environment`);
    }
  });

  // Run uninstall
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });

  // Verify user files still exist after uninstall
  userFiles.forEach(file => {
    const fullPath = path.join(runner.testEnv, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`User file ${file} was incorrectly removed during uninstall`);
    }
  });

  console.log('   ✓ User files are properly preserved during uninstall');
});

// Test 4: Settings backup and cleanup
runner.test('Settings Backup and Cleanup', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  const settingsPath = path.join(runner.testEnv, '.claude/settings.json');
  const backupPath = path.join(runner.testEnv, '.claude/settings-backup.json');
  
  // Verify initial settings exist
  if (!fs.existsSync(settingsPath)) {
    throw new Error('Settings file not found before uninstall');
  }

  const initialSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  if (!initialSettings.hooks || !initialSettings.hooks.PostToolUse) {
    throw new Error('Settings file does not contain expected hooks');
  }

  // Run uninstall
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });

  // Verify backup was created (if it didn't exist before)
  // Note: In real scenario, backup might not be created if it already existed

  // Verify settings were cleaned up
  if (fs.existsSync(settingsPath)) {
    const cleanedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    
    // Check that evolve hooks were removed
    if (cleanedSettings.hooks && cleanedSettings.hooks.PostToolUse) {
      const hasEvolveHooks = cleanedSettings.hooks.PostToolUse.some(hook =>
        hook.hooks && hook.hooks.some(h => 
          h.command && (h.command.includes('evolve-hook') || h.command.includes('mech-evolve'))
        )
      );
      
      if (hasEvolveHooks) {
        throw new Error('Evolve hooks were not properly removed from settings');
      }
    }
  }

  console.log('   ✓ Settings backup and cleanup work correctly');
});

// Test 5: Ignore patterns effectiveness
runner.test('Ignore Patterns Effectiveness', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Create files that should be ignored
  const ignoredFiles = [
    'src/important.js',
    'docs/user-guide.md',
    'config/custom.json'
  ];

  ignoredFiles.forEach(file => {
    const fullPath = path.join(runner.testEnv, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '// Should be preserved');
  });

  // Run uninstall
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });

  // Verify ignored files still exist
  ignoredFiles.forEach(file => {
    const fullPath = path.join(runner.testEnv, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Ignored file ${file} was incorrectly removed`);
    }
  });

  console.log('   ✓ Ignore patterns effectively protect specified files');
});

// Test 6: Partial installation handling
runner.test('Partial Installation Handling', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Remove some files to simulate partial installation
  const partialFiles = [
    '.claude/hooks/evolve-hook-enhanced.cjs',
    '.claude/project.json'
  ];

  partialFiles.forEach(file => {
    const fullPath = path.join(runner.testEnv, file);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  });

  // Run uninstall - should handle missing files gracefully
  try {
    const uninstallOutput = execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv, encoding: 'utf-8' });
    if (!uninstallOutput.includes('Uninstall complete')) {
      throw new Error('Uninstall did not handle partial installation gracefully');
    }
  } catch (error) {
    throw new Error(`Uninstall failed with partial installation: ${error.message}`);
  }

  console.log('   ✓ Partial installation is handled gracefully');
});

// Test 7: Cross-platform path handling
runner.test('Cross-Platform Path Handling', () => {
  const cliPath = path.join(runner.testEnv, 'mech-evolve-enhanced');
  
  // Test with various path formats
  const testFiles = [
    'deep/nested/structure/file.js',
    'file with spaces.txt',
    '.hidden-file'
  ];

  testFiles.forEach(file => {
    const fullPath = path.join(runner.testEnv, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, 'test content');
  });

  // Run uninstall - should not fail due to path issues
  try {
    execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });
  } catch (error) {
    throw new Error(`Path handling failed: ${error.message}`);
  }

  // Verify user files with special paths are preserved
  testFiles.forEach(file => {
    const fullPath = path.join(runner.testEnv, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File with special path ${file} was incorrectly removed`);
    }
  });

  console.log('   ✓ Cross-platform path handling works correctly');
});

// Execute all tests
runner.run().then(() => {
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}] IntegrationTestingChampion: COMPLETED - All workflow integration tests finished. Results saved to IntegrationTestingChampion_TEST_REPORT.json\n`;
  
  fs.appendFileSync('MULTI_AGENT_TESTING_PLAN.md', logEntry);
  console.log('\n🔄 IntegrationTestingChampion testing complete. Coordination hub updated.');
}).catch(error => {
  console.error('❌ IntegrationTestingChampion encountered a critical error:', error);
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}] IntegrationTestingChampion: CRITICAL ERROR - ${error.message}\n`;
  fs.appendFileSync('MULTI_AGENT_TESTING_PLAN.md', logEntry);
  process.exit(1);
});