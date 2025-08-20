# Mech-Evolve API & CLI Reference

## Complete Reference for User Interaction

This comprehensive reference covers all CLI commands and API endpoints available for interacting with the mech-evolve system. Whether you prefer command-line tools or programmatic access, this guide has you covered.

## 🛠️ CLI Commands Reference

### Core Commands

#### `./mech-evolve on`
Enables evolution tracking for the current project.
```bash
./mech-evolve on
# Output: 🚀 Evolution ENABLED
# Creates .claude/settings.json with hook configuration
```

#### `./mech-evolve off` 
Disables evolution tracking for the current project.
```bash
./mech-evolve off
# Output: 🛑 Evolution DISABLED
# Updates .claude/settings.json to disable hooks
```

#### `./mech-evolve status`
Shows current system status and project information.
```bash
./mech-evolve status
# Output:
# 🟢 Evolution ACTIVE
# 📋 App ID: mech-your-project-abc123
# 🏗️ Architect Agent: ACTIVE (last analysis: 2m ago)
# 🔨 Builder Agent: IDLE (ready)
# ✅ Validator Agent: PROCESSING (analyzing security)
# 📚 Scribe Agent: ACTIVE (updating docs)
# 📈 Changes tracked: 47 | Suggestions applied: 23
```

### Inspection Commands

#### `./mech-evolve learnings`
Displays what the system has learned about your project.
```bash
./mech-evolve learnings
# Shows detected patterns, code insights, and learning trends
```

#### `./mech-evolve suggestions`
Lists current improvement suggestions ranked by priority.
```bash
./mech-evolve suggestions
# Options:
./mech-evolve suggestions --limit 5      # Show top 5 suggestions
./mech-evolve suggestions --agent builder # Show only Builder suggestions
./mech-evolve suggestions --priority high # Show only high-priority items
```

#### `./mech-evolve history`
Shows evolution history and applied improvements.
```bash
./mech-evolve history
# Options:
./mech-evolve history --days 7          # Last 7 days
./mech-evolve history --type security   # Security-related changes only
./mech-evolve history --agent validator # Changes by Validator agent
```

### Agent Commands

#### `./mech-evolve agents`
Shows status of all specialized agents.
```bash
./mech-evolve agents
# Output:
# 🏗️ Architect Agent: ACTIVE (last analysis: 2m ago)
# 🔨 Builder Agent: IDLE (ready)  
# ✅ Validator Agent: PROCESSING (analyzing security)
# 📚 Scribe Agent: ACTIVE (updating docs)
```

#### `./mech-evolve agent-memory <agent>`
Shows specific agent's knowledge and patterns.
```bash
./mech-evolve agent-memory architect
./mech-evolve agent-memory builder
./mech-evolve agent-memory validator
./mech-evolve agent-memory scribe
```

### Pattern Analysis Commands

#### `./mech-evolve patterns`
Shows detected code patterns and conventions.
```bash
./mech-evolve patterns
# Options:
./mech-evolve patterns --confidence 0.8  # Show patterns with 80%+ confidence
./mech-evolve patterns --type naming     # Show only naming patterns
./mech-evolve patterns --export json     # Export patterns as JSON
```

#### `./mech-evolve collaboration`
Shows inter-agent communication logs.
```bash
./mech-evolve collaboration
# Options:
./mech-evolve collaboration --recent     # Last 24 hours only
./mech-evolve collaboration --agents architect,builder # Specific agents
```

### Performance Commands

#### `./mech-evolve performance`
Shows system performance metrics.
```bash
./mech-evolve performance
# Output includes response times, success rates, memory usage
```

#### `./mech-evolve agent-performance <agent>`
Shows performance metrics for specific agent.
```bash
./mech-evolve agent-performance architect
# Shows suggestion acceptance rate, response time, accuracy
```

### Sync Commands (Cross-Machine)

#### `./mech-evolve sync push`
Pushes local improvements to other machines.
```bash
./mech-evolve sync push
# Options:
./mech-evolve sync push --force         # Force push even if conflicts exist
./mech-evolve sync push --dry-run       # Preview what would be synced
```

#### `./mech-evolve sync pull`
Pulls improvements from other machines.
```bash
./mech-evolve sync pull
# Options:
./mech-evolve sync pull --merge         # Auto-merge compatible changes
./mech-evolve sync pull --preview       # Show available improvements
```

#### `./mech-evolve sync status`
Shows synchronization status across machines.
```bash
./mech-evolve sync status
# Shows connected machines, sync lag, pending improvements
```

### Maintenance Commands

#### `./mech-evolve refresh`
Refreshes patterns and agent memories.
```bash
./mech-evolve refresh
# Options:
./mech-evolve refresh --patterns        # Refresh patterns only
./mech-evolve refresh --agents          # Refresh agent memories
```

#### `./mech-evolve reset`
Resets learning data (use with caution).
```bash
./mech-evolve reset
# Options:
./mech-evolve reset --patterns          # Reset patterns only
./mech-evolve reset --suggestions       # Clear pending suggestions
./mech-evolve reset --confirm           # Required for destructive operations
```

