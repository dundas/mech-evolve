import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';
import { createLogger } from 'winston';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { CodebaseAnalyzer } from './services/codebase-analyzer';
import { AgentFactory, ChangeEvent } from './services/agent-factory';

dotenv.config();

// Type definitions for Agent
interface Agent {
  id: string;
  name: string;
  role: string;
  purpose?: string;
  tier: number;
  priority: string;
  status: string;
  performance: {
    suggestionsGenerated: number;
    suggestionsAccepted: number;
    successRate: number;
  };
  memory?: {
    patterns?: Array<{
      pattern: string;
      frequency: number;
      confidence: number;
    }>;
    recentContext?: any[];
    context?: Record<string, any>;
  };
  specification?: {
    analysisLogic?: string;
    improvementStrategies?: string[];
    learningMechanisms?: string[];
  };
  lastActive: string | Date;
  capabilities: string[];
}

const app = express();
const PORT = process.env.PORT || 3011;
const SERVICE_NAME = 'mech-evolve';

// Logger setup
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: SERVICE_NAME }
});

// MongoDB setup
let db: Db;
const mongoClient = new MongoClient(process.env.MONGODB_URI!);

// Service instances
let codebaseAnalyzer: CodebaseAnalyzer;
let agentFactory: AgentFactory;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});
app.use('/api', limiter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

// Installer Script Endpoint
app.get('/start', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`#!/usr/bin/env bash

# Mech Evolve Universal Installer
# Usage: curl -sSL https://evolve.mech.is/start | bash

set -e

EVOLVE_URL="http://evolve.mech.is" 

# Colors for pretty output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
PURPLE='\\033[0;35m'
CYAN='\\033[0;36m'
NC='\\033[0m'

print_header() {
    echo -e "\${PURPLE}"
    echo "  ███╗   ███╗███████╗ ██████╗██╗  ██╗"
    echo "  ████╗ ████║██╔════╝██╔════╝██║  ██║"
    echo "  ██╔████╔██║█████╗  ██║     ███████║"
    echo "  ██║╚██╔╝██║██╔══╝  ██║     ██╔══██║"
    echo "  ██║ ╚═╝ ██║███████╗╚██████╗██║  ██║"
    echo "  ╚═╝     ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝"
    echo -e "\${CYAN}  ███████╗██╗   ██╗ ██████╗ ██╗    ██╗   ██╗███████╗"
    echo "  ██╔════╝██║   ██║██╔═══██╗██║    ██║   ██║██╔════╝"
    echo "  █████╗  ██║   ██║██║   ██║██║    ██║   ██║█████╗  "
    echo "  ██╔══╝  ╚██╗ ██╔╝██║   ██║██║    ╚██╗ ██╔╝██╔══╝  "
    echo "  ███████╗ ╚████╔╝ ╚██████╔╝███████╗╚████╔╝ ███████╗"
    echo "  ╚══════╝  ╚═══╝   ╚═════╝ ╚══════╝ ╚═══╝  ╚══════╝"
    echo -e "\${NC}"
    echo -e "\${BLUE}  Zero-Setup Code Evolution\${NC}"
    echo ""
}

log() { echo -e "\${GREEN}✅\${NC} \$1"; }
warn() { echo -e "\${YELLOW}⚠️\${NC} \$1"; }
error() { echo -e "\${RED}❌\${NC} \$1"; }
info() { echo -e "\${BLUE}ℹ️\${NC} \$1"; }
step() { echo -e "\${CYAN}🔄\${NC} \$1"; }

print_header

PROJECT_DIR="\${PWD}"
PROJECT_NAME=\$(basename "\$PROJECT_DIR")
CLAUDE_DIR="\${PROJECT_DIR}/.claude"

info "Installing Mech Evolve in: \${PROJECT_NAME}"
echo ""

step "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    error "Node.js required. Install: https://nodejs.org"
    exit 1
fi
log "Node.js detected"

if ! command -v curl &> /dev/null; then
    error "curl required"
    exit 1
fi
log "curl detected"

step "Setting up project structure..."
mkdir -p "\$CLAUDE_DIR/hooks"
log "Created .claude directory"

step "Installing Mech Evolve CLI..."
cat > "./mech-evolve" << 'EOFCLI'
#!/usr/bin/env node
const fs = require('fs'); const http = require('http'); const https = require('https');
const os = require('os'); const path = require('path');
const EVOLVE_URL = process.env.MECH_EVOLVE_URL || 'http://evolve.mech.is';
const command = process.argv[2] || 'status';
function getApplicationId() {
  try {
    const PM = require('./.claude/hooks/project-id-manager.cjs');
    return new PM(process.cwd()).getApplicationId();
  } catch (e) { return path.basename(process.cwd()); }
}
const settings = {hooks:{PostToolUse:[{matcher:"Edit|Write|MultiEdit|Bash",hooks:[{type:"command",command:"node .claude/hooks/evolve-hook.cjs"}]}]}};
switch (command) {
  case 'on': fs.writeFileSync('.claude/settings.json', JSON.stringify(settings, null, 2)); console.log('🚀 Evolution ENABLED'); break;
  case 'off': fs.writeFileSync('.claude/settings.json', JSON.stringify({hooks:{}}, null, 2)); console.log('🛑 Evolution DISABLED'); break;
  case 'status': 
    const enabled = fs.existsSync('.claude/settings.json') && fs.readFileSync('.claude/settings.json', 'utf-8').includes('evolve-hook');
    console.log(enabled ? '🟢 Evolution ACTIVE' : '⭕ Evolution INACTIVE');
    if (enabled) console.log('📋 App ID:', getApplicationId());
    break;
  default: console.log('Usage: ./mech-evolve [on|off|status]');
}
EOFCLI
chmod +x "./mech-evolve"
log "CLI installed"

step "Installing project ID manager..."
cat > "\$CLAUDE_DIR/hooks/project-id-manager.cjs" << 'EOFPID'
#!/usr/bin/env node
const fs=require('fs'),path=require('path'),crypto=require('crypto');
class ProjectIdManager{constructor(d=process.cwd()){this.projectDir=d;this.claudeDir=path.join(d,'.claude');this.configFile=path.join(this.claudeDir,'project.json');}
getApplicationId(){if(fs.existsSync(this.configFile)){try{const c=JSON.parse(fs.readFileSync(this.configFile,'utf-8'));if(c.applicationId)return c.applicationId;}catch(e){}}
const id=this.generateApplicationId();this.saveApplicationId(id);return id;}
generateApplicationId(){const name=this.getProjectName();const hash=crypto.createHash('sha256').update(\`\${name}-\${this.projectDir}-\${Date.now()}\`).digest('hex');return\`mech-\${name.toLowerCase().replace(/[^a-z0-9]/g,'-')}-\${hash.substring(0,8)}\`;}
getProjectName(){const pkg=path.join(this.projectDir,'package.json');if(fs.existsSync(pkg)){try{const p=JSON.parse(fs.readFileSync(pkg,'utf-8'));if(p.name)return p.name;}catch(e){}}return path.basename(this.projectDir);}
saveApplicationId(id){if(!fs.existsSync(this.claudeDir))fs.mkdirSync(this.claudeDir,{recursive:true});const config={applicationId:id,createdAt:new Date().toISOString()};fs.writeFileSync(this.configFile,JSON.stringify(config,null,2));}}
if(require.main===module){const m=new ProjectIdManager();const cmd=process.argv[2];if(cmd==='get')console.log(m.getApplicationId());else console.log('Usage: project-id-manager.cjs [get]');}
module.exports=ProjectIdManager;
EOFPID
chmod +x "\$CLAUDE_DIR/hooks/project-id-manager.cjs"
log "Project ID manager installed"

step "Installing evolution hook..."
cat > "\$CLAUDE_DIR/hooks/evolve-hook.cjs" << 'EOFHOOK'
#!/usr/bin/env node
const http=require('http'),https=require('https'),os=require('os'),path=require('path');
const EVOLVE_URL=process.env.MECH_EVOLVE_URL||'http://evolve.mech.is';
const TOOL_NAME=process.env.tool_name||'';
if(!['Edit','Write','MultiEdit','Bash'].includes(TOOL_NAME))process.exit(0);
function getApplicationId(){try{const PM=require('./project-id-manager.cjs');return new PM(process.cwd()).getApplicationId();}catch(e){return\`fallback-\${path.basename(process.cwd())}-\${Date.now()}\`;}}
const data=JSON.stringify({applicationId:getApplicationId(),toolName:TOOL_NAME,timestamp:new Date().toISOString(),metadata:{projectScope:'isolated'}});
const url=new URL('/api/evolution/track',EVOLVE_URL);const protocol=url.protocol==='https:'?https:http;
const req=protocol.request({hostname:url.hostname,port:url.port||(url.protocol==='https:'?443:80),path:url.pathname,method:'POST',headers:{'Content-Type':'application/json'}},()=>{});
req.on('error',()=>{});req.write(data);req.end();process.exit(0);
EOFHOOK
chmod +x "\$CLAUDE_DIR/hooks/evolve-hook.cjs"
log "Evolution hook installed"

step "Testing connection..."
if curl -sSf --connect-timeout 5 "\$EVOLVE_URL/health" >/dev/null 2>&1; then
    log "Connected to evolution service"
else
    warn "Service not reachable (local mode)"
fi

step "Generating application ID..."
APP_ID=\$(node "\$CLAUDE_DIR/hooks/project-id-manager.cjs" get 2>/dev/null || echo "unknown")
log "Application ID: \$APP_ID"

step "Enabling evolution..."
./mech-evolve on
log "Evolution activated"

echo ""
echo -e "\${GREEN}🎉 Installation Complete!\${NC}"
echo -e "\${GREEN}=========================\${NC}"
echo ""
echo -e "\${BLUE}Project:\${NC} \$PROJECT_NAME"
echo -e "\${BLUE}Application ID:\${NC} \$APP_ID"
echo ""
echo -e "\${CYAN}Commands:\${NC}"
echo "  ./mech-evolve status  - Check status"
echo "  ./mech-evolve off     - Disable"
echo ""
echo -e "\${PURPLE}What happens now:\${NC}"
echo "• Code changes via Claude Code will be tracked"
echo "• Patterns learned within this project only"  
echo "• Automatic improvements suggested"
echo ""
echo -e "\${GREEN}🚀 Start coding with Claude Code!\${NC}"
`);
});

