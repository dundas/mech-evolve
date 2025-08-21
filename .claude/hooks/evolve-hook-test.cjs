#!/usr/bin/env node

/**
 * Test-friendly Evolution Hook
 * Tracks changes and sends them to mech-evolve service
 */

const http = require('http');
const https = require('https');
const path = require('path');

// Configuration
const EVOLVE_URL = process.env.MECH_EVOLVE_URL || 'http://evolve.mech.is';
const TOOL_NAME = process.env.tool_name || '';
const TOOL_ARGS = process.env.tool_args || '{}';

// Only trigger for relevant tools
if (!['Edit', 'Write', 'MultiEdit', 'Bash'].includes(TOOL_NAME)) {
  process.exit(0);
}

// Parse tool args
let filePath = 'unknown';
let command = '';
try {
  const args = JSON.parse(TOOL_ARGS);
  filePath = args.file_path || args.filePath || 'unknown';
  command = args.command || '';
} catch (e) {
  // Invalid JSON, continue with defaults
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

// Determine change type
function getChangeType() {
  if (TOOL_NAME === 'Write') {
    return 'file-create';
  } else if (TOOL_NAME === 'Edit' || TOOL_NAME === 'MultiEdit') {
    return 'file-modify';
  } else if (TOOL_NAME === 'Bash') {
    if (command.includes('test')) return 'test-run';
    if (command.includes('build')) return 'build-run';
    if (command.includes('lint') || command.includes('eslint')) return 'lint-run';
    return 'command-run';
  }
  return 'unknown';
}

// Track evolution
function trackEvolution() {
  try {
    const data = JSON.stringify({
      applicationId: getApplicationId(),
      toolName: TOOL_NAME,
      filePath: filePath,
      changeType: getChangeType(),
      timestamp: new Date().toISOString(),
      metadata: {
        projectScope: 'isolated',
        command: command
      }
    });

    const url = new URL('/api/evolution/track', EVOLVE_URL);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, () => {
      // Response handler - we don't need to do anything
    });

    req.on('error', () => {
      // Silently handle errors
    });

    req.write(data);
    req.end();
  } catch (e) {
    // Silently handle any errors
  }
}

// Run tracking
trackEvolution();

// Exit cleanly
process.exit(0);