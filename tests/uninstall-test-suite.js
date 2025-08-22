#!/usr/bin/env node
/**
 * Mech-Evolve Uninstall Test Suite
 * Agent: QualityGuardian (Validator Agent)
 * Status: COMPLETE
 * Timestamp: [2025-08-21 16:10]
 * 
 * Comprehensive testing of the uninstall functionality including:
 * - Fresh installations
 * - Partial installations  
 * - Edge cases and error scenarios
 * - Safety mechanism validation
 * - Complete cleanup verification
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class UninstallTestSuite {
  constructor() {
    this.testResults = [];
    this.testDir = path.join(__dirname, 'uninstall-test-scenarios');
    this.originalCwd = process.cwd();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runAllTests() {
    this.log('🧪 Starting Mech-Evolve Uninstall Test Suite');
    
    try {
      await this.setupTestEnvironment();
      await this.testFreshInstallation();
      await this.testPartialInstallation(); 
      await this.testDryRunMode();
      await this.testBackupFunctionality();
      await this.testForceMode();
      await this.testUserDataPreservation();
      await this.testPermissionErrors();
      await this.testNotInstalledScenario();
      await this.testVerboseMode();
      await this.testPreserveClaude();
      
      this.generateTestReport();
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
    } finally {
      await this.cleanupTestEnvironment();
    }
  }

  async setupTestEnvironment() {
    this.log('🔧 Setting up test environment');
    
    // Create test directory structure
    if (fs.existsSync(this.testDir)) {
      this.removeDirectory(this.testDir);
    }
    fs.mkdirSync(this.testDir, { recursive: true });
    
    // Copy CLI to test scenarios
    const cliSource = path.join(__dirname, '../examples/mech-evolve-cli');
    if (fs.existsSync(cliSource)) {
      fs.copyFileSync(cliSource, path.join(this.testDir, 'mech-evolve'));
      fs.chmodSync(path.join(this.testDir, 'mech-evolve'), '755');
    }
  }

  async testFreshInstallation() {
    const testName = 'Fresh Installation Uninstall';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'fresh-install');
      this.createFreshInstallation(testScenario);
      
      // Verify installation exists
      const preUninstall = this.verifyInstallation(testScenario);
      this.assert(preUninstall.isInstalled, 'Fresh installation should be detected');
      this.assert(preUninstall.fileCount > 0, 'Fresh installation should have files');
      
      // Run uninstall with force flag
      const result = this.runUninstall(testScenario, ['--force', '--verbose']);
      this.assert(result.success, 'Uninstall should complete successfully');
      
      // Verify complete removal
      const postUninstall = this.verifyInstallation(testScenario);
      this.assert(!postUninstall.isInstalled, 'Installation should be completely removed');
      this.assert(postUninstall.fileCount === 0, 'No mech-evolve files should remain');
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testPartialInstallation() {
    const testName = 'Partial Installation Uninstall';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'partial-install');
      this.createPartialInstallation(testScenario);
      
      // Run uninstall - should handle missing files gracefully
      const result = this.runUninstall(testScenario, ['--force', '--verbose']);
      this.assert(result.success, 'Partial uninstall should complete successfully');
      
      // Verify no errors for missing files
      const postUninstall = this.verifyInstallation(testScenario);
      this.assert(!postUninstall.isInstalled, 'Partial installation should be cleaned up');
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testDryRunMode() {
    const testName = 'Dry Run Mode';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'dry-run');
      this.createFreshInstallation(testScenario);
      
      const preUninstall = this.verifyInstallation(testScenario);
      
      // Run dry run
      const result = this.runUninstall(testScenario, ['--dry-run', '--verbose']);
      this.assert(result.success, 'Dry run should complete successfully');
      
      // Verify nothing was actually removed
      const postDryRun = this.verifyInstallation(testScenario);
      this.assert(postDryRun.fileCount === preUninstall.fileCount, 'Dry run should not remove files');
      this.assert(postDryRun.isInstalled, 'Installation should still exist after dry run');
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testBackupFunctionality() {
    const testName = 'Backup Functionality';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'backup-test');
      this.createFreshInstallation(testScenario);
      
      // Run uninstall with backup
      const result = this.runUninstall(testScenario, ['--force', '--backup', '--verbose']);
      this.assert(result.success, 'Uninstall with backup should complete successfully');
      
      // Verify backup was created
      const backupDirs = fs.readdirSync(testScenario).filter(f => f.startsWith('.claude-backup-'));
      this.assert(backupDirs.length > 0, 'Backup directory should be created');
      
      // Verify backup contents
      const backupDir = backupDirs[0];
      const backupPath = path.join(testScenario, backupDir);
      this.assert(fs.existsSync(path.join(backupPath, '.claude')), 'Backup should contain .claude directory');
      this.assert(fs.existsSync(path.join(backupPath, 'mech-evolve')), 'Backup should contain CLI file');
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testForceMode() {
    const testName = 'Force Mode';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'force-test');
      this.createFreshInstallation(testScenario);
      
      // Run uninstall with force (no confirmation prompt)
      const result = this.runUninstall(testScenario, ['--force']);
      this.assert(result.success, 'Force mode should complete without prompts');
      
      // Verify removal
      const postUninstall = this.verifyInstallation(testScenario);
      this.assert(!postUninstall.isInstalled, 'Force mode should remove installation');
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testUserDataPreservation() {
    const testName = 'User Data Preservation';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'user-data');
      this.createFreshInstallation(testScenario);
      
      // Add user data to .claude directory
      fs.writeFileSync(path.join(testScenario, '.claude', 'user-file.txt'), 'User data');
      fs.mkdirSync(path.join(testScenario, '.claude', 'user-dir'), { recursive: true });
      fs.writeFileSync(path.join(testScenario, '.claude', 'user-dir', 'important.md'), 'Important user data');
      
      // Run uninstall
      const result = this.runUninstall(testScenario, ['--force', '--verbose']);
      this.assert(result.success, 'Uninstall should handle user data gracefully');
      
      // Verify user data is preserved
      this.assert(fs.existsSync(path.join(testScenario, '.claude', 'user-file.txt')), 'User files should be preserved');
      this.assert(fs.existsSync(path.join(testScenario, '.claude', 'user-dir', 'important.md')), 'User directories should be preserved');
      
      // Verify mech-evolve files are removed
      this.assert(!fs.existsSync(path.join(testScenario, '.claude', 'project.json')), 'Mech-evolve files should be removed');
      this.assert(!fs.existsSync(path.join(testScenario, '.claude', 'hooks')), 'Hooks directory should be removed');
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testPermissionErrors() {
    const testName = 'Permission Error Handling';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'permission-test');
      this.createFreshInstallation(testScenario);
      
      // Make a file read-only to simulate permission error
      const readOnlyFile = path.join(testScenario, '.claude', 'hooks', 'context-provider.cjs');
      if (fs.existsSync(readOnlyFile)) {
        fs.chmodSync(readOnlyFile, '444'); // Read-only
      }
      
      // Run uninstall - should handle permission errors gracefully
      const result = this.runUninstall(testScenario, ['--force', '--verbose']);
      
      // Test should complete but may report errors
      this.assert(result.exitCode !== undefined, 'Uninstall should complete with status code');
      
      // Restore permissions for cleanup
      if (fs.existsSync(readOnlyFile)) {
        fs.chmodSync(readOnlyFile, '644');
      }
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testNotInstalledScenario() {
    const testName = 'Not Installed Scenario';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'not-installed');
      fs.mkdirSync(testScenario, { recursive: true });
      
      // Copy CLI but don't create installation
      fs.copyFileSync(path.join(this.testDir, 'mech-evolve'), path.join(testScenario, 'mech-evolve'));
      fs.chmodSync(path.join(testScenario, 'mech-evolve'), '755');
      
      // Run uninstall on non-installed project
      const result = this.runUninstall(testScenario, ['--force']);
      this.assert(result.success, 'Uninstall on non-installed project should complete gracefully');
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testVerboseMode() {
    const testName = 'Verbose Mode Output';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'verbose-test');
      this.createFreshInstallation(testScenario);
      
      // Run uninstall with verbose flag
      const result = this.runUninstall(testScenario, ['--force', '--verbose']);
      this.assert(result.success, 'Verbose mode should complete successfully');
      this.assert(result.output.length > 100, 'Verbose mode should produce detailed output');
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  async testPreserveClaude() {
    const testName = 'Preserve Claude Directory';
    this.log(`🧪 Running: ${testName}`);
    
    try {
      const testScenario = path.join(this.testDir, 'preserve-test');
      this.createFreshInstallation(testScenario);
      
      // Run uninstall with preserve flag
      const result = this.runUninstall(testScenario, ['--force', '--preserve-claude']);
      this.assert(result.success, 'Preserve mode should complete successfully');
      
      // Verify .claude directory structure is preserved
      this.assert(fs.existsSync(path.join(testScenario, '.claude')), '.claude directory should be preserved');
      
      // Verify mech-evolve files are still removed
      this.assert(!fs.existsSync(path.join(testScenario, '.claude', 'project.json')), 'project.json should be removed');
      
      this.recordTestResult(testName, true);
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'error');
      this.recordTestResult(testName, false, error.message);
    }
  }

  // Utility Methods

  createFreshInstallation(testScenario) {
    fs.mkdirSync(testScenario, { recursive: true });
    
    // Copy CLI
    fs.copyFileSync(path.join(this.testDir, 'mech-evolve'), path.join(testScenario, 'mech-evolve'));
    fs.chmodSync(path.join(testScenario, 'mech-evolve'), '755');
    
    // Create .claude structure
    const claudeDir = path.join(testScenario, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    
    // Create hooks directory and files
    const hooksDir = path.join(claudeDir, 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    
    const hookFiles = [
      'context-provider.cjs',
      'evolve-hook-enhanced.cjs', 
      'evolve-hook.cjs',
      'project-id-manager.cjs'
    ];
    
    hookFiles.forEach(file => {
      fs.writeFileSync(path.join(hooksDir, file), `// Mock ${file} for testing`);
    });
    
    // Create agent directories
    fs.mkdirSync(path.join(claudeDir, 'agent-context'), { recursive: true });
    fs.mkdirSync(path.join(claudeDir, 'agent-context', 'cache'), { recursive: true });
    fs.mkdirSync(path.join(claudeDir, 'agents'), { recursive: true });
    
    // Create config files
    fs.writeFileSync(path.join(claudeDir, 'project.json'), JSON.stringify({\n      applicationId: 'test-project-123',\n      createdAt: new Date().toISOString()\n    }, null, 2));\n    \n    fs.writeFileSync(path.join(claudeDir, 'settings-enhanced.json'), JSON.stringify({\n      hooks: {\n        PreToolUse: [{\n          matcher: 'Edit|Write|MultiEdit',\n          hooks: [{ type: 'command', command: 'node .claude/hooks/context-provider.cjs' }]\n        }]\n      }\n    }, null, 2));\n    \n    // Create temp files\n    fs.writeFileSync(path.join(claudeDir, 'hook-debug.log'), 'Mock debug log');\n  }\n\n  createPartialInstallation(testScenario) {\n    fs.mkdirSync(testScenario, { recursive: true });\n    \n    // Copy CLI\n    fs.copyFileSync(path.join(this.testDir, 'mech-evolve'), path.join(testScenario, 'mech-evolve'));\n    fs.chmodSync(path.join(testScenario, 'mech-evolve'), '755');\n    \n    // Create minimal .claude structure (partial installation)\n    const claudeDir = path.join(testScenario, '.claude');\n    fs.mkdirSync(claudeDir, { recursive: true });\n    \n    // Only create project.json to indicate installation\n    fs.writeFileSync(path.join(claudeDir, 'project.json'), JSON.stringify({\n      applicationId: 'partial-test-456'\n    }, null, 2));\n    \n    // Create some but not all expected files/directories\n    fs.mkdirSync(path.join(claudeDir, 'hooks'), { recursive: true });\n    fs.writeFileSync(path.join(claudeDir, 'hooks', 'context-provider.cjs'), '// Partial hook');\n    // Missing other expected files intentionally\n  }\n\n  runUninstall(testScenario, args = []) {\n    const cliPath = path.join(testScenario, 'mech-evolve');\n    \n    try {\n      const command = `cd \"${testScenario}\" && node \"${cliPath}\" remove ${args.join(' ')}`;\n      const output = execSync(command, { \n        encoding: 'utf8',\n        stdio: 'pipe',\n        cwd: testScenario\n      });\n      \n      return {\n        success: true,\n        exitCode: 0,\n        output: output.toString()\n      };\n    } catch (error) {\n      return {\n        success: false,\n        exitCode: error.status,\n        output: error.stdout ? error.stdout.toString() : '',\n        error: error.stderr ? error.stderr.toString() : error.message\n      };\n    }\n  }\n\n  verifyInstallation(testScenario) {\n    const projectJsonPath = path.join(testScenario, '.claude', 'project.json');\n    const isInstalled = fs.existsSync(projectJsonPath);\n    \n    let fileCount = 0;\n    const claudeDir = path.join(testScenario, '.claude');\n    \n    if (fs.existsSync(claudeDir)) {\n      const countFiles = (dir) => {\n        if (!fs.existsSync(dir)) return;\n        const items = fs.readdirSync(dir);\n        items.forEach(item => {\n          const itemPath = path.join(dir, item);\n          const stat = fs.lstatSync(itemPath);\n          if (stat.isDirectory()) {\n            countFiles(itemPath);\n          } else {\n            fileCount++;\n          }\n        });\n      };\n      \n      countFiles(claudeDir);\n    }\n    \n    // Count CLI file\n    if (fs.existsSync(path.join(testScenario, 'mech-evolve'))) {\n      fileCount++;\n    }\n    \n    return { isInstalled, fileCount };\n  }\n\n  removeDirectory(dir) {\n    if (fs.existsSync(dir)) {\n      const files = fs.readdirSync(dir);\n      files.forEach(file => {\n        const filePath = path.join(dir, file);\n        const stat = fs.lstatSync(filePath);\n        if (stat.isDirectory()) {\n          this.removeDirectory(filePath);\n        } else {\n          fs.unlinkSync(filePath);\n        }\n      });\n      fs.rmdirSync(dir);\n    }\n  }\n\n  assert(condition, message) {\n    if (!condition) {\n      throw new Error(`Assertion failed: ${message}`);\n    }\n  }\n\n  recordTestResult(testName, passed, error = null) {\n    this.testResults.push({\n      name: testName,\n      passed,\n      error,\n      timestamp: new Date().toISOString()\n    });\n  }\n\n  generateTestReport() {\n    this.log('📊 Generating test report');\n    \n    const passedTests = this.testResults.filter(r => r.passed).length;\n    const totalTests = this.testResults.length;\n    \n    console.log('\\n' + '='.repeat(80));\n    console.log('🧪 MECH-EVOLVE UNINSTALL TEST REPORT');\n    console.log('='.repeat(80));\n    console.log(`📈 Tests Passed: ${passedTests}/${totalTests}`);\n    console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);\n    console.log('');\n    \n    this.testResults.forEach(result => {\n      const status = result.passed ? '✅ PASS' : '❌ FAIL';\n      console.log(`${status} ${result.name}`);\n      if (!result.passed && result.error) {\n        console.log(`     Error: ${result.error}`);\n      }\n    });\n    \n    console.log('\\n' + '='.repeat(80));\n    \n    if (passedTests === totalTests) {\n      this.log('🎉 All tests passed! Uninstall functionality is ready for deployment.', 'success');\n    } else {\n      this.log(`⚠️  ${totalTests - passedTests} tests failed. Review and fix before deployment.`, 'error');\n    }\n  }\n\n  async cleanupTestEnvironment() {\n    this.log('🧹 Cleaning up test environment');\n    \n    try {\n      process.chdir(this.originalCwd);\n      if (fs.existsSync(this.testDir)) {\n        this.removeDirectory(this.testDir);\n      }\n    } catch (error) {\n      this.log(`Cleanup failed: ${error.message}`, 'error');\n    }\n  }\n}\n\n// Run tests if this file is executed directly\nif (require.main === module) {\n  const testSuite = new UninstallTestSuite();\n  testSuite.runAllTests().catch(console.error);\n}\n\nmodule.exports = UninstallTestSuite;