// API Documentation
app.get('/api/docs', (req: Request, res: Response) => {
  res.json({
    service: 'Mech Evolve',
    description: 'Continuous code evolution service',
    version: '1.0.0',
    endpoints: {
      evolution: {
        track: 'POST /api/evolution/track - Track a code change',
        suggest: 'GET /api/evolution/suggest/:projectId - Get improvement suggestions',
        apply: 'POST /api/evolution/apply - Apply an improvement',
        history: 'GET /api/evolution/history/:projectId - Get evolution history'
      },
      sync: {
        push: 'POST /api/sync/push - Push local improvements',
        pull: 'GET /api/sync/pull/:machineId - Pull improvements for machine',
        status: 'GET /api/sync/status/:projectId - Get sync status'
      },
      analytics: {
        metrics: 'GET /api/analytics/metrics/:projectId - Get improvement metrics',
        trends: 'GET /api/analytics/trends - Get improvement trends',
        leaderboard: 'GET /api/analytics/leaderboard - Get top improvers'
      }
    }
  });
});

// Evolution Tracking Endpoint with Dynamic Agents
app.post('/api/evolution/track', async (req: Request, res: Response) => {
  try {
    const { 
      applicationId,
      projectId, 
      machineId, 
      filePath, 
      changeType, 
      improvements,
      metadata 
    } = req.body;

    const evolution = {
      id: uuidv4(),
      applicationId: applicationId || projectId, // Support both
      projectId,
      machineId,
      filePath,
      changeType,
      improvements,
      metadata,
      timestamp: new Date(),
      status: 'tracked'
    };

    await db.collection('evolutions').insertOne(evolution);

    // Create change event for dynamic agents
    const changeEvent: ChangeEvent = {
      id: evolution.id,
      applicationId: evolution.applicationId,
      filePath,
      changeType,
      timestamp: new Date(),
      metadata
    };

    // Trigger dynamic agent analysis
    let agentResponses: any[] = [];
    let suggestions: any[] = [];
    
    try {
      agentResponses = await agentFactory.triggerAgentAnalysis(evolution.applicationId, changeEvent);
      suggestions = agentResponses.flatMap(response => response.suggestions);
    } catch (agentError) {
      logger.warn('Agent analysis failed, falling back to simple analysis:', agentError);
      suggestions = await analyzeForImprovements(filePath, changeType);
    }

    res.json({
      success: true,
      evolutionId: evolution.id,
      agentResponses: agentResponses.length,
      suggestions,
      message: agentResponses.length > 0 
        ? `Change analyzed by ${agentResponses.length} dynamic agents`
        : 'Change tracked with basic analysis'
    });

  } catch (error) {
    logger.error('Error tracking evolution:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to track evolution' 
    });
  }
});

