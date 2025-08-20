#!/usr/bin/env node

/**
 * Agent Context Bridge - Core integration layer between mech-evolve agents and Claude Code
 * Provides caching, context management, and bidirectional communication
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

class AgentContextBridge {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.claudeDir = path.join(projectPath, '.claude');
    this.contextDir = path.join(this.claudeDir, 'agent-context');
    this.cacheDir = path.join(this.contextDir, 'cache');
    this.evolveUrl = process.env.MECH_EVOLVE_URL || 'http://localhost:3011';
    
    // Memory cache for hot data
    this.memoryCache = new Map();
    this.cacheTimestamps = new Map();
    this.maxCacheAge = 5 * 60 * 1000; // 5 minutes
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.contextDir, this.cacheDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Get application ID for this project
   */
  getApplicationId() {
    try {
      const ProjectIdManager = require('../hooks/project-id-manager.cjs');
      return new ProjectIdManager(this.projectPath).getApplicationId();
    } catch (e) {
      return `fallback-${path.basename(this.projectPath)}-${Date.now()}`;
    }
  }

  /**
   * Get active agents with caching
   */
  async getActiveAgents(forceRefresh = false) {
    const cacheKey = 'active_agents';
    
    // Check memory cache first
    if (!forceRefresh && this.isMemoryCacheValid(cacheKey)) {
      return this.memoryCache.get(cacheKey);
    }

    // Check file cache
    if (!forceRefresh) {
      const fileCache = this.getFileCache('agents.json');
      if (fileCache) {
        this.setMemoryCache(cacheKey, fileCache);
        return fileCache;
      }
    }

    // Fetch from service
    try {
      const applicationId = this.getApplicationId();
      const agents = await this.fetchFromService(`/api/agents/${applicationId}`);
      
      if (agents && agents.success) {
        this.setMemoryCache(cacheKey, agents);
        this.setFileCache('agents.json', agents);
        return agents;
      }
    } catch (error) {
      console.warn('Failed to fetch agents:', error.message);
    }

    // Fallback to last known state
    return this.getFileCache('agents.json') || { agents: [] };
  }

  /**
   * Generate Claude Code context with agent insights
   */
  async generateClaudeContext() {
    const agents = await this.getActiveAgents();
    
    if (!agents.agents || agents.agents.length === 0) {
      return this.generateFallbackContext();
    }

    const context = this.buildAgentContext(agents.agents);
    
    // Save to file for Claude Code to read
    const contextPath = path.join(this.contextDir, 'current-agents.md');
    fs.writeFileSync(contextPath, context, 'utf-8');
    
    return context;
  }

  buildAgentContext(agents) {
    const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'learning');
    
    if (activeAgents.length === 0) {
      return this.generateFallbackContext();
    }

    let context = `# Active AI Agents for This Project\n\n`;
    context += `You have ${activeAgents.length} specialized AI agents monitoring and improving this codebase:\n\n`;

    activeAgents.forEach(agent => {
      context += `## ${agent.name} (${agent.role})\n`;
      context += `**Purpose**: ${agent.purpose}\n`;
      context += `**Performance**: ${agent.performance.suggestionsGenerated} suggestions generated\n`;
      
      if (agent.patterns > 0) {
        context += `**Learned Patterns**: ${agent.patterns} patterns recognized\n`;
      }
      
      context += `**Capabilities**: ${agent.capabilities.join(', ')}\n`;
      context += `**Priority**: ${agent.priority} (Tier ${agent.tier})\n\n`;
    });

    context += `## Agent Collaboration\n`;
    context += `These agents work together to provide intelligent suggestions. When making code changes, consider their specialized insights and learned patterns from this project.\n\n`;
    
    const topAgent = activeAgents.reduce((top, agent) => 
      agent.performance.suggestionsGenerated > top.performance.suggestionsGenerated ? agent : top
    );
    
    context += `**Most Active Agent**: ${topAgent.name} has provided the most guidance recently.\n\n`;
    context += `---\n*Agent status updated: ${new Date().toLocaleString()}*`;

    return context;
  }

  generateFallbackContext() {
    return `# AI Agent System Available

Your project is configured with mech-evolve dynamic agents, but they haven't been activated yet.

To activate agents for this project:
1. Ensure mech-evolve service is running
2. Trigger agent creation with: \`curl -X POST http://localhost:3011/api/agents/analyze-project -H "Content-Type: application/json" -d '{"applicationId":"${this.getApplicationId()}","projectPath":"${this.projectPath}"}'\`

Once activated, specialized agents will monitor your code changes and provide intelligent suggestions.

---
*Check agent status: ./mech-evolve status*`;
  }

  /**
   * Memory cache management
   */
  isMemoryCacheValid(key) {
    if (!this.memoryCache.has(key)) return false;
    
    const timestamp = this.cacheTimestamps.get(key);
    return timestamp && (Date.now() - timestamp) < this.maxCacheAge;
  }

  setMemoryCache(key, value) {
    this.memoryCache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * File cache management
   */
  getFileCache(filename) {
    const filePath = path.join(this.cacheDir, filename);
    
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const age = Date.now() - stats.mtime.getTime();
        
        // File cache valid for 1 hour
        if (age < 60 * 60 * 1000) {
          return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
      }
    } catch (e) {
      // Ignore cache read errors
    }
    
    return null;
  }

  setFileCache(filename, data) {
    const filePath = path.join(this.cacheDir, filename);
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to write cache file:', e.message);
    }
  }

  /**
   * Network utilities
   */
  async fetchFromService(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.evolveUrl);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'mech-evolve-bridge',
          ...options.headers
        },
        timeout: 5000 // 5 second timeout
      };

      const req = protocol.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));

      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  /**
   * Public API for hooks
   */
  async refreshContext() {
    await this.generateClaudeContext();
  }

  async getQuickSuggestions(filePath) {
    const cacheKey = `quick_${filePath}`;
    
    if (this.isMemoryCacheValid(cacheKey)) {
      return this.memoryCache.get(cacheKey);
    }

    // Get cached suggestions for similar files
    const ext = path.extname(filePath);
    const suggestions = this.getCommonSuggestions(ext);
    
    this.setMemoryCache(cacheKey, suggestions);
    return suggestions;
  }

  getCommonSuggestions(fileExtension) {
    const suggestions = {
      '.ts': ['type-check', 'linting', 'formatting'],
      '.tsx': ['component-analysis', 'prop-validation', 'accessibility'],
      '.js': ['linting', 'formatting', 'complexity-check'],
      '.jsx': ['component-analysis', 'prop-validation'],
      '.py': ['pep8-check', 'type-hints', 'security-scan'],
      '.go': ['fmt-check', 'vet-analysis', 'mod-tidy']
    };

    return suggestions[fileExtension] || ['general-analysis'];
  }
}

// CLI interface
if (require.main === module) {
  const bridge = new AgentContextBridge();
  const command = process.argv[2];

  switch (command) {
    case 'refresh':
      bridge.refreshContext().then(() => {
        console.log('Agent context refreshed');
      }).catch(console.error);
      break;
      
    case 'agents':
      bridge.getActiveAgents(true).then(agents => {
        console.log(JSON.stringify(agents, null, 2));
      }).catch(console.error);
      break;
      
    case 'context':
      bridge.generateClaudeContext().then(context => {
        console.log(context);
      }).catch(console.error);
      break;
      
    default:
      console.log('Usage: node bridge.js [refresh|agents|context]');
  }
}

module.exports = AgentContextBridge;