## 🌐 API Endpoints Reference

### Base URL
```
http://evolve.mech.is
```

### Authentication
Most endpoints require project identification via `applicationId` parameter or header.

### Evolution Tracking Endpoints

#### Track Code Change
```http
POST /api/evolution/track
Content-Type: application/json

{
  "applicationId": "mech-your-project-abc123",
  "toolName": "Edit|Write|MultiEdit|Bash",
  "filePath": "/path/to/file.ts",
  "changeType": "function-add|refactor|bug-fix",
  "metadata": {
    "linesChanged": 10,
    "complexity": "medium"
  }
}
```

Response:
```json
{
  "success": true,
  "evolutionId": "evo-001",
  "suggestions": [
    {
      "type": "security",
      "priority": 8,
      "description": "Add input validation"
    }
  ],
  "message": "Change tracked and analyzed"
}
```

#### Get Improvement Suggestions
```http
GET /api/evolution/suggest/{projectId}?limit=10&priority=high
```

Response:
```json
{
  "success": true,
  "suggestions": [
    {
      "id": "suggest-001",
      "type": "security", 
      "priority": 10,
      "agent": "validator",
      "title": "Fix SQL injection vulnerability",
      "filePath": "/api/search.ts",
      "implementation": {
        "command": "Edit",
        "changes": [...]
      },
      "effort": "low",
      "impact": "critical"
    }
  ],
  "count": 5
}
```

#### Apply Improvement
```http
POST /api/evolution/apply
Content-Type: application/json

{
  "suggestionId": "suggest-001",
  "projectId": "mech-your-project-abc123",
  "machineId": "dev-machine-001",
  "result": {
    "success": true,
    "changes": [
      {
        "file": "/api/search.ts",
        "linesChanged": 3
      }
    ]
  }
}
```

#### Get Evolution History
```http
GET /api/evolution/history/{projectId}?limit=20&days=7
```

Response:
```json
{
  "success": true,
  "projectId": "mech-your-project-abc123",
  "count": 15,
  "evolutions": [
    {
      "id": "evo-001",
      "timestamp": "2025-08-20T10:30:45Z",
      "toolName": "Edit",
      "filePath": "/api/users.ts",
      "improvements": [
        {
          "type": "security",
          "description": "Added input validation",
          "applied": true
        }
      ]
    }
  ]
}
```

### Agent Endpoints

#### Get Agent Status
```http
GET /api/agents/status?projectId={projectId}
```

Response:
```json
{
  "success": true,
  "agents": {
    "architect": {
      "status": "active",
      "lastActivity": "2025-08-20T10:28:30Z",
      "currentTask": "analyzing project structure"
    },
    "builder": {
      "status": "idle", 
      "lastActivity": "2025-08-20T10:25:15Z",
      "currentTask": null
    },
    "validator": {
      "status": "processing",
      "lastActivity": "2025-08-20T10:30:00Z", 
      "currentTask": "security analysis"
    },
    "scribe": {
      "status": "active",
      "lastActivity": "2025-08-20T10:29:45Z",
      "currentTask": "updating documentation"
    }
  }
}
```

#### Get Agent Memory
```http
GET /api/agents/{agent}/memory?projectId={projectId}
```

Response:
```json
{
  "success": true,
  "agent": "architect",
  "projectId": "mech-your-project-abc123",
  "memory": {
    "patterns": {
      "architectural_style": "layered-architecture",
      "confidence": 0.92
    },
    "recommendations": [
      {
        "pattern": "service-extraction",
        "success_rate": 0.89,
        "applications": 5
      }
    ],
    "learning_velocity": 0.15
  }
}
```

#### Get Agent Suggestions
```http
GET /api/agents/{agent}/suggestions?projectId={projectId}&limit=10
```

### Pattern & Analytics Endpoints

#### Get Detected Patterns
```http
GET /api/evolution/patterns/{projectId}
```

Response:
```json
{
  "success": true,
  "projectId": "mech-your-project-abc123",
  "patterns": {
    "naming_conventions": {
      "files": "kebab-case",
      "functions": "camelCase",
      "confidence": 0.95
    },
    "architectural_style": "layered-architecture",
    "testing_framework": "jest"
  }
}
```

#### Get Project Metrics
```http
GET /api/analytics/metrics/{projectId}?period=7d
```

Response:
```json
{
  "success": true,
  "projectId": "mech-your-project-abc123", 
  "period": "7d",
  "metrics": {
    "totalChanges": 47,
    "totalImprovements": 23,
    "suggestionAcceptanceRate": 0.82,
    "byType": {
      "security": {"count": 8, "applied": 7},
      "performance": {"count": 5, "applied": 4},
      "testing": {"count": 12, "applied": 9}
    }
  }
}
```

### Sync Endpoints (Cross-Machine)

#### Push Improvements
```http
POST /api/sync/push
Content-Type: application/json

{
  "machineId": "dev-machine-001",
  "projectId": "mech-your-project-abc123",
  "improvements": [
    {
      "type": "pattern",
      "data": {...},
      "confidence": 0.89
    }
  ]
}
```