// Get Improvement Suggestions
app.get('/api/evolution/suggest/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit = 10 } = req.query;

    const suggestions = await db.collection('suggestions')
      .find({ 
        projectId,
        status: 'pending'
      })
      .sort({ priority: -1, timestamp: -1 })
      .limit(Number(limit))
      .toArray();

    res.json({
      success: true,
      suggestions,
      count: suggestions.length
    });

  } catch (error) {
    logger.error('Error getting suggestions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get suggestions' 
    });
  }
});

// Apply Improvement
app.post('/api/evolution/apply', async (req: Request, res: Response) => {
  try {
    const { 
      suggestionId, 
      projectId,
      machineId,
      result 
    } = req.body;

    const application = {
      id: uuidv4(),
      suggestionId,
      projectId,
      machineId,
      result,
      timestamp: new Date(),
      status: result.success ? 'applied' : 'failed'
    };

    await db.collection('applications').insertOne(application);

    // Update suggestion status
    await db.collection('suggestions').updateOne(
      { id: suggestionId },
      { $set: { status: application.status } }
    );

    res.json({
      success: true,
      applicationId: application.id,
      status: application.status
    });

  } catch (error) {
    logger.error('Error applying improvement:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to apply improvement' 
    });
  }
});

// Cross-Machine Sync - Push
app.post('/api/sync/push', async (req: Request, res: Response) => {
  try {
    const { 
      machineId, 
      projectId, 
      improvements 
    } = req.body;

    const syncRecord = {
      id: uuidv4(),
      machineId,
      projectId,
      improvements,
      timestamp: new Date(),
      type: 'push'
    };

    await db.collection('sync').insertOne(syncRecord);

    // Distribute to other machines
    const otherMachines = await db.collection('machines')
      .find({ 
        projectId,
        id: { $ne: machineId },
        active: true
      })
      .toArray();

    for (const machine of otherMachines) {
      await db.collection('pending_sync').insertOne({
        targetMachineId: machine.id,
        sourceMAchineId: machineId,
        improvements,
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      syncId: syncRecord.id,
      distributedTo: otherMachines.length
    });

  } catch (error) {
    logger.error('Error pushing sync:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to push sync' 
    });
  }
});

