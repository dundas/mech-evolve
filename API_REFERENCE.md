# Mech-Evolve API Reference

> **Base URL**: https://evolve.mech.is  
> **Version**: 1.0  
> **Content-Type**: application/json

Complete API documentation for the Mech-Evolve dynamic agent creation service.

## Table of Contents

- [Authentication](#authentication)
- [Health & Status](#health--status)
- [Agent Management](#agent-management)
- [Evolution Tracking](#evolution-tracking)
- [Analytics & Metrics](#analytics--metrics)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

Currently, the mech-evolve service operates without authentication for internal ecosystem use. All endpoints are publicly accessible.

> **Note**: Future versions may include API key authentication for production deployments.

## Health & Status

### GET /health

Check service health and availability.

**Request:**
```bash
curl https://evolve.mech.is/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "mech-evolve",
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "memory": {
    "used": "45.2 MB",
    "free": "2.1 GB"
  }
}
```

### GET /api/docs

Get API documentation and available endpoints.

**Request:**
```bash
curl https://evolve.mech.is/api/docs
```

**Response:**
```json
{
  "service": "mech-evolve",
  "description": "Dynamic Agent Creation Service",
  "version": "1.0.0",
  "endpoints": [
    {
      "path": "/api/agents/analyze-project",
      "method": "POST",
      "description": "Create agents for a project"
    },
    {
      "path": "/api/agents/{applicationId}",
      "method": "GET", 
      "description": "List agents for an application"
    }
  ],
  "agentTypes": [
    "CodeQualityGuardian",
    "TestingChampion", 
    "SecuritySentinel"
  ]
}
```

## Agent Management

### POST /api/agents/analyze-project

Create specialized agents for a project based on codebase analysis.

**Request:**
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

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `applicationId` | string | Yes | Unique identifier for your project |
| `projectPath` | string | Yes | Absolute path to project directory |
| `technologies` | array | No | List of technologies used (react, vue, node, python, etc.) |
| `projectType` | string | No | Type of project (web-application, api, library, etc.) |
| `preferences` | object | No | Project preferences and requirements |

**Success Response (201):**
```json
{
  "success": true,
  "applicationId": "my-react-app",
  "agentsCreated": 3,
  "analysisResults": {
    "linesOfCode": 15420,
    "files": 89,
    "complexity": "moderate",
    "testCoverage": 67,
    "technologies": ["react", "typescript", "jest", "webpack"]
  },
  "agents": [
    {
      "id": "my-react-app_codequalityguardian_1234567890",
      "name": "CodeQualityGuardian",
      "role": "quality-assurance", 
      "tier": 1,
      "priority": "critical",
      "status": "learning",
      "capabilities": ["linting", "formatting", "complexity-analysis"],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "lastActive": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": "my-react-app_testingchampion_1234567891",
      "name": "TestingChampion",
      "role": "testing",
      "tier": 2, 
      "priority": "important",
      "status": "learning",
      "capabilities": ["test-generation", "coverage-analysis", "mocking"],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "lastActive": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

### GET /api/agents/{applicationId}

List all agents created for a specific application.

**Request:**
```bash
curl https://evolve.mech.is/api/agents/my-react-app
```

**Success Response (200):**
```json
{
  "success": true,
  "applicationId": "my-react-app",
  "agentCount": 3,
  "agents": [
    {
      "id": "my-react-app_codequalityguardian_1234567890",
      "name": "CodeQualityGuardian",
      "role": "quality-assurance",
      "tier": 1,
      "priority": "critical", 
      "status": "active",
      "performance": {
        "suggestionsGenerated": 42,
        "suggestionsAccepted": 38,
        "successRate": 0.90
      },
      "lastActive": "2025-01-15T10:25:00.000Z",
      "patterns": 15,
      "capabilities": ["linting", "formatting", "complexity-analysis"]
    }
  ]
}
```

### GET /api/agents/{applicationId}/{agentId}/memory

Get detailed memory and learned patterns for a specific agent.

**Request:**
```bash
curl https://evolve.mech.is/api/agents/my-react-app/my-react-app_codequalityguardian_1234567890/memory
```

**Success Response (200):**
```json
{
  "success": true,
  "agentId": "my-react-app_codequalityguardian_1234567890",
  "memory": {
    "totalPatterns": 15,
    "recentPatterns": [
      {
        "pattern": "functional-component-with-hooks",
        "frequency": 23,
        "confidence": 0.95,
        "lastSeen": "2025-01-15T10:20:00.000Z"
      },
      {
        "pattern": "typescript-interface-definition", 
        "frequency": 18,
        "confidence": 0.88,
        "lastSeen": "2025-01-15T10:15:00.000Z"
      }
    ],
    "learningData": {
      "codeStylePreferences": {
        "indentation": "2-spaces",
        "quotes": "single",
        "semicolons": true
      },
      "commonIssues": [
        "missing-prop-types",
        "unused-imports",
        "complex-functions"
      ]
    },
    "performance": {
      "accuracy": 0.90,
      "responseTime": "45ms",
      "memoryUsage": "12MB"
    }
  }
}
```

### POST /api/agents/{applicationId}/sync-to-files

Sync agent information to local Claude Code files for integration.

**Request:**
```bash
curl -X POST https://evolve.mech.is/api/agents/my-react-app/sync-to-files \
  -H "Content-Type: application/json" \
  -d '{
    "claudeDirectory": "/Users/dev/my-react-app/.claude"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "filesSynced": 3,
  "files": [
    ".claude/agents/codequalityguardian.md",
    ".claude/agents/testingchampion.md", 
    ".claude/agent-context/agents-summary.json"
  ],
  "lastSync": "2025-01-15T10:30:00.000Z"
}
```

### GET /api/agents/{applicationId}/claude-context

Generate Claude Code context markdown for agents.

**Request:**
```bash
curl https://evolve.mech.is/api/agents/my-react-app/claude-context
```

**Success Response (200):**
```json
{
  "success": true,
  "context": "# Active AI Agents for This Project\n\nYou have 3 specialized AI agents monitoring and improving this codebase:\n\n## CodeQualityGuardian (quality-assurance)\n**Purpose**: Maintains code quality standards and catches issues\n**Performance**: 42 suggestions generated\n**Capabilities**: linting, formatting, complexity-analysis\n**Priority**: critical (Tier 1)\n\n...",
  "agentCount": 3,
  "lastUpdated": "2025-01-15T10:30:00.000Z"
}
```

## Evolution Tracking

### POST /api/evolution/track

Track code changes and trigger agent analysis.

**Request:**
```bash
curl -X POST https://evolve.mech.is/api/evolution/track \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-react-app",
    "changeType": "function-add",
    "filePath": "/src/components/Button.tsx",
    "description": "Added new Button component with accessibility features",
    "context": {
      "tool": "Edit",
      "framework": "react", 
      "language": "typescript",
      "linesAdded": 25,
      "linesRemoved": 0
    }
  }'
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | Project identifier |
| `changeType` | string | Yes | Type of change (function-add, file-create, refactor, etc.) |
| `filePath` | string | Yes | Path to the changed file |
| `description` | string | Yes | Human-readable description of the change |
| `context` | object | No | Additional context about the change |

**Success Response (200):**
```json
{
  "success": true,
  "evolutionId": "evolution-abc123",
  "agentResponses": 2,
  "suggestions": [
    {
      "type": "test-generation",
      "description": "Generate comprehensive tests for Button component",
      "priority": 1,
      "effort": "medium",
      "impact": "high",
      "agentId": "my-react-app_testingchampion_1234567891"
    },
    {
      "type": "accessibility",
      "description": "Validate ARIA attributes and keyboard navigation", 
      "priority": 1,
      "effort": "low",
      "impact": "high",
      "agentId": "my-react-app_accessibilityadvocate_1234567892"
    }
  ],
  "message": "Change analyzed by 2 dynamic agents",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### GET /api/evolution/suggest/{projectId}

Get agent suggestions for a project.

**Request:**
```bash
curl https://evolve.mech.is/api/evolution/suggest/my-react-app?limit=10
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Maximum number of suggestions to return |
| `priority` | number | null | Filter by priority level (1-3) |
| `type` | string | null | Filter by suggestion type |

**Success Response (200):**
```json
{
  "success": true,
  "projectId": "my-react-app",
  "suggestions": [
    {
      "id": "suggestion-xyz789",
      "type": "performance",
      "description": "Optimize component re-renders with React.memo",
      "priority": 2,
      "effort": "low",
      "impact": "medium",
      "filePath": "/src/components/UserList.tsx",
      "agentId": "my-react-app_performanceoptimizer_1234567893",
      "createdAt": "2025-01-15T10:25:00.000Z"
    }
  ],
  "total": 15,
  "hasMore": true
}
```

### POST /api/evolution/apply

Apply a suggestion and provide feedback to agents.

**Request:**
```bash
curl -X POST https://evolve.mech.is/api/evolution/apply \
  -H "Content-Type: application/json" \
  -d '{
    "suggestionId": "suggestion-xyz789",
    "projectId": "my-react-app",
    "applied": true,
    "feedback": {
      "rating": 5,
      "comment": "Great suggestion, improved performance significantly",
      "timeToImplement": 15
    }
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "suggestionId": "suggestion-xyz789", 
  "agentLearning": {
    "agentId": "my-react-app_performanceoptimizer_1234567893",
    "learningUpdated": true,
    "confidenceAdjustment": +0.05
  },
  "message": "Feedback applied and agent learning updated"
}
```

## Analytics & Metrics

### GET /api/analytics/metrics/{projectId}

Get comprehensive analytics and metrics for a project.

**Request:**
```bash
curl https://evolve.mech.is/api/analytics/metrics/my-react-app
```

**Success Response (200):**
```json
{
  "success": true,
  "projectId": "my-react-app",
  "timeRange": "30d",
  "summary": {
    "totalAgents": 3,
    "activeAgents": 3,
    "totalSuggestions": 127,
    "acceptedSuggestions": 98,
    "overallSuccessRate": 0.77
  },
  "agentBreakdown": [
    {
      "agentId": "my-react-app_codequalityguardian_1234567890",
      "name": "CodeQualityGuardian",
      "suggestions": 65,
      "accepted": 58,
      "successRate": 0.89,
      "avgResponseTime": "42ms"
    }
  ],
  "suggestionTypes": {
    "linting": 45,
    "testing": 32,
    "performance": 28,
    "security": 12,
    "accessibility": 10
  },
  "trends": {
    "daily": [
      {"date": "2025-01-14", "suggestions": 8, "accepted": 6},
      {"date": "2025-01-15", "suggestions": 12, "accepted": 9}
    ]
  }
}
```

### GET /api/evolution/history/{projectId}

Get evolution history and learning progress for a project.

**Request:**
```bash
curl https://evolve.mech.is/api/evolution/history/my-react-app?days=7
```

**Success Response (200):**
```json
{
  "success": true,
  "projectId": "my-react-app", 
  "timeRange": "7d",
  "events": [
    {
      "evolutionId": "evolution-abc123",
      "timestamp": "2025-01-15T10:30:00.000Z",
      "changeType": "function-add",
      "filePath": "/src/components/Button.tsx",
      "agentsTriggered": 2,
      "suggestionsGenerated": 3,
      "impact": "medium"
    }
  ],
  "learningProgress": {
    "patternsLearned": 47,
    "accuracyImprovement": 0.23,
    "responseTimeImprovement": "15%"
  },
  "total": 156,
  "hasMore": true
}
```

## Error Handling

All endpoints return consistent error responses with appropriate HTTP status codes.

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "applicationId is required",
    "details": {
      "field": "applicationId",
      "received": null,
      "expected": "string"
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Common Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid request parameters |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

### Example Error Responses

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid project type. Must be one of: web-application, api, library, mobile-app",
    "details": {
      "field": "projectType",
      "received": "invalid-type",
      "validOptions": ["web-application", "api", "library", "mobile-app"]
    }
  }
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND", 
    "message": "No agents found for application 'non-existent-app'",
    "details": {
      "applicationId": "non-existent-app"
    }
  }
}
```

**Rate Limited (429):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Limit: 100 requests per minute",
    "details": {
      "limit": 100,
      "window": "1m",
      "retryAfter": 30
    }
  }
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage and system stability.

### Default Limits

- **Global**: 100 requests per minute per IP
- **Agent Creation**: 5 requests per minute per IP  
- **Evolution Tracking**: 200 requests per minute per IP

### Rate Limit Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642248000
X-RateLimit-Window: 60
```

### Rate Limit Response

When rate limited, the API returns a 429 status with retry information:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "retryAfter": 30
  }
}
```

## Examples

### Complete Workflow Example

```bash
# 1. Check service health
curl https://evolve.mech.is/health

