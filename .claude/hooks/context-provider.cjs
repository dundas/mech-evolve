#!/usr/bin/env node

/**
 * Context Provider Hook - Injects agent insights into Claude Code context
 * Runs before tool execution to provide agent guidance
 */

const fs = require('fs');
const path = require('path');

// Get project root
const projectRoot = process.cwd();
const claudeDir = path.join(projectRoot, '.claude');
const contextDir = path.join(claudeDir, 'agent-context');

// Environment variables from Claude Code
const toolName = process.env.tool_name || '';
const fileName = process.env.file_name || '';
const workingDir = process.env.working_dir || projectRoot;

/**
 * Load agent context if available
 */
function loadAgentContext() {
  const contextFile = path.join(contextDir, 'current-agents.md');
  
  try {
    if (fs.existsSync(contextFile)) {
      const stats = fs.statSync(contextFile);
      const age = Date.now() - stats.mtime.getTime();
      
      // Use context if less than 10 minutes old
      if (age < 10 * 60 * 1000) {
        return fs.readFileSync(contextFile, 'utf-8');
      }
    }
  } catch (e) {
    // Ignore errors, return null for no context
  }
  
  return null;
}

/**
 * Load agent suggestions for current file
 */
function loadFileSuggestions() {
  if (!fileName) return null;
  
  const suggestionsFile = path.join(contextDir, 'cache', `suggestions_${fileName}.json`);
  
  try {
    if (fs.existsSync(suggestionsFile)) {
      const suggestions = JSON.parse(fs.readFileSync(suggestionsFile, 'utf-8'));
      return formatSuggestions(suggestions);
    }
  } catch (e) {
    // Ignore errors
  }
  
  return null;
}

/**
 * Format suggestions for Claude consumption
 */
function formatSuggestions(suggestions) {
  if (!suggestions.suggestions || suggestions.suggestions.length === 0) {
    return null;
  }

  let formatted = `\n## Agent Suggestions for This File\n\n`;
  
  if (suggestions.agentResponses > 0) {
    formatted += `${suggestions.agentResponses} agents analyzed this change:\n\n`;
  }

  suggestions.suggestions.forEach((suggestion, index) => {
    formatted += `${index + 1}. **${suggestion.type}**: ${suggestion.description}\n`;
    formatted += `   - Priority: ${suggestion.priority} | Impact: ${suggestion.impact}\n\n`;
  });

  return formatted;
}

/**
 * Get tool-specific guidance
 */
function getToolGuidance(tool) {
  const guidance = {
    'Edit': 'Consider agent suggestions for code quality and maintainability.',
    'Write': 'New files should follow project patterns learned by your agents.',
    'MultiEdit': 'Large changes benefit from agent validation - check suggestions.',
    'Bash': 'Running commands may trigger agent analysis of any file changes.'
  };

  return guidance[tool] || '';
}

/**
 * Main context provider logic
 */
function provideContext() {
  // Only provide context for relevant tools
  const relevantTools = ['Edit', 'Write', 'MultiEdit', 'Bash'];
  
  if (!relevantTools.includes(toolName)) {
    process.exit(0);
  }

  let contextOutput = '';

  // Load agent context
  const agentContext = loadAgentContext();
  if (agentContext) {
    contextOutput += agentContext + '\n\n';
  }

  // Load file-specific suggestions
  const suggestions = loadFileSuggestions();
  if (suggestions) {
    contextOutput += suggestions;
  }

  // Add tool-specific guidance
  const guidance = getToolGuidance(toolName);
  if (guidance) {
    contextOutput += `\n## Tool Guidance\n${guidance}\n\n`;
  }

  // Output context if we have any
  if (contextOutput.trim()) {
    // Write to temporary file for Claude Code to read
    const tempContextFile = path.join(contextDir, 'temp_context.md');
    try {
      fs.writeFileSync(tempContextFile, contextOutput, 'utf-8');
    } catch (e) {
      // Fail silently if we can't write context
    }
  }

  // Also try to refresh agent context asynchronously
  refreshAgentContextAsync();
}

/**
 * Asynchronously refresh agent context for next time
 */
function refreshAgentContextAsync() {
  const bridgePath = path.join(claudeDir, 'agent-context', 'bridge.js');
  
  if (fs.existsSync(bridgePath)) {
    const { spawn } = require('child_process');
    
    // Run bridge refresh in background, don't wait
    const child = spawn('node', [bridgePath, 'refresh'], {
      detached: true,
      stdio: 'ignore'
    });
    
    child.unref(); // Don't keep process alive
  }
}

/**
 * Create context directory if it doesn't exist
 */
function ensureContextDirectory() {
  try {
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }
  } catch (e) {
    // Ignore directory creation errors
  }
}

// Main execution
try {
  ensureContextDirectory();
  provideContext();
} catch (error) {
  // Fail silently - don't break Claude Code if context provider fails
  process.exit(0);
}