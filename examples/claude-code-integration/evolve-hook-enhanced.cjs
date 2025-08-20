#!/usr/bin/env node

/**
 * Enhanced Evolution Hook - Bidirectional communication with mech-evolve agents
 * Tracks changes and retrieves agent suggestions for Claude Code integration
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const EVOLVE_URL = process.env.MECH_EVOLVE_URL || 'http://localhost:3011';

// Read hook input from stdin if available
let hookInput = null;
if (!process.stdin.isTTY) {
  try {
    const input = fs.readFileSync(0, 'utf-8').trim();
    if (input) {
      hookInput = JSON.parse(input);
    }
  } catch (e) {
    // No valid input, continue with env vars
  }
}

// Get tool info from hook input or environment
const TOOL_NAME = hookInput?.tool || process.env.CLAUDE_TOOL_NAME || process.env.tool_name || '';
const FILE_PATH = hookInput?.file_path || process.env.CLAUDE_FILE_PATH || process.env.file_path || '';

// Only trigger for relevant tools
if (!['Edit', 'Write', 'MultiEdit', 'Bash'].includes(TOOL_NAME)) {
  process.exit(0);
}

// Project identification
function getApplicationId() {
  try {
    const PM = require('./project-id-manager.cjs');
    return new PM(process.cwd()).getApplicationId();
  } catch (e) {
    return `fallback-${path.basename(process.cwd())}-${Date.now()}`;
  }
}

// Enhanced change event with more context
function createChangeEvent() {
  const filePath = FILE_PATH || FILE_NAME || 'unknown';
  const ext = path.extname(filePath);
  
  // Determine change type based on tool and file
  let changeType = 'file-modify';
  if (TOOL_NAME === 'Write') {
    changeType = fs.existsSync(filePath) ? 'file-modify' : 'file-create';
  } else if (TOOL_NAME === 'Bash') {
    changeType = 'command-execute';
  }

  return {
    projectId: getApplicationId(),
    changeType: changeType,
    filePath: filePath,
    description: `${TOOL_NAME} operation on ${path.basename(filePath)}`,
    context: {
      tool: TOOL_NAME,
      fileExtension: ext,
      timestamp: new Date().toISOString(),
      workingDir: process.cwd()
    }
  };
}

// Send change event and get agent response
async function trackChangeAndGetSuggestions(changeEvent) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/evolution/track', EVOLVE_URL);
    const protocol = url.protocol === 'https:' ? https : http;
    const data = JSON.stringify(changeEvent);

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'User-Agent': 'mech-evolve-hook'
      },
      timeout: 3000 // 3 second timeout
    };

    const req = protocol.request(requestOptions, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve({ success: false, error: 'Invalid response' });
        }
      });
    });

    req.on('error', () => {
      resolve({ success: false, error: 'Network error' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.write(data);
    req.end();
  });
}

// Cache agent suggestions for Claude Code
function cacheSuggestions(filePath, suggestions) {
  const claudeDir = path.join(process.cwd(), '.claude');
  const cacheDir = path.join(claudeDir, 'agent-context', 'cache');

  try {
    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Cache suggestions by file
    const fileName = path.basename(filePath || 'unknown');
    const cacheFile = path.join(cacheDir, `suggestions_${fileName}.json`);
    
    fs.writeFileSync(cacheFile, JSON.stringify(suggestions, null, 2), 'utf-8');

    // Also update latest suggestions
    const latestFile = path.join(cacheDir, 'latest_suggestions.json');
    fs.writeFileSync(latestFile, JSON.stringify({
      filePath,
      timestamp: new Date().toISOString(),
      suggestions
    }, null, 2), 'utf-8');

  } catch (e) {
    // Ignore cache errors
  }
}

// Trigger agent context refresh
function triggerContextRefresh() {
  const bridgePath = path.join(process.cwd(), '.claude', 'agent-context', 'bridge.js');
  
  if (fs.existsSync(bridgePath)) {
    const { spawn } = require('child_process');
    
    // Refresh context asynchronously
    const child = spawn('node', [bridgePath, 'refresh'], {
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref();
  }
}

// Main execution
async function main() {
  // Debug output (write to file to avoid interfering with Claude Code)
  const debugLog = path.join(process.cwd(), '.claude', 'hook-debug.log');
  const debugInfo = {
    timestamp: new Date().toISOString(),
    hookInput,
    toolName: TOOL_NAME,
    filePath: FILE_PATH,
    env: {
      CLAUDE_TOOL_NAME: process.env.CLAUDE_TOOL_NAME,
      tool_name: process.env.tool_name,
      file_path: process.env.file_path
    }
  };
  
  try {
    fs.appendFileSync(debugLog, JSON.stringify(debugInfo, null, 2) + '\n---\n');
  } catch (e) {
    // Ignore debug errors
  }

  const changeEvent = createChangeEvent();
  
  // Track change and get agent suggestions
  const response = await trackChangeAndGetSuggestions(changeEvent);
  
  if (response.success) {
    // Cache suggestions for Claude Code
    cacheSuggestions(changeEvent.filePath, response);
    
    // Trigger context refresh for next interaction
    triggerContextRefresh();
    
    // Log successful agent interaction
    if (response.agentResponses > 0) {
      console.log(`🤖 ${response.agentResponses} agents analyzed change`);
      if (response.suggestions && response.suggestions.length > 0) {
        console.log(`💡 ${response.suggestions.length} suggestions available`);
      }
    }
  }
  
  process.exit(0);
}

// Execute with error handling
main().catch(() => {
  // Fail silently - don't break Claude Code workflow
  process.exit(0);
});