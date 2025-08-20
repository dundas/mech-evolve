# Mech Evolve - Dynamic Agent Creation Service

> **Live Service**: https://evolve.mech.is  
> **Port**: 3011 (local development)  
> **Status**: Production Ready ✅

A dynamic agent creation and evolution service that automatically spawns specialized AI agents for your codebase. These agents learn from your coding patterns, provide intelligent suggestions, and evolve over time to become better development assistants.

## 🚀 Features

- 🤖 **Dynamic Agent Creation** - Automatically analyzes your codebase and creates specialized agents
- 📊 **Pattern Learning** - Agents learn from your coding patterns and improve over time  
- 💡 **Real-time Suggestions** - Provides intelligent suggestions during development
- 🔄 **Agent Evolution** - Agents adapt and improve based on feedback and usage
- 🎯 **Specialized Roles** - Creates agents for quality assurance, testing, security, performance
- 🌐 **Claude Code Integration** - Seamless integration with Claude Code workflows
- 🧠 **Persistent Memory** - Agents remember patterns and maintain learning across sessions
- 📝 **Multi-tier System** - Priority-based agent activation (Tier 1: Critical, Tier 2: Important, Tier 3: Nice-to-have)

## 🏃 Quick Start

### 1. Test the Live Service

```bash
# Check service health
curl https://evolve.mech.is/health

# List available agent templates
curl https://evolve.mech.is/api/docs
```

### 2. Create Your First Agents

```bash
# Analyze your project and create agents
curl -X POST https://evolve.mech.is/api/agents/analyze-project \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "my-awesome-project",
    "projectPath": "/path/to/your/project",
    "technologies": ["javascript", "react", "node.js"],
    "projectType": "web-application"
  }'
```

### 3. Check Your Agents

```bash
# View created agents for your project
curl https://evolve.mech.is/api/agents/my-awesome-project

# Get agent details and learned patterns
curl https://evolve.mech.is/api/agents/my-awesome-project/agent-id/memory
```

### 4. Integration with Claude Code

```bash
# In your project directory, enable evolution tracking
./mech-evolve on

# Check evolution status
./mech-evolve status

# Start developing - agents will automatically provide suggestions!
```

## 🏗️ Architecture

The mech-evolve service integrates with the broader Mech AI ecosystem:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude Code   │───▶│  mech-evolve    │───▶│  Specialized    │
│   Integration   │    │   (Port 3011)   │    │    Agents       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │  MongoDB    │ │ mech-queue  │ │ mech-llms   │
        │ (Agents DB) │ │(Port 3003)  │ │(Port 3008)  │
        └─────────────┘ └─────────────┘ └─────────────┘