// Get Sync Status
app.get('/api/sync/status/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Get recent sync activity
    const recentSync = await db.collection('sync')
      .find({ projectId })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    // Get pending sync count
    const pendingSync = await db.collection('pending_sync')
      .countDocuments({ projectId });

    // Get active machines
    const activeMachines = await db.collection('machines')
      .find({ projectId, active: true })
      .toArray();

    res.json({
      success: true,
      projectId,
      status: {
        lastSync: recentSync[0]?.timestamp || null,
        pendingSync,
        activeMachines: activeMachines.length,
        recentActivity: recentSync.length
      },
      recentSync: recentSync.slice(0, 5).map(s => ({
        id: s.id,
        type: s.type,
        timestamp: s.timestamp,
        machineId: s.machineId
      }))
    });

  } catch (error) {
    logger.error('Error getting sync status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get sync status' 
    });
  }
});

// Cross-Machine Sync - Pull
app.get('/api/sync/pull/:machineId', async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;

    const pendingSync = await db.collection('pending_sync')
      .find({ targetMachineId: machineId })
      .toArray();

    // Mark as pulled
    if (pendingSync.length > 0) {
      await db.collection('pending_sync').updateMany(
        { targetMachineId: machineId },
        { $set: { pulled: true, pulledAt: new Date() } }
      );
    }

    res.json({
      success: true,
      improvements: pendingSync,
      count: pendingSync.length
    });

  } catch (error) {
    logger.error('Error pulling sync:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to pull sync' 
    });
  }
});

// Analytics - Metrics
app.get('/api/analytics/metrics/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { period = '7d' } = req.query;

    const metrics = await calculateMetrics(projectId, period as string);

    res.json({
      success: true,
      projectId,
      period,
      metrics
    });

  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get metrics' 
    });
  }
});

