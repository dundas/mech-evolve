# Mech-Evolve Improvement Flow Guide

## How Code Actually Improves: A Step-by-Step Process

This guide explains exactly how the mech-evolve system learns from your code changes and applies improvements. Every edit, write, or bash command triggers an intelligent improvement pipeline.

## The Complete Flow

### 1. Change Detection (Automatic)

When you use Claude Code tools, the system automatically captures:

```javascript
// What gets tracked:
{
  "toolName": "Edit|Write|MultiEdit|Bash",
  "applicationId": "mech-your-project-abc123",
  "filePath": "/path/to/changed/file.ts",
  "timestamp": "2025-08-20T10:30:45Z",
  "changeType": "function-add|refactor|bug-fix|feature",
  "context": {
    "projectScope": "isolated",
    "fileType": "typescript",
    "complexity": "medium"
  }
}
```

**Where this happens**: `.claude/hooks/evolve-hook.cjs` runs after every tool use

### 2. Intelligent Analysis (Multi-Agent)

The system routes changes to specialized agents:

#### Architect Agent Analyzes:
- Project structure patterns
- Architecture violations
- Design principle adherence
- Technology stack optimization

```javascript
// Example Architect analysis:
{
  "findings": [
    "Detected MVC pattern violation in /api/routes/",
    "Missing dependency injection in service layer",
    "Opportunity for microservice extraction in /utils/"
  ],
  "recommendations": [
    {
      "type": "architectural",
      "priority": 8,
      "description": "Extract authentication logic into dedicated service",
      "impact": "Improves testability and separation of concerns"
    }
  ]
}
```

#### Builder Agent Analyzes:
- Code quality improvements
- Performance optimizations  
- Implementation patterns
- Refactoring opportunities

```javascript
// Example Builder analysis:
{
  "findings": [
    "Repeated async/await patterns in API handlers",
    "Missing error handling in database operations",
    "Inefficient data processing in /utils/parser.ts"
  ],
  "recommendations": [
    {
      "type": "implementation",
      "priority": 6,
      "description": "Create async wrapper utility for consistent error handling",
      "impact": "Reduces code duplication and improves reliability"
    }
  ]
}
```

#### Validator Agent Analyzes:
- Testing coverage gaps
- Security vulnerabilities
- Edge case handling
- Quality metrics

```javascript
// Example Validator analysis:
{
  "findings": [
    "No tests for new authentication function",
    "Potential SQL injection in search query",
    "Missing input validation in API endpoints"
  ],
  "recommendations": [
    {
      "type": "testing",
      "priority": 9,
      "description": "Generate unit tests for authentication.ts",
      "impact": "Critical for security and reliability"
    }
  ]
}
```

#### Scribe Agent Analyzes:
- Documentation completeness
- Code readability
- API documentation
- Example availability

```javascript
// Example Scribe analysis:
{
  "findings": [
    "Complex function missing JSDoc comments",
    "API endpoint not documented in OpenAPI spec",
    "No usage examples for new utility functions"
  ],
  "recommendations": [
    {
      "type": "documentation",
      "priority": 4,
      "description": "Add comprehensive JSDoc to parseUserInput function",
      "impact": "Improves maintainability and developer experience"
    }
  ]
}
```

### 3. Pattern Recognition (Learning)

The system identifies recurring patterns in your project:

```javascript
// Project-specific patterns learned:
{
  "projectId": "mech-your-project-abc123",
  "patterns": {
    "naming_conventions": {
      "files": "kebab-case",
      "functions": "camelCase", 
      "constants": "UPPER_SNAKE_CASE",
      "confidence": 0.95
    },
    "architecture": {
      "style": "layered-architecture",
      "patterns": ["repository", "service", "controller"],
      "confidence": 0.87
    },
    "testing": {
      "framework": "jest",
      "structure": "describe-it",
      "mocking": "jest.fn()",
      "confidence": 0.92
    }
  }
}
```

