#!/bin/bash

# Setup Claude Code Agents from Mech-Evolve
# This script configures Claude Code to use the dynamically created agents

echo "🤖 Setting up Claude Code Agents from Mech-Evolve"
echo "================================================"

# Check if service is running
EVOLVE_URL="${MECH_EVOLVE_URL:-http://localhost:3011}"
if ! curl -s "$EVOLVE_URL/health" | grep -q "healthy"; then
  echo "❌ Mech-Evolve service not running at $EVOLVE_URL"
  echo "Start it with: PORT=3011 npm start"
  exit 1
fi

echo "✅ Mech-Evolve service is running"

# Get application ID
APP_ID="${1:-mech-evolve}"
echo "📦 Application ID: $APP_ID"

# Fetch agents from the service
echo "🔍 Fetching agents from service..."
AGENTS_JSON=$(curl -s "$EVOLVE_URL/api/agents/$APP_ID")

if [ "$(echo "$AGENTS_JSON" | jq -r '.success')" != "true" ]; then
  echo "❌ Failed to fetch agents"
  exit 1
fi

AGENT_COUNT=$(echo "$AGENTS_JSON" | jq -r '.agentCount')
echo "✅ Found $AGENT_COUNT agents"

# Generate Claude Code configuration using the formatter
echo "📝 Generating Claude Code configuration..."
node -e "
const { ClaudeAgentFormatter } = require('./dist/services/claude-agent-formatter');
const formatter = new ClaudeAgentFormatter();

const agentsData = $AGENTS_JSON;
const agents = agentsData.agents.map(a => ({
  name: a.name,
  applicationId: a.applicationId || '$APP_ID',
  role: a.role,
  purpose: a.purpose,
  tier: a.tier,
  priority: a.priority,
  triggers: a.triggers || [],
  capabilities: a.capabilities || []
}));

const config = formatter.generateAgentsConfig(agents);
console.log(JSON.stringify(JSON.parse(config), null, 2));
" > .claude/agents.json

echo "✅ Configuration saved to .claude/agents.json"

# Generate individual prompt files
echo "📄 Generating prompt files..."
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('.claude/agents.json', 'utf-8'));

config.agents.forEach(agent => {
  const filename = \`.claude/prompts/\${agent.name}-prompt.txt\`;
  fs.mkdirSync('.claude/prompts', { recursive: true });
  fs.writeFileSync(filename, agent.prompt);
  console.log('Created: ' + filename);
});
"

# Display the agents that are ready for Claude Code
echo ""
echo "🎉 Claude Code Agents Ready!"
echo "============================"
echo ""
echo "The following agents are now configured for Claude Code:"
echo ""

node -e "
const config = JSON.parse(require('fs').readFileSync('.claude/agents.json', 'utf-8'));
config.agents.forEach(agent => {
  const proactive = agent.proactive ? '✅ PROACTIVE' : '⭕ ON-DEMAND';
  console.log(\`• \${agent.name} (\${proactive})\`);
  console.log(\`  \${agent.description}\`);
  console.log('');
});
"

echo "📋 How to use these agents in Claude Code:"
echo ""
echo "1. Proactive agents will automatically activate when relevant changes occur"
echo "2. On-demand agents can be invoked with: @agent-[name]"
echo "3. Check agent status with: /agents"
echo ""
echo "Example commands:"
echo "  @agent-code-quality-guardian - Run code quality checks"
echo "  @agent-testing-champion - Generate or run tests"
echo "  @agent-typescript-guru - Optimize TypeScript code"
echo ""
echo "✨ Your AI agents are ready to evolve your code!"