# Mech-Evolve Inspection Guide

## Complete Guide to Inspecting System Learnings & Improvements

This guide shows you exactly where to look to understand what the mech-evolve system has learned about your code, what improvements it's suggesting, and how well the agents are performing.

## 🎯 Quick Inspection Commands

### Essential CLI Commands

```bash
# System status and overview
./mech-evolve status
# Shows: Evolution status, app ID, agent activity

./mech-evolve learnings  
# Shows: Detected patterns, recent improvements, learning summary

./mech-evolve suggestions
# Shows: Pending improvement suggestions ranked by priority

./mech-evolve history
# Shows: Recent evolution events and applied improvements
```

### Detailed Inspection Commands

```bash
# Agent-specific inspection
./mech-evolve agent-memory architect    # Architectural insights
./mech-evolve agent-memory builder      # Implementation patterns  
./mech-evolve agent-memory validator    # Quality & security findings
./mech-evolve agent-memory scribe       # Documentation insights

# Pattern analysis
./mech-evolve patterns                  # Code patterns detected
./mech-evolve collaboration            # Agent communication logs
./mech-evolve performance              # System performance metrics
```

## 📊 What Each Command Shows

### `./mech-evolve status`
```
🟢 Evolution ACTIVE
📋 App ID: mech-your-project-abc123
🏗️  Architect Agent: ACTIVE (last analysis: 2m ago)
🔨 Builder Agent: IDLE (ready)
✅ Validator Agent: PROCESSING (analyzing security)
📚 Scribe Agent: ACTIVE (updating docs)
📈 Changes tracked: 47 | Suggestions applied: 23
```

### `./mech-evolve learnings`
```
🧠 Project Learnings for mech-your-project-abc123

Patterns Detected:
✅ TypeScript strict mode usage (95% confidence)
✅ Express.js REST API structure (87% confidence) 
✅ Jest testing framework (92% confidence)
✅ Repository pattern implementation (78% confidence)

Code Quality Insights:
🔒 Security: 3 vulnerabilities fixed, 1 pending
🚀 Performance: 5 queries optimized, 2 indexes added
🧪 Testing: 12 test cases added, coverage improved 15%
📚 Documentation: 8 functions documented, API spec updated

Recent Learning Trends:
↗️  Function naming consistency improved 
↗️  Error handling patterns strengthened
↗️  API documentation completeness increased
```

### `./mech-evolve suggestions`
```
📝 Pending Suggestions (4):

[Priority 10] 🔒 Fix SQL injection vulnerability
  File: /api/search.ts:42
  Agent: Validator
  Effort: Low | Impact: Critical
  
[Priority 8] 🚀 Add database index for user queries  
  File: Database migration needed
  Agent: Builder
  Effort: Low | Impact: High
  
[Priority 6] 🏗️  Extract authentication logic to service
  Files: /middleware/auth.ts, /services/
  Agent: Architect  
  Effort: Medium | Impact: Medium
  
[Priority 4] 📚 Add JSDoc to utility functions
  File: /utils/helpers.ts
  Agent: Scribe
  Effort: Low | Impact: Low

💡 Tip: Apply high-priority suggestions first for maximum impact
```

### `./mech-evolve agent-memory architect`
```
🏗️  Architect Agent Memory

Project Architecture Analysis:
• Pattern: Layered Architecture (92% confidence)
• Style: Express.js REST API with MongoDB
• Compliance: SOLID principles (78% adherence)
• Evolution: Monolith → Services extraction opportunity

Architectural Insights:
• Service layer needs better separation
• Database access should use Repository pattern  
• Cross-cutting concerns need middleware extraction
• API versioning strategy should be implemented

Recent Recommendations (Applied/Total):
• Service extraction: 3/5 applied
• Middleware creation: 2/3 applied  
• Pattern implementation: 4/6 applied
• Architecture improvements: 1/2 applied

Learning Confidence: 87% (High)
```

## 🔍 File-Based Inspection

### Local Project Files

```bash
# Core configuration and state
.claude/project.json              # Application ID and metadata
.claude/settings.json            # Evolution configuration
.claude/evolution-log.json       # Complete change history

# Agent-specific data
.claude/agent-memories/
  ├── architect-memory.json      # Architectural patterns & insights
  ├── builder-memory.json        # Implementation patterns & optimizations
  ├── validator-memory.json      # Quality & security findings
  └── scribe-memory.json         # Documentation patterns & gaps

# Pattern and learning data
.claude/patterns/
  ├── code-patterns.json         # Detected code patterns
  ├── naming-conventions.json    # Project naming patterns
  └── architectural-patterns.json # System design patterns

# Suggestion cache
.claude/suggestions/
  ├── pending-suggestions.json   # Current improvement suggestions
  ├── applied-suggestions.json   # Successfully applied improvements
  └── rejected-suggestions.json  # Declined suggestions with reasons
```