// Analytics - Trends
app.get('/api/analytics/trends', async (req: Request, res: Response) => {
  try {
    const { period = '30d', projectId } = req.query;
    const startDate = getStartDate(period as string);

    // Base match condition
    const matchCondition: any = {
      timestamp: { $gte: startDate }
    };

    // Add project filter if specified
    if (projectId) {
      matchCondition.$or = [
        { projectId },
        { applicationId: projectId }
      ];
    }

    // Get daily evolution trends
    const trendsPipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            changeType: '$changeType'
          },
          count: { $sum: 1 },
          improvements: { 
            $sum: { 
              $cond: { 
                if: { $and: [{ $ne: ['$improvements', null] }, { $isArray: '$improvements' }] }, 
                then: { $size: '$improvements' }, 
                else: 0 
              } 
            } 
          }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          totalChanges: { $sum: '$count' },
          totalImprovements: { $sum: '$improvements' },
          byType: {
            $push: {
              type: '$_id.changeType',
              count: '$count',
              improvements: '$improvements'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const trends = await db.collection('evolutions')
      .aggregate(trendsPipeline)
      .toArray();

    // Get top improvement types
    const topTypesPipeline = [
      { $match: matchCondition },
      {
        $group: {
          _id: '$changeType',
          count: { $sum: 1 },
          improvements: { 
            $sum: { 
              $cond: { 
                if: { $and: [{ $ne: ['$improvements', null] }, { $isArray: '$improvements' }] }, 
                then: { $size: '$improvements' }, 
                else: 0 
              } 
            } 
          }
        }
      },
      { $sort: { improvements: -1 } },
      { $limit: 10 }
    ];

    const topTypes = await db.collection('evolutions')
      .aggregate(topTypesPipeline)
      .toArray();

    res.json({
      success: true,
      period,
      projectId: projectId || 'all',
      trends: {
        daily: trends,
        topTypes,
        summary: {
          totalDays: trends.length,
          totalChanges: trends.reduce((sum, t) => sum + t.totalChanges, 0),
          totalImprovements: trends.reduce((sum, t) => sum + t.totalImprovements, 0),
          avgChangesPerDay: trends.length > 0 
            ? Math.round(trends.reduce((sum, t) => sum + t.totalChanges, 0) / trends.length) 
            : 0
        }
      }
    });

  } catch (error) {
    logger.error('Error getting trends:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get trends' 
    });
  }
});

// Get Evolution History
app.get('/api/evolution/history/:projectId', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const evolutions = await db.collection('evolutions')
      .find({ 
        $or: [
          { projectId },
          { applicationId: projectId } // Support both for compatibility
        ]
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      projectId,
      count: evolutions.length,
      evolutions
    });

  } catch (error) {
    logger.error('Error getting evolution history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get evolution history' 
    });
  }
});

// Analyze Project and Create Dynamic Agents (Magic Prompt)
app.post('/api/agents/analyze-project', async (req: Request, res: Response) => {
  try {
    const { applicationId, projectPath } = req.body;
    
    if (!applicationId || !projectPath) {
      return res.status(400).json({
        success: false,
        error: 'applicationId and projectPath are required'
      });
    }

    logger.info(`🔍 Analyzing project: ${applicationId}`);
    
    // Step 1: Analyze codebase (Magic Prompt approach)
    const analysis = await codebaseAnalyzer.analyzeProject(applicationId, projectPath);
    
    // Step 2: Create dynamic agents based on analysis
    const createdAgents = await agentFactory.createAgentsFromAnalysis(analysis);
    
    res.json({
      success: true,
      analysis: {
        projectType: analysis.projectType,
        languages: analysis.languages,
        frameworks: analysis.frameworks,
        complexity: analysis.complexity,
        patternsDetected: analysis.patterns.length
      },
      agents: {
        created: createdAgents.length,
        tier1: createdAgents.filter(a => a.tier === 1).length,
        tier2: createdAgents.filter(a => a.tier === 2).length,
        agents: createdAgents.map(a => ({
          name: a.name,
          role: a.role,
          purpose: a.purpose,
          tier: a.tier,
          priority: a.priority
        }))
      },
      message: `Created ${createdAgents.length} specialized agents for your project`
    });

  } catch (error) {
    logger.error('Error analyzing project:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze project and create agents' 
    });
  }
});

// Get Active Agents for Project
app.get('/api/agents/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const agents = await agentFactory.getActiveAgents(applicationId);
    
    res.json({
      success: true,
      applicationId,
      agentCount: agents.length,
      agents: agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        purpose: agent.purpose,
        tier: agent.tier,
        priority: agent.priority,
        status: agent.status,
        performance: agent.performance,
        lastActive: agent.lastActive,
        patterns: agent.memory.patterns.length,
        capabilities: agent.capabilities
      }))
    });

  } catch (error) {
    logger.error('Error getting agents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get agents' 
    });
  }
});

