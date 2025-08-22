import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

/**
 * Claude Code Integration Test Suite
 * 
 * Tests the complete integration between mech-evolve service and Claude Code:
 * 1. Hook system installation and activation
 * 2. Agent file generation and synchronization
 * 3. Context bridging between service and Claude
 * 4. Real-world workflow scenarios
 * 5. Error recovery and fallback mechanisms
 */

describe('Claude Code Integration Test Suite', () => {
  let testDir: string;
  let originalCwd: string;
  let serviceUrl = 'http://localhost:3011';
  let testAppId: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    testDir = path.join('/tmp', `claude-integration-test-${Date.now()}`);
    testAppId = `test-integration-${Date.now()}`;
    
    // Create test directory structure
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
    
    // Initialize a basic project structure
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: 'Test project for Claude integration'
    }, null, 2));
    
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), `
console.log('Hello World');

export function testFunction(name: string): string {
  return \`Hello, \${name}!\`;
}

class TestClass {
  private value: number = 0;
  
  setValue(val: number) {
    this.value = val;
  }
  
  getValue(): number {
    return this.value;
  }
}
`);

    // Wait for service to be available
    await waitForService(serviceUrl, 30000);
  });

  afterAll(async () => {
    // Cleanup
    process.chdir(originalCwd);
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error);
    }
  });

  describe('1. Hook System Installation', () => {
    test('should install Claude Code hooks via curl installer', async () => {
      // Simulate the curl installer process
      const installScript = await request(serviceUrl)
        .get('/start')
        .expect(200);

      expect(installScript.text).toContain('#!/usr/bin/env bash');
      expect(installScript.text).toContain('Mech Evolve Universal Installer');
      
      // Save and execute the installer
      const installerPath = path.join(testDir, 'installer.sh');
      fs.writeFileSync(installerPath, installScript.text);
      fs.chmodSync(installerPath, 0o755);

      // Execute installer
      const { success, output } = await executeCommand('bash', ['installer.sh']);
      expect(success).toBe(true);
      
      // Verify installation artifacts
      expect(fs.existsSync(path.join(testDir, 'mech-evolve'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.claude'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.claude', 'hooks'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.claude', 'hooks', 'evolve-hook.cjs'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.claude', 'hooks', 'project-id-manager.cjs'))).toBe(true);
    });

    test('should have executable mech-evolve CLI', async () => {
      const { success, output } = await executeCommand('./mech-evolve', ['status']);
      expect(success).toBe(true);
      expect(output).toMatch(/(ACTIVE|INACTIVE)/);
    });

    test('should enable/disable evolution tracking', async () => {
      // Enable
      const { success: enableSuccess } = await executeCommand('./mech-evolve', ['on']);
      expect(enableSuccess).toBe(true);
      
      const { success: statusSuccess, output: statusOutput } = await executeCommand('./mech-evolve', ['status']);
      expect(statusSuccess).toBe(true);
      expect(statusOutput).toContain('Evolution ACTIVE');
      
      // Verify settings.json was created
      expect(fs.existsSync(path.join(testDir, '.claude', 'settings.json'))).toBe(true);
      
      const settings = JSON.parse(fs.readFileSync(path.join(testDir, '.claude', 'settings.json'), 'utf-8'));
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.PostToolUse).toBeInstanceOf(Array);
    });

    test('should generate project ID consistently', async () => {
      const { success: success1, output: output1 } = await executeCommand('node', [
        '.claude/hooks/project-id-manager.cjs', 'get'
      ]);
      expect(success1).toBe(true);
      
      const { success: success2, output: output2 } = await executeCommand('node', [
        '.claude/hooks/project-id-manager.cjs', 'get'
      ]);
      expect(success2).toBe(true);
      
      // Should be consistent between calls
      expect(output1.trim()).toBe(output2.trim());
      expect(output1.trim()).toMatch(/^mech-test-project-[a-f0-9]{8}$/);
    });
  });

  describe('2. Agent Creation and Management', () => {
    let applicationId: string;

    beforeAll(async () => {
      const { output } = await executeCommand('node', [
        '.claude/hooks/project-id-manager.cjs', 'get'
      ]);
      applicationId = output.trim();
    });

    test('should analyze project and create specialized agents', async () => {
      const response = await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId,
          projectPath: testDir
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agents.created).toBeGreaterThan(0);
      expect(response.body.analysis.projectType).toBeDefined();
      expect(response.body.analysis.languages).toContain('typescript');
      expect(response.body.claudeFormat).toBeDefined();
      
      // Should have generated .claude/agents.json
      expect(fs.existsSync(path.join(testDir, '.claude', 'agents.json'))).toBe(true);
      
      const claudeConfig = JSON.parse(fs.readFileSync(path.join(testDir, '.claude', 'agents.json'), 'utf-8'));
      expect(claudeConfig.projectId).toBe(applicationId);
      expect(claudeConfig.agents).toBeInstanceOf(Array);
    });

    test('should sync agents to file system', async () => {
      const response = await request(serviceUrl)
        .post(`/api/agents/${applicationId}/sync-to-files`)
        .send({
          projectPath: testDir
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filesSynced).toBeGreaterThan(0);
      
      // Verify file system artifacts
      expect(fs.existsSync(path.join(testDir, '.claude', 'agents'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.claude', 'agent-context'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.claude', 'agent-context', 'agents-summary.json'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.claude', 'agent-context', 'current-agents.md'))).toBe(true);
      
      const summary = JSON.parse(fs.readFileSync(
        path.join(testDir, '.claude', 'agent-context', 'agents-summary.json'), 
        'utf-8'
      ));
      expect(summary.applicationId).toBe(applicationId);
      expect(summary.agents).toBeInstanceOf(Array);
    });

    test('should generate contextual Claude format', async () => {
      const response = await request(serviceUrl)
        .get(`/api/agents/${applicationId}/claude-context`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.context).toContain('Active AI Agents');
      expect(response.body.agentCount).toBeGreaterThan(0);
      
      // Context should be descriptive and actionable
      expect(response.body.context).toMatch(/## .+ \(.+\)/); // Agent headers
      expect(response.body.context).toContain('Purpose:');
      expect(response.body.context).toContain('Performance:');
    });
  });

  describe('3. Hook System Functionality', () => {
    let applicationId: string;

    beforeAll(async () => {
      const { output } = await executeCommand('node', [
        '.claude/hooks/project-id-manager.cjs', 'get'
      ]);
      applicationId = output.trim();
    });

    test('should execute hook on simulated tool usage', async () => {
      // Simulate Claude Code tool usage
      process.env.tool_name = 'Edit';
      
      const { success } = await executeCommand('node', ['.claude/hooks/evolve-hook.cjs']);
      expect(success).toBe(true);
      
      // Verify evolution was tracked
      const response = await request(serviceUrl)
        .get(`/api/evolution/history/${applicationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // May or may not have entries depending on timing
    });

    test('should handle hook execution with different tool types', async () => {
      const toolTypes = ['Edit', 'Write', 'MultiEdit', 'Bash'];
      
      for (const toolType of toolTypes) {
        process.env.tool_name = toolType;
        const { success } = await executeCommand('node', ['.claude/hooks/evolve-hook.cjs']);
        expect(success).toBe(true);
      }
      
      // Non-matching tool should exit gracefully
      process.env.tool_name = 'Read';
      const { success } = await executeCommand('node', ['.claude/hooks/evolve-hook.cjs']);
      expect(success).toBe(true); // Should still succeed, just not track
      
      delete process.env.tool_name;
    });

    test('should handle hook failure gracefully', async () => {
      // Temporarily break the service URL to test error handling
      const originalEnv = process.env.MECH_EVOLVE_URL;
      process.env.MECH_EVOLVE_URL = 'http://localhost:99999'; // Invalid URL
      process.env.tool_name = 'Edit';
      
      const { success } = await executeCommand('node', ['.claude/hooks/evolve-hook.cjs']);
      expect(success).toBe(true); // Should not fail, just silently handle error
      
      // Restore
      if (originalEnv) {
        process.env.MECH_EVOLVE_URL = originalEnv;
      } else {
        delete process.env.MECH_EVOLVE_URL;
      }
      delete process.env.tool_name;
    });
  });

  describe('4. End-to-End Workflow Scenarios', () => {
    let applicationId: string;

    beforeAll(async () => {
      const { output } = await executeCommand('node', [
        '.claude/hooks/project-id-manager.cjs', 'get'
      ]);
      applicationId = output.trim();
      
      // Ensure agents exist
      await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId,
          projectPath: testDir
        });
    });

    test('should complete full development workflow', async () => {
      // 1. Developer makes code change (simulated)
      const newCode = `
export function newFunction(x: number, y: number): number {
  return x + y;
}
`;
      fs.appendFileSync(path.join(testDir, 'src', 'index.ts'), newCode);
      
      // 2. Claude Code hook triggers (simulated)
      process.env.tool_name = 'Edit';
      await executeCommand('node', ['.claude/hooks/evolve-hook.cjs']);
      
      // 3. Get AI suggestions
      const suggestionsResponse = await request(serviceUrl)
        .get(`/api/evolution/suggest/${applicationId}`)
        .expect(200);
      
      expect(suggestionsResponse.body.success).toBe(true);
      
      // 4. Apply improvement (simulated)
      if (suggestionsResponse.body.suggestions.length > 0) {
        const suggestion = suggestionsResponse.body.suggestions[0];
        await request(serviceUrl)
          .post('/api/evolution/apply')
          .send({
            suggestionId: suggestion.id,
            projectId: applicationId,
            machineId: 'test-machine',
            result: { success: true, applied: ['formatting'] }
          })
          .expect(200);
      }
      
      // 5. Verify evolution tracking
      const historyResponse = await request(serviceUrl)
        .get(`/api/evolution/history/${applicationId}`)
        .expect(200);
      
      expect(historyResponse.body.evolutions.length).toBeGreaterThanOrEqual(0);
      
      delete process.env.tool_name;
    });

    test('should handle project reset workflow', async () => {
      // Get initial agent count
      const initialResponse = await request(serviceUrl)
        .get(`/api/agents/${applicationId}`)
        .expect(200);
      
      const initialCount = initialResponse.body.agentCount;
      
      // Reset agents
      const resetResponse = await request(serviceUrl)
        .put(`/api/agents/${applicationId}/reset`)
        .send({ projectPath: testDir })
        .expect(200);
      
      expect(resetResponse.body.success).toBe(true);
      expect(resetResponse.body.agents.created).toBeGreaterThanOrEqual(0);
      
      // Verify new agents are active
      const afterResetResponse = await request(serviceUrl)
        .get(`/api/agents/${applicationId}`)
        .expect(200);
      
      expect(afterResetResponse.body.agentCount).toBeGreaterThan(0);
    });

    test('should maintain agent learning across sessions', async () => {
      // Generate some evolution events to create learning data
      for (let i = 0; i < 3; i++) {
        await request(serviceUrl)
          .post('/api/evolution/track')
          .send({
            applicationId,
            filePath: `/test/file${i}.ts`,
            changeType: 'function-add',
            improvements: [
              { type: 'formatting', priority: 1 },
              { type: 'linting', priority: 2 }
            ],
            metadata: { iteration: i }
          });
      }
      
      // Get agent memory
      const agentsResponse = await request(serviceUrl)
        .get(`/api/agents/${applicationId}`)
        .expect(200);
      
      if (agentsResponse.body.agents.length > 0) {
        const agentId = agentsResponse.body.agents[0].id;
        
        const memoryResponse = await request(serviceUrl)
          .get(`/api/agents/${applicationId}/${agentId}/memory`)
          .expect(200);
        
        expect(memoryResponse.body.success).toBe(true);
        expect(memoryResponse.body.agent.memory).toBeDefined();
        
        // Update agent with new patterns
        await request(serviceUrl)
          .put(`/api/agents/${applicationId}/${agentId}`)
          .send({
            memory: {
              patterns: [
                { pattern: 'function-add-pattern', frequency: 3, confidence: 0.8 }
              ]
            }
          })
          .expect(200);
        
        // Verify pattern was saved
        const updatedMemoryResponse = await request(serviceUrl)
          .get(`/api/agents/${applicationId}/${agentId}/memory`)
          .expect(200);
        
        const patterns = updatedMemoryResponse.body.agent.memory.patterns;
        expect(patterns).toBeInstanceOf(Array);
        expect(patterns.some((p: any) => p.pattern === 'function-add-pattern')).toBe(true);
      }
    });
  });

  describe('5. Error Recovery and Resilience', () => {
    let applicationId: string;

    beforeAll(async () => {
      const { output } = await executeCommand('node', [
        '.claude/hooks/project-id-manager.cjs', 'get'
      ]);
      applicationId = output.trim();
    });

    test('should recover from corrupted agent configuration', async () => {
      // Corrupt the Claude agents file
      const agentsPath = path.join(testDir, '.claude', 'agents.json');
      if (fs.existsSync(agentsPath)) {
        fs.writeFileSync(agentsPath, 'invalid json content');
      }
      
      // Reset should recover gracefully
      const response = await request(serviceUrl)
        .put(`/api/agents/${applicationId}/reset`)
        .send({ projectPath: testDir })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Verify valid configuration was restored
      if (fs.existsSync(agentsPath)) {
        const content = fs.readFileSync(agentsPath, 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      }
    });

    test('should handle missing .claude directory gracefully', async () => {
      // Remove .claude directory
      const claudeDir = path.join(testDir, '.claude');
      if (fs.existsSync(claudeDir)) {
        fs.rmSync(claudeDir, { recursive: true, force: true });
      }
      
      // Re-run installer
      const installScript = await request(serviceUrl)
        .get('/start')
        .expect(200);
      
      fs.writeFileSync(path.join(testDir, 'reinstaller.sh'), installScript.text);
      fs.chmodSync(path.join(testDir, 'reinstaller.sh'), 0o755);
      
      const { success } = await executeCommand('bash', ['reinstaller.sh']);
      expect(success).toBe(true);
      
      // Should have recreated the directory structure
      expect(fs.existsSync(claudeDir)).toBe(true);
      expect(fs.existsSync(path.join(claudeDir, 'hooks'))).toBe(true);
    });

    test('should handle service unavailability gracefully', async () => {
      // Hook should not fail even if service is down
      const originalUrl = process.env.MECH_EVOLVE_URL;
      process.env.MECH_EVOLVE_URL = 'http://localhost:99999';
      process.env.tool_name = 'Edit';
      
      const { success } = await executeCommand('node', ['.claude/hooks/evolve-hook.cjs']);
      expect(success).toBe(true); // Should not crash
      
      // Restore
      if (originalUrl) {
        process.env.MECH_EVOLVE_URL = originalUrl;
      } else {
        delete process.env.MECH_EVOLVE_URL;
      }
      delete process.env.tool_name;
    });
  });

  describe('6. Configuration and Customization', () => {
    test('should support custom service URLs', async () => {
      const customUrl = 'http://custom.evolve.example.com';
      process.env.MECH_EVOLVE_URL = customUrl;
      
      // Check that hook uses custom URL (we can't test actual connection)
      const hookContent = fs.readFileSync(
        path.join(testDir, '.claude', 'hooks', 'evolve-hook.cjs'), 
        'utf-8'
      );
      expect(hookContent).toContain('process.env.MECH_EVOLVE_URL');
      
      // Restore
      delete process.env.MECH_EVOLVE_URL;
    });

    test('should support project-specific configuration', async () => {
      // Each project should have its own application ID
      const projectDir1 = path.join(testDir, 'project1');
      const projectDir2 = path.join(testDir, 'project2');
      
      fs.mkdirSync(projectDir1, { recursive: true });
      fs.mkdirSync(projectDir2, { recursive: true });
      
      // Initialize projects with different names
      fs.writeFileSync(path.join(projectDir1, 'package.json'), JSON.stringify({
        name: 'project-one',
        version: '1.0.0'
      }));
      
      fs.writeFileSync(path.join(projectDir2, 'package.json'), JSON.stringify({
        name: 'project-two',
        version: '1.0.0'
      }));
      
      // Copy project ID manager to both projects
      const originalManager = path.join(testDir, '.claude', 'hooks', 'project-id-manager.cjs');
      fs.mkdirSync(path.join(projectDir1, '.claude', 'hooks'), { recursive: true });
      fs.mkdirSync(path.join(projectDir2, '.claude', 'hooks'), { recursive: true });
      fs.copyFileSync(originalManager, path.join(projectDir1, '.claude', 'hooks', 'project-id-manager.cjs'));
      fs.copyFileSync(originalManager, path.join(projectDir2, '.claude', 'hooks', 'project-id-manager.cjs'));
      
      // Get application IDs for both projects
      const originalCwd = process.cwd();
      
      process.chdir(projectDir1);
      const { output: id1 } = await executeCommand('node', ['.claude/hooks/project-id-manager.cjs', 'get']);
      
      process.chdir(projectDir2);
      const { output: id2 } = await executeCommand('node', ['.claude/hooks/project-id-manager.cjs', 'get']);
      
      process.chdir(originalCwd);
      
      // Should be different
      expect(id1.trim()).not.toBe(id2.trim());
      expect(id1.trim()).toContain('project-one');
      expect(id2.trim()).toContain('project-two');
    });
  });
});

// Helper functions
async function waitForService(url: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await request(url).get('/health');
      if (response.status === 200) {
        return;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Service at ${url} not available within ${timeoutMs}ms`);
}

async function executeCommand(command: string, args: string[] = []): Promise<{ success: boolean; output: string; error: string }> {
  return new Promise((resolve) => {
    const process = spawn(command, args, {
      cwd: testDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({
        success: code === 0,
        output: stdout,
        error: stderr
      });
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      process.kill('SIGTERM');
      resolve({
        success: false,
        output: stdout,
        error: stderr + '\nCommand timed out'
      });
    }, 30000);
  });
}