### Example: Architect Memory File
```json
{
  "projectId": "mech-your-project-abc123",
  "agent": "architect", 
  "lastUpdated": "2025-08-20T10:30:45Z",
  "architectural_analysis": {
    "current_pattern": "layered-architecture",
    "confidence": 0.92,
    "components": {
      "presentation": "/api/routes/",
      "business": "/services/",
      "data": "/models/",
      "infrastructure": "/config/"
    }
  },
  "design_principles": {
    "solid": {
      "single_responsibility": 0.78,
      "open_closed": 0.82,
      "liskov_substitution": 0.91,
      "interface_segregation": 0.76,
      "dependency_inversion": 0.69
    }
  },
  "improvement_patterns": [
    {
      "pattern": "service_extraction",
      "trigger": "controller_complexity > threshold",
      "success_rate": 0.89,
      "applications": 5
    }
  ],
  "recommendations": [
    {
      "type": "architectural",
      "priority": 7,
      "title": "Implement Dependency Injection",
      "rationale": "Improves testability and reduces coupling",
      "effort": "medium",
      "impact": "high"
    }
  ]
}
```

### Example: Patterns File
```json
{
  "projectId": "mech-your-project-abc123",
  "detected_patterns": {
    "naming_conventions": {
      "files": "kebab-case",
      "functions": "camelCase",
      "constants": "UPPER_SNAKE_CASE",
      "classes": "PascalCase",
      "confidence": 0.95
    },
    "error_handling": {
      "style": "try-catch-throw",
      "custom_errors": true,
      "error_middleware": true,
      "confidence": 0.88
    },
    "testing": {
      "framework": "jest",
      "style": "describe-it",
      "coverage_target": 80,
      "confidence": 0.92
    },
    "api_design": {
      "style": "REST",
      "versioning": "none",
      "auth": "JWT",
      "validation": "joi",
      "confidence": 0.86
    }
  },
  "anti_patterns": [
    {
      "pattern": "god_objects",
      "locations": ["/controllers/UserController.ts"],
      "severity": "medium"
    },
    {
      "pattern": "circular_dependencies", 
      "locations": ["/services/", "/models/"],
      "severity": "low"
    }
  ]
}
```

## 🌐 API-Based Inspection

### Core Evolution Data
```bash
# Get evolution history
curl http://evolve.mech.is/api/evolution/history/mech-your-project-abc123

# Get current suggestions
curl http://evolve.mech.is/api/evolution/suggest/mech-your-project-abc123

# Get project patterns
curl http://evolve.mech.is/api/evolution/patterns/mech-your-project-abc123

# Get analytics
curl http://evolve.mech.is/api/analytics/metrics/mech-your-project-abc123
```

### Agent-Specific Data
```bash
# Agent status and memory
curl http://evolve.mech.is/api/agents/status
curl http://evolve.mech.is/api/agents/architect/memory?projectId=mech-your-project-abc123
curl http://evolve.mech.is/api/agents/builder/suggestions?projectId=mech-your-project-abc123

# Agent communications
curl http://evolve.mech.is/api/communications/mech-your-project-abc123

# Performance metrics
curl http://evolve.mech.is/api/agents/performance/metrics
```

### Example API Response: Evolution History
```json
{
  "success": true,
  "projectId": "mech-your-project-abc123",
  "count": 20,
  "evolutions": [
    {
      "id": "evo-001",
      "timestamp": "2025-08-20T10:30:45Z",
      "toolName": "Edit",
      "filePath": "/api/users.ts",
      "changeType": "function-add",
      "improvements": [
        {
          "type": "security",
          "description": "Added input validation",
          "agent": "validator",
          "applied": true
        }
      ],
      "metadata": {
        "linesAdded": 15,
        "complexity": "medium",
        "testCoverage": 85
      }
    }
  ]
}
```

## 📊 Database-Level Inspection (Advanced)

For deep system inspection, you can query MongoDB collections directly:

### Core Collections

```javascript
// Evolution tracking
db.evolutions.find({
  applicationId: "mech-your-project-abc123"
}).sort({timestamp: -1}).limit(10);

// Agent memories
db.agent_memories.find({
  projectId: "mech-your-project-abc123",
  agent: "architect"
});

// Suggestions and applications
db.suggestions.find({
  projectId: "mech-your-project-abc123",
  status: "pending"
}).sort({priority: -1});

// Pattern learning data
db.project_patterns.find({
  projectId: "mech-your-project-abc123"
});

// Inter-agent communications
db.agent_communications.find({
  projectId: "mech-your-project-abc123"
}).sort({timestamp: -1}).limit(20);
```