// Get Agent Memory and Insights
app.get('/api/agents/:applicationId/:agentId/memory', async (req: Request, res: Response) => {
  try {
    const { applicationId, agentId } = req.params;
    
    const agent = await db.collection('dynamic_agents').findOne({ 
      id: agentId, 
      applicationId 
    });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    res.json({
      success: true,
      agent: {
        name: agent.name,
        role: agent.role,
        memory: agent.memory,
        performance: agent.performance,
        specification: agent.specification
      }
    });

  } catch (error) {
    logger.error('Error getting agent memory:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get agent memory' 
    });
  }
});

// Sync Agents to Files (Claude Code Integration)
app.post('/api/agents/:applicationId/sync-to-files', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { projectPath } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({
        success: false,
        error: 'projectPath is required'
      });
    }

    // Validate path exists and is accessible
    const fs = require('fs');
    if (!fs.existsSync(projectPath)) {
      return res.status(400).json({
        success: false,
        error: 'projectPath does not exist or is not accessible'
      });
    }

    const dynamicAgents = await agentFactory.getActiveAgents(applicationId);
    
    if (dynamicAgents.length === 0) {
      return res.json({
        success: true,
        message: 'No active agents to sync',
        filesSynced: 0
      });
    }

    const agents = dynamicAgents.map(convertDynamicAgentToAgent);
    const filesSynced = await syncAgentsToFiles(applicationId, agents, projectPath);
    
    res.json({
      success: true,
      message: `Synced ${agents.length} agents to ${filesSynced} files`,
      agentCount: agents.length,
      filesSynced
    });

  } catch (error) {
    logger.error('Error syncing agents to files:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to sync agents to files' 
    });
  }
});

// Generate Claude Context
app.get('/api/agents/:applicationId/claude-context', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const dynamicAgents = await agentFactory.getActiveAgents(applicationId);
    const agents = dynamicAgents.map(convertDynamicAgentToAgent);
    
    const context = generateClaudeContext(agents);
    
    res.json({
      success: true,
      context,
      agentCount: agents.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error generating Claude context:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate Claude context' 
    });
  }
});

// Helper function to convert DynamicAgent to Agent
function convertDynamicAgentToAgent(dynamicAgent: any): Agent {
  return {
    id: dynamicAgent.id,
    name: dynamicAgent.name,
    role: dynamicAgent.role,
    purpose: dynamicAgent.purpose,
    tier: dynamicAgent.tier,
    priority: dynamicAgent.priority,
    status: dynamicAgent.status,
    performance: dynamicAgent.performance,
    memory: {
      patterns: dynamicAgent.memory?.patterns || [],
      recentContext: dynamicAgent.memory?.recentContext || [],
      context: dynamicAgent.memory?.context || {}
    },
    specification: dynamicAgent.specification,
    lastActive: typeof dynamicAgent.lastActive === 'string' ? dynamicAgent.lastActive : dynamicAgent.lastActive.toISOString(),
    capabilities: dynamicAgent.capabilities || []
  };
}

// Helper Functions for Agent-File Sync
async function syncAgentsToFiles(applicationId: string, agents: Agent[], projectPath: string): Promise<number> {
  const fs = require('fs').promises;
  const path = require('path');
  
  const claudeDir = path.join(projectPath, '.claude');
  const agentsDir = path.join(claudeDir, 'agents');
  const contextDir = path.join(claudeDir, 'agent-context');
  
  try {
    // Ensure directories exist
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.mkdir(contextDir, { recursive: true });
    
    let filesSynced = 0;
    
    // Create individual agent files
    for (const agent of agents) {
      const agentFile = path.join(agentsDir, `${agent.name.toLowerCase()}.md`);
      const agentContent = generateAgentMarkdown(agent);
      await fs.writeFile(agentFile, agentContent, 'utf-8');
      filesSynced++;
    }
    
    // Create agents summary
    const summaryFile = path.join(contextDir, 'agents-summary.json');
    const summary = {
      applicationId,
      agentCount: agents.length,
      agents: agents.map(a => ({
        name: a.name,
        role: a.role,
        tier: a.tier,
        status: a.status,
        patterns: a.memory?.patterns?.length || 0,
        performance: a.performance
      })),
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2), 'utf-8');
    filesSynced++;
    
    // Create Claude context file
    const contextFile = path.join(contextDir, 'current-agents.md');
    const context = generateClaudeContext(agents);
    await fs.writeFile(contextFile, context, 'utf-8');
    filesSynced++;
    
    logger.info(`Synced ${agents.length} agents to ${filesSynced} files in ${projectPath}`);
    return filesSynced;
    
  } catch (error) {
    logger.error('Error syncing agents to files:', error);
    throw error;
  }
}