```

## 🤖 Available Agent Types

### Tier 1 (Critical - Always Active)
- **CodeQualityGuardian** - Maintains code quality, linting, formatting, complexity analysis
- **SecuritySentinel** - Identifies security vulnerabilities and enforces secure coding practices

### Tier 2 (Important - Activated for Relevant Projects)  
- **TestingChampion** - Ensures comprehensive test coverage, generates tests, analyzes coverage
- **PerformanceOptimizer** - Optimizes code performance, identifies bottlenecks
- **APIDesigner** - Designs and validates API interfaces and contracts

### Tier 3 (Nice-to-have - Activated Based on Project Needs)
- **DocumentationMaestro** - Maintains documentation quality and completeness
- **AccessibilityAdvocate** - Ensures accessibility compliance and best practices
- **InternationalizationExpert** - Handles multi-language and localization concerns

## 🔌 API Overview

### Core Endpoints

| Endpoint | Method | Purpose | Example |
|----------|--------|---------|---------|
| `/health` | GET | Service health check | `curl evolve.mech.is/health` |
| `/api/docs` | GET | API documentation | `curl evolve.mech.is/api/docs` |
| `/api/agents/analyze-project` | POST | Create agents for project | See examples below |
| `/api/agents/{applicationId}` | GET | List project agents | `curl evolve.mech.is/api/agents/my-project` |
| `/api/agents/{applicationId}/{agentId}/memory` | GET | Get agent memory | View learned patterns |
| `/api/evolution/track` | POST | Track code changes | Used by Claude Code hooks |
| `/api/evolution/suggest/{projectId}` | GET | Get suggestions | Get agent recommendations |

### Agent Creation Example

```bash
curl -X POST https://evolve.mech.is/api/agents/analyze-project \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "my-react-app", 
    "projectPath": "/Users/dev/my-react-app",
    "technologies": ["react", "typescript", "jest"],
    "projectType": "frontend-application",
    "preferences": {
      "codeStyle": "strict",
      "testCoverage": "high",
      "performance": "optimized"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "applicationId": "my-react-app",
  "agentsCreated": 3,
  "agents": [
    {
      "id": "my-react-app_codequalityguardian_123",
      "name": "CodeQualityGuardian", 
      "role": "quality-assurance",
      "tier": 1,
      "status": "learning",
      "capabilities": ["linting", "formatting", "complexity-analysis"]
    },
    {
      "id": "my-react-app_testingchampion_124",
      "name": "TestingChampion",
      "role": "testing", 
      "tier": 2,
      "status": "learning",
      "capabilities": ["test-generation", "coverage-analysis", "mocking"]
    }
  ]
}
```

## 🔄 Claude Code Integration

### Enable Evolution Tracking

The mech-evolve service integrates seamlessly with Claude Code through hooks:

```bash
# In your project directory
./mech-evolve on    # Enable evolution tracking
./mech-evolve status # Check if tracking is active  
./mech-evolve off   # Disable evolution tracking
```

### How It Works

1. **Analysis**: Scans codebase to understand patterns and needs
2. **Agent Creation**: Creates specialized agents based on project requirements
3. **Pre-tool Context**: Before Claude Code edits files, agents provide relevant suggestions
4. **Post-tool Learning**: After edits, agents analyze changes and learn patterns
5. **Evolution**: Agents improve over time based on feedback and success

### Hook Files Created

```
.claude/
├── settings-enhanced.json          # Claude Code hook configuration
├── hooks/
│   ├── context-provider.cjs       # Pre-tool suggestions
│   ├── evolve-hook-enhanced.cjs    # Post-tool learning
│   └── project-id-manager.cjs      # Project identification
└── agent-context/
    ├── bridge.js                   # Agent context management
    ├── cache/                      # Cached suggestions
    └── current-agents.md           # Agent status for Claude
```

## 🧪 Local Development

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Git

### Setup

```bash
# Clone repository
git clone <mech-evolve-repo>
cd mech-evolve

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your MongoDB URI and other settings

# Build the service
npm run build

# Start development server
npm run dev

# Verify service is running
curl http://localhost:3011/health
```

### Environment Variables

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/mech-evolve
PORT=3011

# Optional
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Test specific functionality
npm run test:agents
npm run test:evolution

# Test the API endpoints
curl -X POST http://localhost:3011/api/agents/analyze-project \
  -H "Content-Type: application/json" \
  -d '{"applicationId":"test-project","projectPath":"."}'

# Test Claude Code integration
./mech-evolve status                    # Check agent status
node .claude/hooks/context-provider.cjs # Test context provider
echo '{"tool":"Edit","file_path":"test.js"}' | node .claude/hooks/evolve-hook-enhanced.cjs
```

## 📚 Documentation

- [Agent Architecture Guide](./AGENT_ARCHITECTURE_GUIDE.md)
- [Inspection Guide](./INSPECTION_GUIDE.md) 
- [API Reference](./API_CLI_REFERENCE.md)

---

**mech-evolve** - Empowering developers with intelligent AI agents that learn and evolve with your codebase.

🌟 **Try it now**: Visit [evolve.mech.is](https://evolve.mech.is) and create your first intelligent coding agents!
