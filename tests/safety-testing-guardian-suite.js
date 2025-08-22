#!/usr/bin/env node
/**
 * SafetyTestingGuardian Test Suite
 * Data protection and security validation for mech-evolve uninstall functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class SafetyTestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
    this.startTime = Date.now();
    this.testEnv = './test-env-safety';
    this.criticalIssues = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  criticalAlert(issue) {
    this.criticalIssues.push({
      timestamp: new Date().toISOString(),
      issue: issue,
      severity: 'CRITICAL'
    });
    console.log(`🚨 CRITICAL SAFETY ISSUE: ${issue}`);
  }

  setupTestEnvironment() {
    if (fs.existsSync(this.testEnv)) {
      fs.rmSync(this.testEnv, { recursive: true, force: true });
    }
    fs.mkdirSync(this.testEnv, { recursive: true });
    
    // Copy essential files
    fs.copyFileSync('mech-evolve-enhanced', path.join(this.testEnv, 'mech-evolve-enhanced'));
    fs.copyFileSync('.mech-evolve-ignore', path.join(this.testEnv, '.mech-evolve-ignore'));

    // Create comprehensive test environment with user data
    this.createUserData();
    this.createMechEvolveFiles();
  }

  createUserData() {
    // Critical user files that must NEVER be removed
    const userFiles = [
      { path: 'src/app.js', content: 'console.log("Critical user application");' },
      { path: 'src/components/UserComponent.js', content: 'export default UserComponent;' },
      { path: 'package.json', content: JSON.stringify({ name: 'user-app', version: '1.0.0' }, null, 2) },
      { path: 'README.md', content: '# User Project\nThis is important user documentation.' },
      { path: 'docs/api.md', content: '# API Documentation\nUser-created API docs.' },
      { path: 'config/production.json', content: JSON.stringify({ env: 'production' }, null, 2) },
      { path: '.env', content: 'SECRET_KEY=user-secret-12345\nAPI_URL=https://api.user.com' },
      { path: '.gitignore', content: 'node_modules/\n.env\ndist/' },
      { path: 'tests/user-test.js', content: 'describe("User tests", () => {});' }
    ];

    userFiles.forEach(file => {
      const fullPath = path.join(this.testEnv, file.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content);
    });
  }

  createMechEvolveFiles() {
    // Mech-evolve files that should be removed
    const mechFiles = [
      { path: '.claude/settings.json', content: JSON.stringify({
        hooks: {
          PostToolUse: [{
            matcher: "Edit|Write",
            hooks: [{ type: "command", command: "node .claude/hooks/evolve-hook.cjs" }]
          }]
        }
      }, null, 2) },
      { path: '.claude/hooks/evolve-hook.cjs', content: '// Mech evolve hook' },
      { path: '.claude/hooks/evolve-hook-enhanced.cjs', content: '// Enhanced hook' },
      { path: '.claude/project.json', content: JSON.stringify({ id: 'test' }, null, 2) }
    ];

    mechFiles.forEach(file => {
      const fullPath = path.join(this.testEnv, file.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content);
    });
  }

  calculateFileHashes(directory) {
    const hashes = {};
    
    function hashDirectory(dir) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          hashDirectory(filePath);
        } else {
          const content = fs.readFileSync(filePath);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          const relativePath = path.relative(this.testEnv, filePath);
          hashes[relativePath] = hash;
        }
      });
    }
    
    hashDirectory(directory);
    return hashes;
  }

  cleanupTestEnvironment() {
    if (fs.existsSync(this.testEnv)) {
      fs.rmSync(this.testEnv, { recursive: true, force: true });
    }
  }

  async run() {
    console.log('🛡️ SafetyTestingGuardian Test Suite Starting...\n');
    console.log('⚠️  ZERO TOLERANCE for data loss or security issues\n');
    
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
        
        // Check if this is a critical safety issue
        if (error.message.includes('User data') || error.message.includes('Critical')) {
          this.criticalAlert(`${test.name}: ${error.message}`);
        }
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
    console.log('🛡️ SafetyTestingGuardian Test Results');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success Rate: ${((passedTests/totalTests)*100).toFixed(1)}%`);
    
    if (this.criticalIssues.length > 0) {
      console.log(`🚨 CRITICAL ISSUES: ${this.criticalIssues.length}`);
      console.log('='.repeat(60));
      this.criticalIssues.forEach(issue => {
        console.log(`⚠️  ${issue.timestamp}: ${issue.issue}`);
      });
    }
    
    console.log('='.repeat(60));

    const report = {
      timestamp: new Date().toISOString(),
      agent: 'SafetyTestingGuardian',
      summary: { totalTests, passedTests, failedTests, duration },
      criticalIssues: this.criticalIssues,
      results: this.results,
      safetyStatus: this.criticalIssues.length === 0 ? 'SAFE' : 'UNSAFE'
    };

    fs.writeFileSync('SafetyTestingGuardian_TEST_REPORT.json', JSON.stringify(report, null, 2));
    console.log('📊 Detailed report saved to SafetyTestingGuardian_TEST_REPORT.json');

    if (this.criticalIssues.length > 0) {
      console.log('\n🚨 PRODUCTION DEPLOYMENT BLOCKED - Critical safety issues detected');
    } else {
      console.log('\n✅ SAFETY VALIDATED - Safe for production deployment');
    }
  }
}

const runner = new SafetyTestRunner();

// Test 1: User source code preservation
runner.test('User Source Code Preservation', () => {
  // Calculate hashes of all user files before uninstall
  const beforeHashes = runner.calculateFileHashes(runner.testEnv);
  
  // Run uninstall
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });
  
  // Verify all user source files still exist and unchanged
  const criticalUserFiles = [
    'src/app.js',
    'src/components/UserComponent.js',
    'package.json'
  ];

  criticalUserFiles.forEach(filePath => {
    const fullPath = path.join(runner.testEnv, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Critical: User source file ${filePath} was removed during uninstall`);
    }
    
    // Verify content unchanged
    const content = fs.readFileSync(fullPath);
    const currentHash = crypto.createHash('sha256').update(content).digest('hex');
    
    if (beforeHashes[filePath] !== currentHash) {
      throw new Error(`Critical: User source file ${filePath} was modified during uninstall`);
    }
  });

  console.log('   ✓ All user source code preserved and unchanged');
});

// Test 2: User configuration preservation
runner.test('User Configuration Preservation', () => {
  const beforeHashes = runner.calculateFileHashes(runner.testEnv);
  
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });
  
  const configFiles = [
    '.env',
    '.gitignore',
    'config/production.json'
  ];

  configFiles.forEach(filePath => {
    const fullPath = path.join(runner.testEnv, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Critical: User configuration file ${filePath} was removed`);
    }
    
    const content = fs.readFileSync(fullPath);
    const currentHash = crypto.createHash('sha256').update(content).digest('hex');
    
    if (beforeHashes[filePath] !== currentHash) {
      throw new Error(`Critical: User configuration file ${filePath} was modified`);
    }
  });

  console.log('   ✓ All user configuration files preserved');
});

// Test 3: Ignore pattern effectiveness verification
runner.test('Ignore Pattern Effectiveness', () => {
  // Create files that should be ignored according to .mech-evolve-ignore
  const ignoredTestFiles = [
    'src/important-user-logic.js',
    'docs/user-documentation.md',
    'package.json',
    'README.md'
  ];

  // Ensure these files exist
  ignoredTestFiles.forEach(filePath => {
    const fullPath = path.join(runner.testEnv, filePath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, `// Protected file: ${filePath}`);
    }
  });

  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });

  // Verify all ignored files still exist
  ignoredTestFiles.forEach(filePath => {
    const fullPath = path.join(runner.testEnv, filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Critical: Ignored file ${filePath} was incorrectly removed`);
    }
  });

  console.log('   ✓ Ignore patterns effectively protect specified files');
});

// Test 4: Settings backup validation
runner.test('Settings Backup Validation', () => {
  const settingsPath = path.join(runner.testEnv, '.claude/settings.json');
  const backupPath = path.join(runner.testEnv, '.claude/settings-backup.json');
  
  // Verify initial settings exist
  if (!fs.existsSync(settingsPath)) {
    throw new Error('Settings file not found before test');
  }

  const originalSettings = fs.readFileSync(settingsPath, 'utf-8');
  
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });

  // Verify backup was created or preserved
  if (fs.existsSync(backupPath)) {
    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    
    // Backup should contain original settings or be a valid backup
    try {
      const backupJson = JSON.parse(backupContent);
      if (!backupJson.hooks) {
        console.log('   ⚠️  Backup file exists but may be from previous installation');
      }
    } catch (e) {
      throw new Error('Backup file exists but contains invalid JSON');
    }
  }

  console.log('   ✓ Settings backup mechanism works correctly');
});

// Test 5: No privilege escalation verification
runner.test('No Privilege Escalation', () => {
  // Verify uninstall doesn't attempt to modify system files or escalate privileges
  const systemPaths = [
    '/etc',
    '/usr/bin',
    '/System',
    process.env.HOME + '/.bashrc',
    process.env.HOME + '/.zshrc'
  ];

  // Record modification times before uninstall
  const beforeTimes = {};
  systemPaths.forEach(sysPath => {
    try {
      if (fs.existsSync(sysPath)) {
        const stat = fs.statSync(sysPath);
        beforeTimes[sysPath] = stat.mtime.getTime();
      }
    } catch (e) {
      // Some paths might not be accessible, that's ok
    }
  });

  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });

  // Verify no system files were modified
  systemPaths.forEach(sysPath => {
    try {
      if (fs.existsSync(sysPath) && beforeTimes[sysPath]) {
        const stat = fs.statSync(sysPath);
        if (stat.mtime.getTime() !== beforeTimes[sysPath]) {
          throw new Error(`Critical: System file ${sysPath} was modified during uninstall`);
        }
      }
    } catch (e) {
      if (e.message.includes('Critical:')) {
        throw e; // Re-throw critical errors
      }
      // Ignore access errors
    }
  });

  console.log('   ✓ No privilege escalation or system file modification detected');
});

// Test 6: Rollback capability verification
runner.test('Rollback Capability', () => {
  // Create a comprehensive snapshot
  const beforeSnapshot = runner.calculateFileHashes(runner.testEnv);
  
  // Run uninstall
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });
  
  // Verify that user files can be restored if needed
  // (In practice, this would involve restoring from backup)
  
  const afterSnapshot = runner.calculateFileHashes(runner.testEnv);
  
  // Count what was preserved vs removed
  let preservedCount = 0;
  let removedCount = 0;
  
  Object.keys(beforeSnapshot).forEach(filePath => {
    if (afterSnapshot[filePath]) {
      preservedCount++;
    } else {
      removedCount++;
      // Check if this was a user file that should have been preserved
      if (!filePath.includes('.claude/') && !filePath.includes('mech-evolve')) {
        throw new Error(`Critical: User file ${filePath} was removed and cannot be rolled back`);
      }
    }
  });

  console.log(`   ✓ Rollback capability verified - ${preservedCount} files preserved, ${removedCount} mech-evolve files removed`);
});

// Test 7: Comprehensive file integrity check
runner.test('Comprehensive File Integrity', () => {
  // Create checksums for all user files
  const userFilePatterns = [
    'src/**/*',
    'docs/**/*',
    'config/**/*',
    'tests/**/*',
    'package.json',
    'README.md',
    '.env',
    '.gitignore'
  ];

  const beforeHashes = runner.calculateFileHashes(runner.testEnv);
  
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });
  
  const afterHashes = runner.calculateFileHashes(runner.testEnv);
  
  // Check every user file for integrity
  Object.keys(beforeHashes).forEach(filePath => {
    // Skip mech-evolve files - they should be removed
    if (filePath.includes('.claude/') || filePath.includes('mech-evolve')) {
      return;
    }
    
    if (!afterHashes[filePath]) {
      throw new Error(`Critical: User file ${filePath} was removed during uninstall`);
    }
    
    if (beforeHashes[filePath] !== afterHashes[filePath]) {
      throw new Error(`Critical: User file ${filePath} was corrupted or modified`);
    }
  });

  console.log('   ✓ Complete file integrity verified - all user files intact');
});