### Useful Queries

```javascript
// Find most successful suggestion types
db.suggestions.aggregate([
  { $match: { projectId: "mech-your-project-abc123", status: "applied" } },
  { $group: { _id: "$type", count: { $sum: 1 }, avgPriority: { $avg: "$priority" } } },
  { $sort: { count: -1 } }
]);

// Agent performance comparison
db.agent_communications.aggregate([
  { $match: { projectId: "mech-your-project-abc123" } },
  { $group: { _id: "$from", messageCount: { $sum: 1 }, avgResponseTime: { $avg: "$responseTime" } } }
]);

// Pattern confidence trends
db.project_patterns.find({
  projectId: "mech-your-project-abc123"
}).sort({"lastUpdated": -1});
```

## 📈 Performance Monitoring

### System Health Commands
```bash
# Overall system performance  
./mech-evolve performance
# Shows: Response times, success rates, memory usage

# Agent-specific performance
./mech-evolve agent-performance architect
./mech-evolve agent-performance builder
./mech-evolve agent-performance validator  
./mech-evolve agent-performance scribe
```

### Example Performance Output
```
📊 System Performance Metrics

Response Times:
🏗️  Architect: avg 2.3s (healthy)
🔨 Builder: avg 1.8s (excellent)  
✅ Validator: avg 3.1s (healthy)
📚 Scribe: avg 2.7s (healthy)

Success Rates:
• Suggestion acceptance: 82% (↑5% vs last week)
• Implementation success: 94% (stable)
• Agent collaboration: 91% (↑3% vs last week)

Memory Usage:
• Architect agent: 45MB (normal)
• Builder agent: 38MB (normal)
• Validator agent: 52MB (normal) 
• Scribe agent: 33MB (normal)

Database Performance:
• Query response time: avg 120ms
• Collection sizes: evolutions(1.2K), suggestions(340), patterns(89)
• Index efficiency: 96% (excellent)
```

## 🔧 Troubleshooting Inspection

### Common Inspection Issues

#### No Suggestions Appearing
```bash
# Check if evolution is active
./mech-evolve status

# Verify hook is working  
ls -la .claude/hooks/evolve-hook.cjs

# Check recent evolution events
./mech-evolve history | head -10

# Test connectivity to evolution service
curl -I http://evolve.mech.is/health
```

#### Agents Not Learning
```bash
# Check agent memory files exist
ls -la .claude/agent-memories/

# Verify agent activity
./mech-evolve agents

# Check for errors in agent communications
./mech-evolve collaboration | grep -i error
```

#### Outdated Patterns
```bash
# Check pattern confidence levels
./mech-evolve patterns | grep confidence

# Force pattern refresh (if available)
./mech-evolve refresh-patterns

# Check recent learning updates
./mech-evolve learnings | grep "Last updated"
```

## 📋 Inspection Checklist

### Daily Development Inspection
- [ ] Check system status: `./mech-evolve status`
- [ ] Review pending suggestions: `./mech-evolve suggestions`
- [ ] Monitor agent activity: `./mech-evolve agents`

### Weekly Deep Inspection  
- [ ] Review learning progress: `./mech-evolve learnings`
- [ ] Check pattern evolution: `./mech-evolve patterns`
- [ ] Analyze agent performance: `./mech-evolve agent-performance`
- [ ] Review evolution history: `./mech-evolve history`

### Monthly System Review
- [ ] Inspect agent memories: `./mech-evolve agent-memory <agent>`
- [ ] Analyze collaboration patterns: `./mech-evolve collaboration`
- [ ] Review database collections (if accessible)
- [ ] Check system performance trends: `./mech-evolve performance`

## 💡 Pro Tips for Effective Inspection

1. **Start with Status**: Always check `./mech-evolve status` first
2. **Focus on High Priority**: Review suggestions by priority, not chronologically
3. **Monitor Trends**: Look for patterns in agent learning and suggestion acceptance
4. **Check Agent Balance**: Ensure all four agents are contributing suggestions
5. **Validate Learning**: Confirm detected patterns match your actual code style
6. **Track Success**: Monitor which types of suggestions you accept most often

The inspection system provides complete transparency into how the mech-evolve system understands and improves your code. Use these tools regularly to understand the system's learning progress and optimize your development workflow.