### 4. Suggestion Generation (Intelligent)

Agents collaborate to generate ranked improvement suggestions:

```javascript
// Combined agent suggestions:
{
  "projectId": "mech-your-project-abc123",
  "suggestions": [
    {
      "id": "suggest-001",
      "type": "security",
      "priority": 10,
      "agent": "validator",
      "title": "Fix SQL injection vulnerability",
      "description": "Replace string concatenation with parameterized queries",
      "filePath": "/api/search.ts",
      "implementation": {
        "command": "Edit",
        "changes": [
          {
            "old": "query = `SELECT * FROM users WHERE name = '${input}'`",
            "new": "query = 'SELECT * FROM users WHERE name = ?'\nparams = [input]"
          }
        ]
      },
      "rationale": "Critical security vulnerability - SQL injection possible",
      "effort": "low",
      "impact": "critical"
    },
    {
      "id": "suggest-002", 
      "type": "performance",
      "priority": 7,
      "agent": "builder",
      "title": "Optimize database query",
      "description": "Add index for frequently queried field",
      "implementation": {
        "command": "Bash",
        "script": "npm run db:migrate -- add-index users name"
      },
      "rationale": "Query performance degraded with dataset growth",
      "effort": "medium",
      "impact": "high"
    }
  ]
}
```

### 5. User Interaction (CLI/API)

You can inspect and control the improvement process:

```bash
# See what the system has learned about your project
./mech-evolve learnings
# Output:
# 🧠 Project Learnings for mech-your-project-abc123
# 
# Patterns Detected:
# ✅ TypeScript strict mode usage (95% confidence)
# ✅ Express.js REST API structure (87% confidence)
# ✅ Jest testing framework (92% confidence)
# 
# Recent Improvements:
# 🔒 Security: Fixed 3 vulnerabilities
# 🚀 Performance: Optimized 5 database queries
# 🧪 Testing: Added 12 test cases
# 📚 Documentation: Updated 8 API endpoints

# View pending suggestions
./mech-evolve suggestions
# Output:
# 📝 Pending Suggestions (3):
# 
# [Priority 10] 🔒 Fix SQL injection vulnerability
#   File: /api/search.ts
#   Agent: Validator
#   Effort: Low | Impact: Critical
#   
# [Priority 7] 🚀 Optimize database query  
#   File: /api/users.ts
#   Agent: Builder
#   Effort: Medium | Impact: High
#   
# [Priority 4] 📚 Add JSDoc comments
#   File: /utils/parser.ts
#   Agent: Scribe
#   Effort: Low | Impact: Medium

# Apply a specific suggestion
curl -X POST http://evolve.mech.is/api/evolution/apply \\
  -H "Content-Type: application/json" \\
  -d '{
    "suggestionId": "suggest-001",
    "projectId": "mech-your-project-abc123",
    "machineId": "dev-machine-001"
  }'
```

### 6. Application & Learning (Continuous)

When suggestions are applied, the system learns from outcomes:

```javascript
// Application tracking:
{
  "applicationId": "app-001",
  "suggestionId": "suggest-001",
  "result": {
    "success": true,
    "changes": [
      {
        "file": "/api/search.ts",
        "linesChanged": 3,
        "type": "security-fix"
      }
    ],
    "metrics": {
      "securityScore": 8.5, // improved from 6.2
      "performance": "unchanged",
      "testCoverage": "unchanged"
    }
  },
  "feedback": {
    "agentLearning": "SQL injection pattern recognition improved",
    "patternStrength": 0.97, // increased confidence
    "similarSuggestions": 2 // found 2 similar issues
  }
}
```

## Where to Inspect Learnings

### 1. CLI Commands (Local)

```bash
# Project status and activity
./mech-evolve status
./mech-evolve learnings
./mech-evolve history
./mech-evolve suggestions

# Agent-specific inspection  
./mech-evolve agent-memory architect
./mech-evolve agent-memory builder
./mech-evolve agent-memory validator
./mech-evolve agent-memory scribe

# Pattern analysis
./mech-evolve patterns
./mech-evolve performance
```

