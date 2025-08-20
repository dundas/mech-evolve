# Claude Code Integration Examples

This directory contains example files for integrating mech-evolve with Claude Code.

## Files

### Core Integration
- **bridge.js** - Agent Context Bridge that manages caching and communication between agents and Claude Code
- **settings-enhanced.json** - Claude Code settings configuration for hooks

### Hook Files
- **context-provider.cjs** - Pre-tool execution hook that provides agent context to Claude Code
- **evolve-hook-enhanced.cjs** - Post-tool execution hook that tracks changes and triggers agent learning
- **project-id-manager.cjs** - Utility for consistent project identification

## Installation

To use these integration files in your project:

1. Copy the files to your project's `.claude` directory:
```bash
cp -r examples/claude-code-integration/* /your/project/.claude/
```

2. Ensure the directory structure looks like:
```
.claude/
├── settings-enhanced.json
├── hooks/
│   ├── context-provider.cjs
│   ├── evolve-hook-enhanced.cjs
│   └── project-id-manager.cjs
└── agent-context/
    └── bridge.js
```

3. Enable evolution tracking:
```bash
./mech-evolve on
```

4. Start the mech-evolve service:
```bash
cd mech-evolve && npm start
```

## How It Works

### Pre-Tool Execution (context-provider.cjs)
Before Claude Code executes any tool (Edit, Write, MultiEdit), the context provider:
1. Loads active agents for your project
2. Retrieves cached suggestions from previous analyses
3. Injects agent context into Claude Code's context

### Post-Tool Execution (evolve-hook-enhanced.cjs)
After Claude Code executes a tool, the evolution hook:
1. Captures the change details (file, type, description)
2. Sends change to mech-evolve service for agent analysis
3. Caches agent suggestions for next interaction
4. Triggers context refresh for immediate availability

### Agent Context Bridge (bridge.js)
The bridge provides:
- Memory caching for hot data (5-minute cache)
- File caching for persistent data (1-hour cache)
- Fallback mechanisms for service unavailability
- API communication with mech-evolve service

## Testing

Test individual components:

```bash
# Test context provider
node .claude/hooks/context-provider.cjs

# Test evolution hook with sample input
echo '{"tool":"Edit","file_path":"test.js"}' | node .claude/hooks/evolve-hook-enhanced.cjs

# Test bridge operations
node .claude/agent-context/bridge.js agents
node .claude/agent-context/bridge.js context
node .claude/agent-context/bridge.js refresh
```

## Configuration

### Environment Variables
- `MECH_EVOLVE_URL` - URL of mech-evolve service (default: http://localhost:3011)
- `CLAUDE_PROJECT_DIR` - Project root directory (auto-detected)

### Settings Configuration
The `settings-enhanced.json` file configures:
- Hook matchers for specific tools
- Context refresh intervals
- Cache timeout settings
- Fallback modes

## Troubleshooting

### Agents Not Providing Suggestions
1. Check mech-evolve service is running: `curl http://localhost:3011/health`
2. Verify agents exist: `curl http://localhost:3011/api/agents/your-project-id`
3. Check cache directory: `ls .claude/agent-context/cache/`

### Hooks Not Triggering
1. Verify settings file: `cat .claude/settings-enhanced.json`
2. Check hook permissions: `ls -la .claude/hooks/`
3. Test hooks manually with sample input

### Cache Issues
1. Clear cache: `rm -rf .claude/agent-context/cache/*`
2. Refresh context: `node .claude/agent-context/bridge.js refresh`
3. Check cache timestamps in files

## Advanced Usage

### Custom Agent Types
Modify the agent creation request to specify custom agent types:

```javascript
// In your project setup
const customAgents = {
  applicationId: "my-project",
  customAgents: [
    {
      name: "DatabaseOptimizer",
      role: "database",
      tier: 2,
      capabilities: ["query-optimization", "index-analysis"]
    }
  ]
};
```

### Filtering Suggestions
Configure suggestion filtering in the context provider:

```javascript
// In context-provider.cjs
const filteredSuggestions = suggestions.filter(s => 
  s.priority === 1 && s.impact === 'high'
);
```

### Custom Caching Strategy
Adjust cache timeouts in bridge.js:

```javascript
// In bridge.js
this.maxCacheAge = 10 * 60 * 1000; // 10 minutes instead of 5
```

---

For more information, see the main [mech-evolve documentation](../../README.md).