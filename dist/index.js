"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
const winston_1 = require("winston");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const uuid_1 = require("uuid");
const codebase_analyzer_1 = require("./services/codebase-analyzer");
const agent_factory_1 = require("./services/agent-factory");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3011;
const SERVICE_NAME = 'mech-evolve';
// Logger setup
const logger = (0, winston_1.createLogger)({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: SERVICE_NAME }
});
// MongoDB setup
let db;
const mongoClient = new mongodb_1.MongoClient(process.env.MONGODB_URI);
// Service instances
let codebaseAnalyzer;
let agentFactory;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
app.use(express_1.default.json());
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
});
app.use('/api', limiter);
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: SERVICE_NAME,
        timestamp: new Date().toISOString()
    });
});
// Installer Script Endpoint
app.get('/start', (req, res) => {
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
app.get('/api/docs', (req, res) => {
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
app.post('/api/evolution/track', async (req, res) => {
    try {
        const { applicationId, projectId, machineId, filePath, changeType, improvements, metadata } = req.body;
        const evolution = {
            id: (0, uuid_1.v4)(),
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
        const changeEvent = {
            id: evolution.id,
            applicationId: evolution.applicationId,
            filePath,
            changeType,
            timestamp: new Date(),
            metadata
        };
        // Trigger dynamic agent analysis
        let agentResponses = [];
        let suggestions = [];
        try {
            agentResponses = await agentFactory.triggerAgentAnalysis(evolution.applicationId, changeEvent);
            suggestions = agentResponses.flatMap(response => response.suggestions);
        }
        catch (agentError) {
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
    }
    catch (error) {
        logger.error('Error tracking evolution:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track evolution'
        });
    }
});
// Get Improvement Suggestions
app.get('/api/evolution/suggest/:projectId', async (req, res) => {
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
    }
    catch (error) {
        logger.error('Error getting suggestions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get suggestions'
        });
    }
});
// Apply Improvement
app.post('/api/evolution/apply', async (req, res) => {
    try {
        const { suggestionId, projectId, machineId, result } = req.body;
        const application = {
            id: (0, uuid_1.v4)(),
            suggestionId,
            projectId,
            machineId,
            result,
            timestamp: new Date(),
            status: result.success ? 'applied' : 'failed'
        };
        await db.collection('applications').insertOne(application);
        // Update suggestion status
        await db.collection('suggestions').updateOne({ id: suggestionId }, { $set: { status: application.status } });
        res.json({
            success: true,
            applicationId: application.id,
            status: application.status
        });
    }
    catch (error) {
        logger.error('Error applying improvement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to apply improvement'
        });
    }
});
// Cross-Machine Sync - Push
app.post('/api/sync/push', async (req, res) => {
    try {
        const { machineId, projectId, improvements } = req.body;
        const syncRecord = {
            id: (0, uuid_1.v4)(),
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
    }
    catch (error) {
        logger.error('Error pushing sync:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to push sync'
        });
    }
});
// Cross-Machine Sync - Pull
app.get('/api/sync/pull/:machineId', async (req, res) => {
    try {
        const { machineId } = req.params;
        const pendingSync = await db.collection('pending_sync')
            .find({ targetMachineId: machineId })
            .toArray();
        // Mark as pulled
        if (pendingSync.length > 0) {
            await db.collection('pending_sync').updateMany({ targetMachineId: machineId }, { $set: { pulled: true, pulledAt: new Date() } });
        }
        res.json({
            success: true,
            improvements: pendingSync,
            count: pendingSync.length
        });
    }
    catch (error) {
        logger.error('Error pulling sync:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to pull sync'
        });
    }
});
// Analytics - Metrics
app.get('/api/analytics/metrics/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { period = '7d' } = req.query;
        const metrics = await calculateMetrics(projectId, period);
        res.json({
            success: true,
            projectId,
            period,
            metrics
        });
    }
    catch (error) {
        logger.error('Error getting metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get metrics'
        });
    }
});
// Get Evolution History
app.get('/api/evolution/history/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
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
    }
    catch (error) {
        logger.error('Error getting evolution history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get evolution history'
        });
    }
});
// Analyze Project and Create Dynamic Agents (Magic Prompt)
app.post('/api/agents/analyze-project', async (req, res) => {
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
    }
    catch (error) {
        logger.error('Error analyzing project:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze project and create agents'
        });
    }
});
// Get Active Agents for Project
app.get('/api/agents/:applicationId', async (req, res) => {
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
    }
    catch (error) {
        logger.error('Error getting agents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get agents'
        });
    }
});
// Get Agent Memory and Insights
app.get('/api/agents/:applicationId/:agentId/memory', async (req, res) => {
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
    }
    catch (error) {
        logger.error('Error getting agent memory:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get agent memory'
        });
    }
});
// Helper Functions
async function analyzeForImprovements(filePath, changeType) {
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
async function calculateMetrics(projectId, period) {
    const startDate = getStartDate(period);
    const pipeline = [
        {
            $match: {
                projectId,
                timestamp: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$changeType',
                count: { $sum: 1 },
                improvements: { $sum: { $size: '$improvements' } }
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
function getStartDate(period) {
    const now = new Date();
    const match = period.match(/(\d+)([dhm])/);
    if (!match)
        return now;
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
        codebaseAnalyzer = new codebase_analyzer_1.CodebaseAnalyzer(db);
        agentFactory = new agent_factory_1.AgentFactory(db);
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
    }
    catch (error) {
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
//# sourceMappingURL=index.js.map