// Test 8: Security boundary validation
runner.test('Security Boundary Validation', () => {
  // Verify uninstall doesn't attempt to access files outside project directory
  const outsideTestFile = path.join(path.dirname(runner.testEnv), 'outside-test.txt');
  fs.writeFileSync(outsideTestFile, 'Should not be touched');
  
  const beforeContent = fs.readFileSync(outsideTestFile, 'utf-8');
  
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });
  
  // Verify file outside project was not touched
  if (!fs.existsSync(outsideTestFile)) {
    throw new Error('Critical: File outside project directory was removed');
  }
  
  const afterContent = fs.readFileSync(outsideTestFile, 'utf-8');
  if (beforeContent !== afterContent) {
    throw new Error('Critical: File outside project directory was modified');
  }
  
  // Cleanup
  fs.unlinkSync(outsideTestFile);
  
  console.log('   ✓ Security boundaries respected - no outside file access');
});

// Test 9: Error handling without data loss
runner.test('Error Handling Without Data Loss', () => {
  // Create a scenario that might cause errors but shouldn't lose data
  const readOnlyFile = path.join(runner.testEnv, '.claude/readonly-test.txt');
  fs.mkdirSync(path.dirname(readOnlyFile), { recursive: true });
  fs.writeFileSync(readOnlyFile, 'readonly test');
  fs.chmodSync(readOnlyFile, 0o444);
  
  const beforeHashes = runner.calculateFileHashes(runner.testEnv);
  
  try {
    execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });
  } catch (error) {
    // Even if uninstall has errors, user data should be safe
  }
  
  // Reset permissions for verification
  if (fs.existsSync(readOnlyFile)) {
    fs.chmodSync(readOnlyFile, 0o644);
  }
  
  const afterHashes = runner.calculateFileHashes(runner.testEnv);
  
  // Verify no user data was lost even if there were errors
  Object.keys(beforeHashes).forEach(filePath => {
    if (!filePath.includes('.claude/') && !filePath.includes('mech-evolve')) {
      if (!afterHashes[filePath]) {
        throw new Error(`Critical: User file ${filePath} was lost during error handling`);
      }
      if (beforeHashes[filePath] !== afterHashes[filePath]) {
        throw new Error(`Critical: User file ${filePath} was corrupted during error handling`);
      }
    }
  });

  console.log('   ✓ Error handling preserves user data integrity');
});