# 2. Create agents for your React project
curl -X POST https://evolve.mech.is/api/agents/analyze-project \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "my-react-dashboard",
    "projectPath": "/Users/dev/dashboard", 
    "technologies": ["react", "typescript", "tailwindcss"],
    "projectType": "web-application"
  }'

# 3. List created agents
curl https://evolve.mech.is/api/agents/my-react-dashboard

# 4. Track a code change
curl -X POST https://evolve.mech.is/api/evolution/track \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-react-dashboard",
    "changeType": "component-add",
    "filePath": "/src/components/Dashboard.tsx",
    "description": "Added main dashboard component"
  }'

# 5. Get suggestions from agents  
curl https://evolve.mech.is/api/evolution/suggest/my-react-dashboard

# 6. View analytics
curl https://evolve.mech.is/api/analytics/metrics/my-react-dashboard
```

### JavaScript SDK Example

```javascript
// Simple JavaScript wrapper for the API
class MechEvolveAPI {
  constructor(baseUrl = 'https://evolve.mech.is') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }
    
    return data;
  }

  // Create agents for a project
  async createAgents(config) {
    return this.request('/api/agents/analyze-project', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  // Get agents for a project  
  async getAgents(applicationId) {
    return this.request(`/api/agents/${applicationId}`);
  }

  // Track a code change
  async trackChange(change) {
    return this.request('/api/evolution/track', {
      method: 'POST', 
      body: JSON.stringify(change)
    });
  }

  // Get suggestions
  async getSuggestions(projectId, options = {}) {
    const params = new URLSearchParams(options);
    return this.request(`/api/evolution/suggest/${projectId}?${params}`);
  }
}

// Usage
const api = new MechEvolveAPI();

try {
  const result = await api.createAgents({
    applicationId: 'my-app',
    projectPath: '/path/to/project',
    technologies: ['react', 'typescript']
  });
  
  console.log(`Created ${result.agentsCreated} agents`);
} catch (error) {
  console.error('Failed to create agents:', error.message);
}
```

---

For more examples and integration guides, see the [main documentation](./README.md) and [developer guide](./DEVELOPER_GUIDE.md).