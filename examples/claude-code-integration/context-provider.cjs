#!/usr/bin/env node

/**
 * Context Provider Hook - Pre-tool execution hook
 * Injects agent insights and suggestions into Claude Code context
 * Runs before Edit/Write/MultiEdit tools to provide agent guidance
 */

const path = require('path');
const fs = require('fs');

class ContextProvider {
  constructor() {
    this.projectPath = process.cwd();
    this.contextDir = path.join(this.projectPath, '.claude', 'agent-context');
    this.cacheDir = path.join(this.contextDir, 'cache');
  }

  async loadAgentContext() {
    try {
      // Load current agent context if available
      const contextFile = path.join(this.contextDir, 'current-agents.md');
      if (fs.existsSync(contextFile)) {
        return fs.readFileSync(contextFile, 'utf-8');
      }

      // Try to generate fresh context
      const AgentContextBridge = require('../agent-context/bridge.js');
      const bridge = new AgentContextBridge(this.projectPath);
      return await bridge.generateClaudeContext();
    } catch (error) {
      return this.getFallbackContext();
    }
  }

  async loadFileSuggestions(filePath) {
    try {
      // First try latest suggestions
      const latestFile = path.join(this.cacheDir, 'latest_suggestions.json');
      if (fs.existsSync(latestFile)) {
        const latest = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
        if (latest.filePath === filePath && latest.suggestions?.suggestions) {
          return latest.suggestions.suggestions;
        }
      }

      // Then try file-specific cache
      const fileName = path.basename(filePath);
      const fileSpecificCache = path.join(this.cacheDir, `suggestions_${fileName}.json`);
      if (fs.existsSync(fileSpecificCache)) {
        const cached = JSON.parse(fs.readFileSync(fileSpecificCache, 'utf-8'));
        if (cached.suggestions) {
          return cached.suggestions;
        }
      }
    } catch (error) {
      // Ignore cache read errors
    }
    
    return [];
  }

  formatSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
      return '';
    }

    let formatted = '\n## Agent Suggestions\n\n';
    formatted += 'Your AI agents have analyzed recent changes and suggest:\n\n';
    
    suggestions.forEach((suggestion, i) => {
      formatted += `${i + 1}. **${suggestion.type}**: ${suggestion.description}\n`;
      if (suggestion.reason) {
        formatted += `   *Reason*: ${suggestion.reason}\n`;
      }
    });

    formatted += '\nConsider these insights when making your changes.\n';
    return formatted;
  }

  getFallbackContext() {
    return `
# AI Agent System Status

Your project has mech-evolve agents configured but they may not be active yet.
To activate intelligent code assistance, ensure the mech-evolve service is running.

## Quick Commands
- Start service: \`cd mech-evolve && npm start\`
- Check status: \`curl http://localhost:3011/health\`
- Activate agents: Use the analyze-project endpoint

---
*Context updated: ${new Date().toLocaleString()}*`;
  }

  async run() {
    try {
      // Get the tool that's about to be executed
      const toolName = process.env.CLAUDE_TOOL_NAME || 'unknown';
      const targetFiles = process.env.CLAUDE_TARGET_FILES ? 
        process.env.CLAUDE_TARGET_FILES.split(',') : [];

      // Load agent context
      const agentContext = await this.loadAgentContext();
      
      // Load file-specific suggestions if we know what files are being modified
      let suggestions = [];
      for (const filePath of targetFiles) {
        const fileSuggestions = await this.loadFileSuggestions(filePath);
        suggestions.push(...fileSuggestions);
      }

      // Format output for Claude Code
      let output = agentContext;
      
      if (suggestions.length > 0) {
        output += this.formatSuggestions(suggestions);
      }

      // Output context for Claude Code to see
      console.log(output);
      
      return 0;
    } catch (error) {
      console.error('Context provider failed:', error.message);
      console.log(this.getFallbackContext());
      return 0; // Don't fail the hook, just provide fallback
    }
  }
}

// Execute if called directly
if (require.main === module) {
  const provider = new ContextProvider();
  provider.run().then(process.exit).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = ContextProvider;