function generateAgentMarkdown(agent: Agent): string {
  const patterns = agent.memory?.patterns?.map(p => 
    `- ${p.pattern}: seen ${p.frequency} times (confidence: ${p.confidence})`
  ).join('\n') || 'No patterns learned yet';

  const recentContext = agent.memory?.recentContext?.length 
    ? agent.memory.recentContext.slice(0, 5).map((item: any) => `- ${item.action || 'Activity'}: ${item.filePath || 'unknown'}`).join('\n')
    : 'No recent activity';

  return `# ${agent.name} Agent

## Role
${agent.role}

## Purpose
${agent.purpose}

## Status
- **Current Status**: ${agent.status}
- **Tier**: ${agent.tier}
- **Priority**: ${agent.priority}
- **Last Active**: ${new Date(agent.lastActive).toLocaleString()}

## Learned Patterns
${patterns}

## Recent Context
${recentContext}

## Capabilities
${agent.capabilities?.map((cap: string) => `- ${cap}`).join('\n') || 'No capabilities defined'}

## Performance
- **Suggestions Generated**: ${agent.performance?.suggestionsGenerated || 0}
- **Success Rate**: ${agent.performance?.successRate || 0}

## Specification
### Analysis Logic
${agent.specification?.analysisLogic || 'No analysis logic defined'}

### Improvement Strategies
${agent.specification?.improvementStrategies?.map((s: string) => `- ${s}`).join('\n') || 'No strategies defined'}

### Learning Mechanisms
${agent.specification?.learningMechanisms?.map((m: string) => `- ${m}`).join('\n') || 'No learning mechanisms defined'}

---
*This file is auto-generated and updated by mech-evolve based on agent learning*
*Last updated: ${new Date().toLocaleString()}*
`;
}

function generateClaudeContext(agents: Agent[]): string {
  const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'learning');
  
  if (activeAgents.length === 0) {
    return `# AI Agent System Available

Your project is configured with mech-evolve dynamic agents, but no agents are currently active.

To activate agents for this project, run:
\`\`\`bash
curl -X POST http://localhost:3011/api/agents/analyze-project \\
  -H "Content-Type: application/json" \\
  -d '{"applicationId":"your-app-id","projectPath":"$(pwd)"}'
\`\`\`

Once activated, specialized agents will monitor your code changes and provide intelligent suggestions.

---
*Check agent status: ./mech-evolve status*`;
  }

  let context = `# Active AI Agents for This Project\n\n`;
  context += `You have ${activeAgents.length} specialized AI agents monitoring and improving this codebase:\n\n`;

  activeAgents.forEach(agent => {
    context += `## ${agent.name} (${agent.role})\n`;
    context += `**Purpose**: ${agent.purpose}\n`;
    context += `**Performance**: ${agent.performance?.suggestionsGenerated || 0} suggestions generated\n`;
    
    if (agent.memory?.patterns && agent.memory.patterns.length > 0) {
      context += `**Learned Patterns**: ${agent.memory.patterns.length} patterns recognized\n`;
      const topPattern = agent.memory.patterns.reduce((top, p) => 
        p.frequency > top.frequency ? p : top
      );
      context += `**Most Common Pattern**: ${topPattern.pattern} (${topPattern.frequency} occurrences)\n`;
    }
    
    context += `**Capabilities**: ${agent.capabilities?.join(', ') || 'General analysis'}\n`;
    context += `**Priority**: ${agent.priority} (Tier ${agent.tier})\n\n`;
  });

  context += `## Agent Collaboration\n`;
  context += `These agents work together to provide intelligent suggestions. When making code changes, consider their specialized insights and learned patterns from this project.\n\n`;
  
  const topAgent = activeAgents.reduce((top, agent) => 
    (agent.performance?.suggestionsGenerated || 0) > (top.performance?.suggestionsGenerated || 0) ? agent : top
  );
  
  context += `**Most Active Agent**: ${topAgent.name} has provided the most guidance recently.\n\n`;
  
  // Add recent learnings
  const recentPatterns = activeAgents
    .flatMap(a => a.memory?.patterns || [])
    .filter((p: any) => p.lastSeen && new Date(p.lastSeen).getTime() > Date.now() - 24 * 60 * 60 * 1000)
    .sort((a: any, b: any) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    
  if (recentPatterns.length > 0) {
    context += `## Recent Learning (Last 24 Hours)\n`;
    recentPatterns.slice(0, 3).forEach((pattern: any) => {
      context += `- **${pattern.pattern}**: observed ${pattern.frequency} times\n`;
    });
    context += `\n`;
  }
  
  context += `---\n*Agent status updated: ${new Date().toLocaleString()}*`;

  return context;
}