#### Pull Improvements
```http
GET /api/sync/pull/{machineId}?projectId={projectId}
```

Response:
```json
{
  "success": true,
  "improvements": [
    {
      "sourceMAchineId": "dev-machine-002",
      "type": "pattern",
      "data": {...},
      "timestamp": "2025-08-20T10:30:45Z"
    }
  ],
  "count": 3
}
```

#### Get Sync Status
```http
GET /api/sync/status/{projectId}
```

### Communication & Collaboration Endpoints

#### Get Agent Communications
```http
GET /api/communications/{projectId}?limit=20&recent=true
```

Response:
```json
{
  "success": true,
  "communications": [
    {
      "messageId": "msg-001",
      "from": "builder",
      "to": "validator", 
      "type": "collaboration_request",
      "timestamp": "2025-08-20T10:30:45Z",
      "payload": {
        "request": "Please review security implications",
        "context": "/api/auth.ts"
      }
    }
  ]
}
```

#### Get Performance Metrics
```http
GET /api/agents/performance/metrics?projectId={projectId}
```

Response:
```json
{
  "success": true,
  "performance": {
    "agent_metrics": {
      "architect": {
        "suggestion_acceptance_rate": 0.78,
        "average_response_time": 2.3,
        "specialization_accuracy": 0.89
      }
    },
    "system_metrics": {
      "total_suggestions": 156,
      "applied_suggestions": 128, 
      "average_application_time": 45
    }
  }
}
```

## 📝 Usage Examples

### CLI Workflow Example
```bash
# Daily development workflow
./mech-evolve status                    # Check system health
./mech-evolve suggestions --limit 3     # Review top suggestions
./mech-evolve learnings                 # See what system learned

# Weekly review workflow  
./mech-evolve history --days 7          # Review week's progress
./mech-evolve patterns                  # Check pattern evolution
./mech-evolve agent-performance architect # Check agent effectiveness
```

### API Integration Example
```javascript
// Node.js integration example
const axios = require('axios');

class MechEvolveClient {
  constructor(projectId, baseUrl = 'http://evolve.mech.is') {
    this.projectId = projectId;
    this.baseUrl = baseUrl;
  }

  async getSuggestions(limit = 10) {
    const response = await axios.get(
      `${this.baseUrl}/api/evolution/suggest/${this.projectId}?limit=${limit}`
    );
    return response.data;
  }

  async applySuggestion(suggestionId, result) {
    const response = await axios.post(
      `${this.baseUrl}/api/evolution/apply`,
      {
        suggestionId,
        projectId: this.projectId,
        machineId: process.env.MACHINE_ID,
        result
      }
    );
    return response.data;
  }

  async getPatterns() {
    const response = await axios.get(
      `${this.baseUrl}/api/evolution/patterns/${this.projectId}`
    );
    return response.data;
  }
}

// Usage
const client = new MechEvolveClient('mech-your-project-abc123');
const suggestions = await client.getSuggestions(5);
console.log(`Found ${suggestions.count} suggestions`);
```

### Python Integration Example
```python
import requests
import json

class MechEvolveClient:
    def __init__(self, project_id, base_url='http://evolve.mech.is'):
        self.project_id = project_id
        self.base_url = base_url
    
    def get_suggestions(self, limit=10):
        url = f"{self.base_url}/api/evolution/suggest/{self.project_id}"
        params = {'limit': limit}
        response = requests.get(url, params=params)
        return response.json()
    
    def get_agent_memory(self, agent):
        url = f"{self.base_url}/api/agents/{agent}/memory"
        params = {'projectId': self.project_id}
        response = requests.get(url, params=params)
        return response.json()

# Usage
client = MechEvolveClient('mech-your-project-abc123')
suggestions = client.get_suggestions(5)
print(f"Found {suggestions['count']} suggestions")
```

## 🚨 Error Handling

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid project ID)
- `404` - Not Found (project or resource doesn't exist)
- `429` - Rate Limited (too many requests)
- `500` - Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "error": "Project not found",
  "code": "PROJECT_NOT_FOUND",
  "details": {
    "projectId": "invalid-project-123",
    "suggestion": "Check project ID or run installation"
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# CLI configuration
export MECH_EVOLVE_URL="http://evolve.mech.is"
export MECH_PROJECT_ID="mech-your-project-abc123"
export MECH_MACHINE_ID="dev-machine-001"

# API configuration
export EVOLVE_API_KEY="your-api-key"  # If authentication enabled
export EVOLVE_TIMEOUT="30000"         # Request timeout in ms
```

### CLI Configuration File
Create `.mech-evolve.json` in project root:
```json
{
  "evolveUrl": "http://evolve.mech.is",
  "projectId": "mech-your-project-abc123",
  "machineId": "dev-machine-001",
  "preferences": {
    "autoApply": false,
    "minPriority": 5,
    "excludeAgents": [],
    "notifyOnSuggestions": true
  }
}
```

This reference provides complete access to all mech-evolve functionality through both command-line and programmatic interfaces.