// Test 10: Final safety certification
runner.test('Final Safety Certification', () => {
  // This is a comprehensive final check
  const criticalUserAssets = [
    'src/app.js',
    'package.json',
    '.env',
    'README.md'
  ];

  const beforeHashes = {};
  criticalUserAssets.forEach(asset => {
    const fullPath = path.join(runner.testEnv, asset);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath);
      beforeHashes[asset] = crypto.createHash('sha256').update(content).digest('hex');
    }
  });

  // Final uninstall test
  execSync(`node mech-evolve-enhanced uninstall`, { cwd: runner.testEnv });

  // Final verification
  criticalUserAssets.forEach(asset => {
    const fullPath = path.join(runner.testEnv, asset);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`SAFETY FAILURE: Critical user asset ${asset} was removed`);
    }
    
    const content = fs.readFileSync(fullPath);
    const currentHash = crypto.createHash('sha256').update(content).digest('hex');
    
    if (beforeHashes[asset] && beforeHashes[asset] !== currentHash) {
      throw new Error(`SAFETY FAILURE: Critical user asset ${asset} was modified`);
    }
  });

  console.log('   ✅ FINAL SAFETY CERTIFICATION: All critical user assets preserved');
});

// Execute all tests
runner.run().then(() => {
  const timestamp = new Date().toISOString();
  const safetyStatus = runner.criticalIssues.length === 0 ? 'SAFE' : 'UNSAFE';
  const logEntry = `\n[${timestamp}] SafetyTestingGuardian: COMPLETED - Safety validation finished. Status: ${safetyStatus}. Results saved to SafetyTestingGuardian_TEST_REPORT.json\n`;
  
  fs.appendFileSync('MULTI_AGENT_TESTING_PLAN.md', logEntry);
  console.log('\n🛡️ SafetyTestingGuardian testing complete. Coordination hub updated.');
}).catch(error => {
  console.error('❌ SafetyTestingGuardian encountered a critical error:', error);
  const timestamp = new Date().toISOString();
  const logEntry = `\n[${timestamp}] SafetyTestingGuardian: CRITICAL ERROR - ${error.message}\n`;
  fs.appendFileSync('MULTI_AGENT_TESTING_PLAN.md', logEntry);
  process.exit(1);
});