### 2. API Endpoints (Programmatic)

```bash
# Project evolution data
curl http://evolve.mech.is/api/evolution/history/mech-your-project-abc123
curl http://evolve.mech.is/api/evolution/patterns/mech-your-project-abc123
curl http://evolve.mech.is/api/analytics/metrics/mech-your-project-abc123

# Agent-specific data
curl http://evolve.mech.is/api/agents/architect/memory?projectId=mech-your-project-abc123
curl http://evolve.mech.is/api/agents/status
curl http://evolve.mech.is/api/communications/mech-your-project-abc123
```

### 3. Local Files (Direct Inspection)

```bash
# Project-specific data
.claude/project.json              # Application ID and metadata
.claude/agent-memories/           # Agent-specific learning data
.claude/patterns/                 # Detected code patterns
.claude/suggestions/              # Generated suggestions cache
.claude/evolution-log.json        # Change tracking history

# Example agent memory file:
cat .claude/agent-memories/architect-memory.json
{
  "projectId": "mech-your-project-abc123",
  "agent": "architect",
  "patterns": {
    "architectural_style": "microservices",
    "data_layer": "mongodb-mongoose",
    "api_style": "rest",
    "auth_pattern": "jwt"
  },
  "recommendations": [
    {
      "pattern": "service-extraction",
      "confidence": 0.89,
      "applied": 3,
      "success_rate": 1.0
    }
  ],
  "lastUpdated": "2025-08-20T10:30:45Z"
}
```

### 4. Database Collections (MongoDB)

For advanced inspection, you can query the MongoDB collections directly:

```javascript
// Evolution tracking
db.evolutions.find({applicationId: "mech-your-project-abc123"})

// Agent memories and learning
db.agent_memories.find({projectId: "mech-your-project-abc123"})

// Generated suggestions
db.suggestions.find({projectId: "mech-your-project-abc123", status: "pending"})

// Inter-agent communications
db.agent_communications.find({projectId: "mech-your-project-abc123"})

// Detected patterns
db.project_patterns.find({projectId: "mech-your-project-abc123"})
```

## Real Example: Complete Flow

Let's trace a real improvement from code change to application:

### Step 1: You Make a Change
```bash
# You use Claude Code to add a new API endpoint
# This triggers the evolve hook automatically
```

### Step 2: System Captures Change
```javascript
{
  "toolName": "Edit",
  "file": "/api/users.ts", 
  "changeType": "function-add",
  "newFunction": "async getUserProfile(id: string)"
}
```

### Step 3: Agents Analyze
- **Architect**: "New endpoint follows RESTful patterns ✅"
- **Builder**: "Missing error handling for invalid IDs ⚠️"  
- **Validator**: "No input validation or tests ❌"
- **Scribe**: "Missing API documentation ⚠️"

### Step 4: Suggestions Generated
```bash
./mech-evolve suggestions
# [Priority 9] Add input validation for user ID parameter
# [Priority 8] Create unit tests for getUserProfile function  
# [Priority 5] Update OpenAPI spec with new endpoint
```

### Step 5: You Apply Suggestions
```bash
# System applies improvements automatically or with your approval
# Code quality improves incrementally with each change
```

### Step 6: System Learns
```javascript
{
  "learning": "User accepts validation suggestions 95% of the time",
  "pattern": "Always suggest input validation for new API endpoints",
  "confidence": 0.98
}
```

## Benefits You'll See

1. **Immediate**: Suggestions appear within seconds of making changes
2. **Contextual**: Improvements are specific to your project patterns
3. **Learning**: System gets smarter with each interaction
4. **Comprehensive**: Covers architecture, implementation, testing, and documentation
5. **Transparent**: Full visibility into what's happening and why

The mech-evolve system transforms every code change into a learning opportunity, continuously improving both your code quality and the system's understanding of your project patterns.