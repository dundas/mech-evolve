/**
 * Integration Tests for Hook System
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { promisify } from 'util';

const exec = promisify(require('child_process').exec);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);
const rmdir = promisify(fs.rmdir);

describe('Hook System Integration', () => {
  let testProjectDir: string;
  let mockServer: http.Server;
  let serverPort: number;
  let capturedRequests: any[] = [];

  beforeAll(async () => {
    // Create temporary test project directory
    testProjectDir = path.join(__dirname, '..', 'temp-test-project');
    await mkdir(testProjectDir, { recursive: true });
    await mkdir(path.join(testProjectDir, '.claude', 'hooks'), { recursive: true });
    await mkdir(path.join(testProjectDir, '.claude', 'agent-context', 'cache'), { recursive: true });

    // Start mock evolve.mech.is server
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        capturedRequests.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body ? JSON.parse(body) : null
        });

        // Mock responses based on endpoint
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'healthy' }));
        } else if (req.url?.startsWith('/api/evolution/track')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            suggestions: [
              { type: 'format', description: 'Format with prettier' },
              { type: 'lint', description: 'Fix linting issues' }
            ]
          }));
        } else if (req.url?.includes('/api/agents')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            agents: [
              {
                name: 'CodeQualityGuardian',
                status: 'active',
                role: 'Code Quality',
                tier: 1
              }
            ]
          }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, () => {
        serverPort = (mockServer.address() as any).port;
        resolve();
      });
    });

    // Copy hook files to test project
    const hooksDir = path.join(__dirname, '..', '..', '..', '.claude', 'hooks');
    const testHooksDir = path.join(testProjectDir, '.claude', 'hooks');
    
    // Copy essential hooks
    const hookFiles = [
      'evolve-hook.cjs',
      'evolve-hook-enhanced.cjs',
      'context-provider.cjs',
      'project-id-manager.cjs'
    ];

    for (const hookFile of hookFiles) {
      const sourcePath = path.join(hooksDir, hookFile);
      const destPath = path.join(testHooksDir, hookFile);
      
      if (fs.existsSync(sourcePath)) {
        let content = await readFile(sourcePath, 'utf-8');
        // Replace evolve.mech.is with our mock server
        content = content.replace(/https:\/\/evolve\.mech\.is/g, `http://localhost:${serverPort}`);
        content = content.replace(/http:\/\/evolve\.mech\.is/g, `http://localhost:${serverPort}`);
        await writeFile(destPath, content);
      }
    }
  });

  afterAll(async () => {
    // Clean up
    if (mockServer) {
      mockServer.close();
    }
    
    // Remove test project directory
    if (fs.existsSync(testProjectDir)) {
      execSync(`rm -rf ${testProjectDir}`);
    }
  });

  beforeEach(() => {
    capturedRequests = [];
  });

  describe('evolve-hook.cjs', () => {
    it('should send change events to evolve service', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'evolve-hook.cjs');
      
      // Set environment variables
      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`,
        tool_name: 'Edit',
        tool_args: JSON.stringify({ file_path: '/test/file.ts' }),
        cwd: testProjectDir,
        session_id: 'test-session'
      };

      // Execute hook
      await exec(`node ${hookPath}`, { env });

      // Wait for async request
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify request was sent
      expect(capturedRequests.length).toBeGreaterThan(0);
      const request = capturedRequests[0];
      expect(request.url).toBe('/api/evolution/track');
      expect(request.body.filePath).toBe('/test/file.ts');
      expect(request.body.changeType).toBe('file-modify');
    });

    it('should skip non-tracked tools', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'evolve-hook.cjs');
      
      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`,
        tool_name: 'Read', // Not tracked
        tool_args: JSON.stringify({ file_path: '/test/file.ts' }),
        cwd: testProjectDir
      };

      await exec(`node ${hookPath}`, { env });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(capturedRequests.length).toBe(0);
    });

    it('should determine correct change types', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'evolve-hook.cjs');
      
      const testCases = [
        { tool: 'Write', expected: 'file-create' },
        { tool: 'Edit', expected: 'file-modify' },
        { tool: 'MultiEdit', expected: 'file-modify' },
        { tool: 'Bash', command: 'npm test', expected: 'test-run' },
        { tool: 'Bash', command: 'npm run build', expected: 'build-run' },
        { tool: 'Bash', command: 'eslint .', expected: 'lint-run' },
        { tool: 'Bash', command: 'ls -la', expected: 'command-run' }
      ];

      for (const testCase of testCases) {
        capturedRequests = [];
        
        const env = {
          ...process.env,
          MECH_EVOLVE_URL: `http://localhost:${serverPort}`,
          tool_name: testCase.tool,
          tool_args: JSON.stringify({
            file_path: '/test/file.ts',
            command: testCase.command
          }),
          cwd: testProjectDir
        };

        await exec(`node ${hookPath}`, { env });
        await new Promise(resolve => setTimeout(resolve, 100));

        if (capturedRequests.length > 0) {
          expect(capturedRequests[0].body.changeType).toBe(testCase.expected);
        }
      }
    });
  });

  describe('evolve-hook-enhanced.cjs', () => {
    it('should accept input from stdin', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'evolve-hook-enhanced.cjs');
      
      const input = JSON.stringify({
        tool: 'Edit',
        file_path: '/test/stdin-file.ts'
      });

      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`
      };

      // Execute hook with stdin input
      const { stdout, stderr } = await exec(`echo '${input}' | node ${hookPath}`, { 
        env,
        cwd: testProjectDir 
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify request was sent
      expect(capturedRequests.length).toBeGreaterThan(0);
      const request = capturedRequests[0];
      expect(request.body.filePath).toBe('/test/stdin-file.ts');
    });

    it('should cache suggestions locally', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'evolve-hook-enhanced.cjs');
      const cacheDir = path.join(testProjectDir, '.claude', 'agent-context', 'cache');
      
      const input = JSON.stringify({
        tool: 'Edit',
        file_path: '/test/cache-test.ts'
      });

      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`
      };

      await exec(`echo '${input}' | node ${hookPath}`, { 
        env,
        cwd: testProjectDir 
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if suggestions were cached
      const latestSuggestionsPath = path.join(cacheDir, 'latest_suggestions.json');
      const fileSuggestionsPath = path.join(cacheDir, 'suggestions_cache-test.ts.json');
      
      expect(fs.existsSync(latestSuggestionsPath)).toBe(true);
      
      const latestSuggestions = JSON.parse(
        await readFile(latestSuggestionsPath, 'utf-8')
      );
      
      expect(latestSuggestions.filePath).toBe('/test/cache-test.ts');
      expect(latestSuggestions.suggestions).toBeDefined();
      expect(latestSuggestions.suggestions.length).toBeGreaterThan(0);
    });

    it('should write debug logs', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'evolve-hook-enhanced.cjs');
      const debugLogPath = path.join(testProjectDir, '.claude', 'hook-debug.log');
      
      // Remove existing debug log
      if (fs.existsSync(debugLogPath)) {
        await unlink(debugLogPath);
      }

      const input = JSON.stringify({
        tool: 'Write',
        file_path: '/test/debug-test.ts'
      });

      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`
      };

      await exec(`echo '${input}' | node ${hookPath}`, { 
        env,
        cwd: testProjectDir 
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Check debug log
      expect(fs.existsSync(debugLogPath)).toBe(true);
      
      const debugLog = await readFile(debugLogPath, 'utf-8');
      expect(debugLog).toContain('debug-test.ts');
      expect(debugLog).toContain('Write');
      expect(debugLog).toContain(`localhost:${serverPort}`);
    });
  });

  describe('context-provider.cjs', () => {
    it('should fetch agent context', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'context-provider.cjs');
      
      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`
      };

      const { stdout } = await exec(`node ${hookPath} fetch`, { 
        env,
        cwd: testProjectDir 
      });

      // Context provider should format agent data
      expect(stdout).toContain('Mech-Evolve Agent Context');
    });

    it('should show cached suggestions', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'context-provider.cjs');
      const cacheDir = path.join(testProjectDir, '.claude', 'agent-context', 'cache');
      
      // Create cached suggestions
      const cachedData = {
        filePath: '/test/cached.ts',
        timestamp: new Date().toISOString(),
        suggestions: [
          { type: 'lint', description: 'Fix linting' }
        ]
      };
      
      await writeFile(
        path.join(cacheDir, 'latest_suggestions.json'),
        JSON.stringify(cachedData)
      );

      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`
      };

      const { stdout } = await exec(`node ${hookPath} cached`, { 
        env,
        cwd: testProjectDir 
      });

      const output = JSON.parse(stdout);
      expect(output.filePath).toBe('/test/cached.ts');
      expect(output.suggestions).toHaveLength(1);
    });

    it('should clear cache', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'context-provider.cjs');
      const cacheDir = path.join(testProjectDir, '.claude', 'agent-context', 'cache');
      
      // Create some cache files
      await writeFile(
        path.join(cacheDir, 'test-cache.json'),
        JSON.stringify({ test: true })
      );

      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`
      };

      const { stdout } = await exec(`node ${hookPath} clear`, { 
        env,
        cwd: testProjectDir 
      });

      expect(stdout).toContain('Cache cleared');
      
      // Verify cache is empty
      const cacheFiles = fs.readdirSync(cacheDir);
      expect(cacheFiles.length).toBe(0);
    });
  });

  describe('Bridge Integration', () => {
    it('should execute bridge commands', async () => {
      const bridgePath = path.join(testProjectDir, '.claude', 'agent-context', 'bridge.js');
      
      // Create bridge file
      const bridgeContent = await readFile(
        path.join(__dirname, '..', '..', '..', '.claude', 'agent-context', 'bridge.js'),
        'utf-8'
      );
      
      await writeFile(
        bridgePath,
        bridgeContent.replace(/https:\/\/evolve\.mech\.is/g, `http://localhost:${serverPort}`)
      );

      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`
      };

      // Test status command
      const { stdout: statusOut } = await exec(`node ${bridgePath} status`, { 
        env,
        cwd: testProjectDir 
      });
      expect(statusOut).toContain('healthy');

      // Test agents command
      capturedRequests = [];
      const { stdout: agentsOut } = await exec(`node ${bridgePath} agents`, { 
        env,
        cwd: testProjectDir 
      });
      
      expect(agentsOut).toContain('CodeQualityGuardian');
      expect(agentsOut).toContain('active');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'evolve-hook.cjs');
      
      // Use non-existent server
      const env = {
        ...process.env,
        MECH_EVOLVE_URL: 'http://localhost:99999',
        tool_name: 'Edit',
        tool_args: JSON.stringify({ file_path: '/test/file.ts' }),
        cwd: testProjectDir
      };

      // Should not throw
      const { stderr } = await exec(`node ${hookPath}`, { env });
      
      // Should exit successfully (exit code 0)
      expect(stderr).toBe('');
    });

    it('should handle malformed JSON gracefully', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'evolve-hook.cjs');
      
      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${serverPort}`,
        tool_name: 'Edit',
        tool_args: 'not-valid-json',
        cwd: testProjectDir
      };

      // Should not throw
      const { stderr } = await exec(`node ${hookPath}`, { env });
      expect(stderr).toBe('');
    });

    it('should handle timeout gracefully', async () => {
      const hookPath = path.join(testProjectDir, '.claude', 'hooks', 'evolve-hook-enhanced.cjs');
      
      // Create slow server
      const slowServer = http.createServer((req, res) => {
        // Don't respond, let it timeout
      });

      await new Promise<void>((resolve) => {
        slowServer.listen(0, () => resolve());
      });

      const slowPort = (slowServer.address() as any).port;

      const input = JSON.stringify({
        tool: 'Edit',
        file_path: '/test/timeout.ts'
      });

      const env = {
        ...process.env,
        MECH_EVOLVE_URL: `http://localhost:${slowPort}`
      };

      const startTime = Date.now();
      await exec(`echo '${input}' | node ${hookPath}`, { 
        env,
        cwd: testProjectDir 
      });
      const duration = Date.now() - startTime;

      // Should timeout within 3.5 seconds (3s timeout + overhead)
      expect(duration).toBeLessThan(3500);

      slowServer.close();
    });
  });
});