async function analyzeForImprovements(filePath: string, changeType: string) {
  // Smart analysis logic here
  const suggestions = [];
  
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    suggestions.push({
      type: 'formatting',
      command: 'prettier',
      priority: 1
    });
    suggestions.push({
      type: 'linting',
      command: 'eslint',
      priority: 2
    });
    suggestions.push({
      type: 'type-check',
      command: 'tsc',
      priority: 3
    });
  }

  if (changeType === 'function-add') {
    suggestions.push({
      type: 'test-generation',
      command: 'generate-test',
      priority: 5
    });
  }

  return suggestions;
}

async function calculateMetrics(projectId: string, period: string) {
  const startDate = getStartDate(period);
  
  const pipeline = [
    {
      $match: {
        $or: [
          { projectId },
          { applicationId: projectId }
        ],
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$changeType',
        count: { $sum: 1 },
        improvements: { 
          $sum: { 
            $cond: { 
              if: { $and: [{ $ne: ['$improvements', null] }, { $isArray: '$improvements' }] }, 
              then: { $size: '$improvements' }, 
              else: 0 
            } 
          } 
        }
      }
    }
  ];

  const results = await db.collection('evolutions')
    .aggregate(pipeline)
    .toArray();

  return {
    totalChanges: results.reduce((sum, r) => sum + r.count, 0),
    totalImprovements: results.reduce((sum, r) => sum + r.improvements, 0),
    byType: results
  };
}

function getStartDate(period: string): Date {
  const now = new Date();
  const match = period.match(/(\d+)([dhm])/);
  if (!match) return now;
  
  const [, num, unit] = match;
  const value = parseInt(num);
  
  switch (unit) {
    case 'd': return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    case 'h': return new Date(now.getTime() - value * 60 * 60 * 1000);
    case 'm': return new Date(now.getTime() - value * 60 * 1000);
    default: return now;
  }
}

// Start server
async function start() {
  try {
    // Connect to MongoDB
    await mongoClient.connect();
    db = mongoClient.db();
    logger.info('Connected to MongoDB');

    // Initialize service instances
    codebaseAnalyzer = new CodebaseAnalyzer(db);
    agentFactory = new AgentFactory(db);
    logger.info('Initialized dynamic agent services');

    // Create indexes for existing collections
    await db.collection('evolutions').createIndex({ projectId: 1, timestamp: -1 });
    await db.collection('evolutions').createIndex({ applicationId: 1, timestamp: -1 });
    await db.collection('suggestions').createIndex({ projectId: 1, status: 1 });
    await db.collection('sync').createIndex({ machineId: 1, timestamp: -1 });
    
    // Create indexes for dynamic agent collections
    await db.collection('dynamic_agents').createIndex({ applicationId: 1, status: 1 });
    await db.collection('dynamic_agents').createIndex({ id: 1 }, { unique: true });
    await db.collection('codebase_analyses').createIndex({ applicationId: 1 }, { unique: true });
    await db.collection('agent_ecosystems').createIndex({ applicationId: 1 }, { unique: true });
    
    logger.info('Created database indexes for dynamic agent system');
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Mech Evolve service running on port ${PORT}`);
      logger.info(`📊 API docs: http://localhost:${PORT}/api/docs`);
      logger.info(`🤖 Dynamic agent creation enabled`);
      logger.info(`✨ Ready to evolve your code with intelligent agents!`);
    });

  } catch (error) {
    logger.error('Failed to start service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await mongoClient.close();
  process.exit(0);
});

start();