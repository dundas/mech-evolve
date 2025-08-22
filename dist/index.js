"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const claude_agent_formatter_1 = require("./services/claude-agent-formatter");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
let claudeFormatter;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);
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
// Version and deployment information endpoint
app.get('/api/version', (req, res) => {
    try {
        // Try to load build metadata
        let buildMetadata;
        try {
            buildMetadata = require('../dist/build-metadata.js');
        }
        catch (error) {
            // Fallback to basic version info if metadata not available
            buildMetadata = {
                version: '2.0.0',
                cliVersion: 'enhanced-v2.0.0',
                buildTime: 'unknown',
                deploymentId: `fallback-${Date.now()}`,
                git: {
                    commit: 'unknown',
                    shortCommit: 'unknown',
                    branch: 'unknown',
                    remote: 'unknown'
                },
                features: [
                    'enhanced-cli',
                    'dynamic-agents',
                    'uninstall-support',
                    'basic-functionality'
                ],
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    arch: process.arch
                }
            };
        }
        // Add runtime information
        const runtimeInfo = {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            processId: process.pid
        };
        // Try to get additional deployment info
        let deploymentInfo = {};
        try {
            const fs = require('fs');
            const path = require('path');
            const deploymentPath = path.join(__dirname, '..', 'dist', 'DEPLOYMENT_INFO');
            if (fs.existsSync(deploymentPath)) {
                deploymentInfo = {
                    deploymentInfoAvailable: true,
                    deploymentFile: deploymentPath
                };
            }
        }
        catch (e) {
            // Ignore if deployment info file not available
        }
        const response = {
            service: SERVICE_NAME,
            version: buildMetadata.version,
            cliVersion: buildMetadata.cliVersion,
            buildTime: buildMetadata.buildTime,
            deploymentId: buildMetadata.deploymentId,
            deployedAt: buildMetadata.buildTime,
            git: buildMetadata.git,
            features: buildMetadata.features,
            environment: {
                ...buildMetadata.environment,
                runtime: runtimeInfo
            },
            deployment: {
                containerized: true,
                healthCheckEnabled: true,
                ...deploymentInfo
            },
            api: {
                documentation: '/api/docs',
                healthCheck: '/health',
                agents: '/api/agents/:applicationId',
                evolution: '/api/evolution/track'
            },
            status: 'operational',
            lastRestarted: new Date(Date.now() - process.uptime() * 1000).toISOString()
        };
        res.json(response);
    }
    catch (error) {
        logger.error('Error generating version response:', error);
        res.status(500).json({
            error: 'Failed to retrieve version information',
            service: SERVICE_NAME,
            timestamp: new Date().toISOString()
        });
    }
});
// Deployment verification endpoint
app.get('/api/deployment-status', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        // Check for build artifacts
        const distDir = path.join(__dirname, '..', 'dist');
        const buildMetadataPath = path.join(distDir, 'build-metadata.json');
        const versionPath = path.join(distDir, 'VERSION');
        const deploymentInfoPath = path.join(distDir, 'DEPLOYMENT_INFO');
        const artifacts = {
            buildMetadata: fs.existsSync(buildMetadataPath),
            versionFile: fs.existsSync(versionPath),
            deploymentInfo: fs.existsSync(deploymentInfoPath),
            distDirectory: fs.existsSync(distDir)
        };
        let versionFromFile = 'unknown';
        if (artifacts.versionFile) {
            try {
                versionFromFile = fs.readFileSync(versionPath, 'utf-8').trim();
            }
            catch (e) {
                // Ignore read errors
            }
        }
        let deploymentDetails = {};
        if (artifacts.deploymentInfo) {
            try {
                const deploymentContent = fs.readFileSync(deploymentInfoPath, 'utf-8');
                deploymentDetails = { deploymentContent };
            }
            catch (e) {
                // Ignore read errors
            }
        }
        const deploymentStatus = {
            status: 'deployed',
            artifacts,
            versionFromFile,
            packageVersion: require('../../package.json').version,
            versionMatch: versionFromFile === require('../../package.json').version,
            checkedAt: new Date().toISOString(),
            ...deploymentDetails
        };
        res.json(deploymentStatus);
    }
    catch (error) {
        logger.error('Error checking deployment status:', error);
        res.status(500).json({
            error: 'Failed to check deployment status',
            timestamp: new Date().toISOString()
        });
    }
});
// Function to get enhanced CLI content
function getEnhancedCLIContent() {
    // Unified CLI with complete enhanced functionality
    return `#!/usr/bin/env node
// Enhanced Mech Evolve CLI with Complete Command Set
// Version 2.1.0 - Unified Production Ready

// Check Node.js version
const nodeVersion = process.versions.node;
const major = parseInt(nodeVersion.split('.')[0]);
if (major < 14) {
  console.error(\`❌ Node.js \${nodeVersion} is not supported. Please use Node.js 14 or later.\`);
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const EVOLVE_URL = process.env.MECH_EVOLVE_URL || 'http://evolve.mech.is';
const CLI_VERSION = '2.1.0';
const command = process.argv[2] || 'help';
const args = process.argv.slice(3);

// Color helper functions
function colors() {
  return {
    red: (text) => '\\x1b[0;31m' + text + '\\x1b[0m',
    green: (text) => '\\x1b[0;32m' + text + '\\x1b[0m',
    yellow: (text) => '\\x1b[1;33m' + text + '\\x1b[0m',
    blue: (text) => '\\x1b[0;34m' + text + '\\x1b[0m',
    purple: (text) => '\\x1b[0;35m' + text + '\\x1b[0m',
    cyan: (text) => '\\x1b[0;36m' + text + '\\x1b[0m',
    reset: (text) => '\\x1b[0m' + text + '\\x1b[0m'
  };
}

const c = colors();

// Configuration management class
class ConfigManager {
  constructor() {
    this.configPath = '.claude/settings-enhanced.json';
    this.backupDir = '.claude/backups';
    this.logsDir = '.claude/logs';
  }

  ensureDirectories() {
    const dirs = ['.claude', '.claude/hooks', '.claude/agent-context', '.claude/agent-context/cache', '.claude/agents', this.backupDir, this.logsDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  getConfig() {
    if (!fs.existsSync(this.configPath)) {
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
    } catch (e) {
      return null;
    }
  }

  setConfig(config) {
    this.ensureDirectories();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  resetConfig() {
    const defaultConfig = {
      hooks: {
        PreToolUse: [{
          matcher: "Edit|Write|MultiEdit",
          hooks: [{
            type: "command",
            command: "node .claude/hooks/context-provider.cjs"
          }]
        }],
        PostToolUse: [{
          matcher: "Edit|Write|MultiEdit|Bash",
          hooks: [{
            type: "command",
            command: "node .claude/hooks/evolve-hook-enhanced.cjs"
          }]
        }]
      },
      agentIntegration: {
        enabled: true,
        contextRefreshInterval: 300000,
        cacheTimeout: 300000,
        fallbackMode: "graceful"
      }
    };
    this.setConfig(defaultConfig);
    return defaultConfig;
  }

  backup() {
    if (!fs.existsSync(this.configPath)) {
      return null;
    }
    this.ensureDirectories();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupDir, \`settings-\${timestamp}.json\`);
    fs.copyFileSync(this.configPath, backupFile);
    return backupFile;
  }

  restore(backupFile) {
    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup file not found');
    }
    fs.copyFileSync(backupFile, this.configPath);
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = \`\${timestamp} [\${level.toUpperCase()}] \${message}\\n\`;
    const logFile = path.join(this.logsDir, 'mech-evolve.log');
    this.ensureDirectories();
    fs.appendFileSync(logFile, logEntry);
  }
}

const configManager = new ConfigManager();

function getApplicationId() {
  try {
    const PM = require('./.claude/hooks/project-id-manager.cjs');
    return new PM(process.cwd()).getApplicationId();
  } catch (e) {
    return path.basename(process.cwd());
  }
}

function ensureClaudeDir() {
  const dirs = ['.claude', '.claude/hooks', '.claude/agent-context', '.claude/agent-context/cache', '.claude/agents'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Main command handler
async function handleCommand(command, args) {
  try {
    switch (command) {
      case 'version':
      case '--version':
      case '-v':
        return commandVersion();
      
      case 'help':
      case '--help':
      case '-h':
        return commandHelp(args[0]);
      
      case 'on':
        return commandOn();
      
      case 'off':
        return commandOff();
      
      case 'status':
        return commandStatus();
      
      case 'info':
      case 'inspect':
        return commandInfo();
      
      case 'config':
      case 'settings':
        return commandConfig(args);
      
      case 'reset':
        return commandReset(args);
      
      case 'backup':
        return commandBackup(args);
      
      case 'restore':
        return commandRestore(args);
      
      case 'logs':
      case 'history':
        return commandLogs(args);
      
      case 'test':
      case 'verify':
        return commandTest();
      
      case 'update':
      case 'upgrade':
        return commandUpdate();
      
      case 'agents':
        return commandAgents(args);
      
      case 'create':
        return commandCreate();
      
      case 'remove':
      case 'uninstall':
        return executeUninstall(args);
      
      default:
        return commandHelp();
    }
  } catch (error) {
    console.error(c.red('❌ Error:'), error.message);
    configManager.log('error', \`Command '\${command}' failed: \${error.message}\`);
    process.exit(1);
  }
}

// Command implementations
function commandVersion() {
  console.log(c.purple('Mech Evolve CLI'));
  console.log(c.cyan(\`Version: \${CLI_VERSION}\`));
  console.log(c.blue(\`Node.js: \${process.version}\`));
  console.log(c.yellow(\`Platform: \${process.platform} \${process.arch}\`));
  console.log(c.green(\`Service URL: \${EVOLVE_URL}\`));
  
  // Check if we're in a git repo and show project info
  try {
    const gitInfo = execSync('git rev-parse --show-toplevel 2>/dev/null', { encoding: 'utf8' }).trim();
    if (gitInfo) {
      console.log(c.blue(\`Project: \${path.basename(gitInfo)}\`));
      console.log(c.blue(\`Application ID: \${getApplicationId()}\`));
    }
  } catch (e) {
    // Not in a git repo, that's fine
  }
  
  configManager.log('info', 'Version command executed');
}

function commandHelp(specificCommand) {
  if (specificCommand) {
    return showSpecificHelp(specificCommand);
  }
  
  console.log(c.purple('Mech Evolve CLI v' + CLI_VERSION));
  console.log(c.cyan('Zero-Setup Code Evolution with AI Agents\\n'));
  
  console.log(c.yellow('Usage:'));
  console.log('  ./mech-evolve <command> [options]\\n');
  
  console.log(c.yellow('Core Commands:'));
  console.log('  ' + c.green('on') + '               Enable evolution tracking');
  console.log('  ' + c.green('off') + '              Disable evolution tracking');
  console.log('  ' + c.green('status') + '           Check evolution status');
  console.log('  ' + c.green('version') + '          Show version information');
  console.log('  ' + c.green('help') + '             Show this help message\\n');
  
  console.log(c.yellow('Agent Management:'));
  console.log('  ' + c.green('agents') + '           List active agents');
  console.log('  ' + c.green('agents list') + '      List agents with details');
  console.log('  ' + c.green('agents add') + '       Add a new agent type');
  console.log('  ' + c.green('agents remove') + '    Remove an agent');
  console.log('  ' + c.green('create') + '           Create agents for this project\\n');
  
  console.log(c.yellow('Configuration:'));
  console.log('  ' + c.green('config') + '           Show current configuration');
  console.log('  ' + c.green('config get') + '       Get a configuration value');
  console.log('  ' + c.green('config set') + '       Set a configuration value');
  console.log('  ' + c.green('reset') + '            Reset to default settings\\n');
  
  console.log(c.yellow('Maintenance:'));
  console.log('  ' + c.green('backup') + '           Create configuration backup');
  console.log('  ' + c.green('restore') + '          Restore from backup');
  console.log('  ' + c.green('logs') + '             View activity logs');
  console.log('  ' + c.green('test') + '             Run diagnostic tests');
  console.log('  ' + c.green('update') + '           Update to latest version\\n');
  
  console.log(c.yellow('Information:'));
  console.log('  ' + c.green('info') + '             Show detailed installation info');
  console.log('  ' + c.green('remove') + '           Completely uninstall mech-evolve\\n');
  
  console.log(c.cyan('For detailed help on a specific command:'));
  console.log('  ./mech-evolve help <command>\\n');
  
  console.log(c.purple('Examples:'));
  console.log('  ./mech-evolve on                  # Enable evolution');
  console.log('  ./mech-evolve config set tier 1   # Set agent tier');
  console.log('  ./mech-evolve logs --tail 10      # Show last 10 log entries');
  console.log('  ./mech-evolve agents list         # List all agents\\n');
}

function showSpecificHelp(command) {
  const helpTexts = {
    on: 'Enable evolution tracking\\n\\nThis activates AI agents to monitor your code changes and provide suggestions.',
    off: 'Disable evolution tracking\\n\\nThis stops AI agents from monitoring your code changes.',
    status: 'Check evolution status\\n\\nShows whether evolution is active, agent count, and service connectivity.',
    agents: 'Agent management commands\\n\\nSubcommands:\\n  list     - Show all agents with details\\n  add      - Add a new agent type\\n  remove   - Remove an agent',
    config: 'Configuration management\\n\\nSubcommands:\\n  get <key>      - Get configuration value\\n  set <key> <value> - Set configuration value\\n  list           - Show all configuration',
    logs: 'View activity logs\\n\\nOptions:\\n  --tail <n>     - Show last n entries\\n  --level <lvl>  - Filter by log level\\n  --since <time> - Show logs since time',
    test: 'Run diagnostic tests\\n\\nTests service connectivity, configuration validity, and agent status.',
    update: 'Update to latest version\\n\\nChecks for and installs the latest version of mech-evolve.',
    backup: 'Create configuration backup\\n\\nSaves current configuration to timestamped backup file.',
    restore: 'Restore from backup\\n\\nUsage: ./mech-evolve restore <backup-file>',
    reset: 'Reset to default settings\\n\\nOptions:\\n  --keep-agents  - Keep agent configuration\\n  --confirm      - Skip confirmation prompt',
    info: 'Show detailed installation information\\n\\nDisplays configuration, file locations, and system status.'
  };
  
  if (helpTexts[command]) {
    console.log(c.yellow(\`Help: \${command}\\n\`));
    console.log(helpTexts[command]);
  } else {
    console.log(c.red(\`No help available for command: \${command}\`));
    console.log('Run \`./mech-evolve help\` for available commands.');
  }
}

function commandOn() {
  configManager.ensureDirectories();
  const config = configManager.resetConfig();
  console.log(c.green('🚀 Evolution ENABLED') + ' - Agents will now track your code changes');
  console.log(c.blue('📋 Application ID:'), getApplicationId());
  configManager.log('info', 'Evolution enabled');
}

function commandOff() {
  const config = configManager.getConfig();
  if (config) {
    config.hooks = {};
    config.agentIntegration.enabled = false;
    configManager.setConfig(config);
  }
  console.log(c.yellow('🛑 Evolution DISABLED') + ' - Agents are no longer tracking changes');
  configManager.log('info', 'Evolution disabled');
}

function commandStatus() {
  const config = configManager.getConfig();
  const enabled = config && config.agentIntegration && config.agentIntegration.enabled;
  
  console.log(enabled ? c.green('🟢 Evolution ACTIVE') : c.red('⚫ Evolution INACTIVE'));
  console.log(c.blue('📋 Application ID:'), getApplicationId());
  
  if (enabled) {
    console.log(c.blue('📁 Claude directory:'), fs.existsSync('.claude') ? c.green('EXISTS') : c.red('NOT FOUND'));
    console.log(c.blue('🔗 Service URL:'), EVOLVE_URL);
    
    // Check service connectivity
    checkServiceConnectivity();
  }
  
  configManager.log('info', 'Status command executed');
}

function commandInfo() {
  console.log(c.purple('Mech Evolve Installation Information\\n'));
  
  const appId = getApplicationId();
  const config = configManager.getConfig();
  const enabled = config && config.agentIntegration && config.agentIntegration.enabled;
  
  console.log(c.yellow('Project Details:'));
  console.log('  Application ID:', c.cyan(appId));
  console.log('  Working Directory:', c.cyan(process.cwd()));
  console.log('  Project Name:', c.cyan(path.basename(process.cwd())));
  
  console.log('\\n' + c.yellow('Configuration:'));
  console.log('  Status:', enabled ? c.green('ACTIVE') : c.red('INACTIVE'));
  console.log('  Config File:', c.cyan(configManager.configPath));
  console.log('  Service URL:', c.cyan(EVOLVE_URL));
  
  console.log('\\n' + c.yellow('File Structure:'));
  const files = [
    '.claude/settings-enhanced.json',
    '.claude/hooks/context-provider.cjs',
    '.claude/hooks/evolve-hook-enhanced.cjs',
    '.claude/hooks/project-id-manager.cjs',
    './mech-evolve'
  ];
  
  files.forEach(file => {
    const exists = fs.existsSync(file);
    console.log('  ' + file + ':', exists ? c.green('EXISTS') : c.red('MISSING'));
  });
  
  if (config) {
    console.log('\\n' + c.yellow('Agent Configuration:'));
    console.log('  Integration Enabled:', config.agentIntegration?.enabled ? c.green('YES') : c.red('NO'));
    console.log('  Context Refresh:', c.cyan((config.agentIntegration?.contextRefreshInterval || 0) / 1000 + 's'));
    console.log('  Cache Timeout:', c.cyan((config.agentIntegration?.cacheTimeout || 0) / 1000 + 's'));
  }
  
  configManager.log('info', 'Info command executed');
}

function commandConfig(args) {
  const subcommand = args[0];
  const config = configManager.getConfig();
  
  if (!subcommand || subcommand === 'list') {
    console.log(c.yellow('Current Configuration:\\n'));
    if (config) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log(c.red('No configuration found. Run \`./mech-evolve on\` to create default config.'));
    }
    return;
  }
  
  if (subcommand === 'get') {
    const key = args[1];
    if (!key) {
      console.log(c.red('Usage: ./mech-evolve config get <key>'));
      return;
    }
    
    const value = getConfigValue(config, key);
    if (value !== undefined) {
      console.log(c.green(key + ':'), c.cyan(JSON.stringify(value)));
    } else {
      console.log(c.red(\`Configuration key '\${key}' not found\`));
    }
    return;
  }
  
  if (subcommand === 'set') {
    const key = args[1];
    const value = args[2];
    if (!key || value === undefined) {
      console.log(c.red('Usage: ./mech-evolve config set <key> <value>'));
      return;
    }
    
    setConfigValue(config || {}, key, value);
    configManager.setConfig(config);
    console.log(c.green(\`Set \${key} = \${value}\`));
    configManager.log('info', \`Configuration updated: \${key} = \${value}\`);
    return;
  }
  
  console.log(c.red('Unknown config subcommand:'), subcommand);
  console.log('Available: list, get <key>, set <key> <value>');
}

function getConfigValue(config, key) {
  const keys = key.split('.');
  let current = config;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

function setConfigValue(config, key, value) {
  const keys = key.split('.');
  let current = config;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }
  
  const finalKey = keys[keys.length - 1];
  // Try to parse as JSON, fall back to string
  try {
    current[finalKey] = JSON.parse(value);
  } catch (e) {
    current[finalKey] = value;
  }
}

function commandReset(args) {
  const keepAgents = args.includes('--keep-agents');
  const confirm = args.includes('--confirm');
  
  if (!confirm) {
    console.log(c.yellow('This will reset all mech-evolve settings to defaults.'));
    if (!keepAgents) {
      console.log(c.yellow('Agent configuration will also be reset.'));
    }
    console.log(c.red('Add --confirm to proceed'));
    return;
  }
  
  // Create backup first
  const backup = configManager.backup();
  if (backup) {
    console.log(c.blue('Created backup:'), backup);
  }
  
  // Reset configuration
  configManager.resetConfig();
  console.log(c.green('✅ Configuration reset to defaults'));
  
  if (!keepAgents) {
    // Clear agent cache
    const cacheDir = '.claude/agent-context/cache';
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir, { recursive: true });
      console.log(c.green('✅ Agent cache cleared'));
    }
  }
  
  configManager.log('info', 'Configuration reset');
}

function commandBackup(args) {
  try {
    const backupFile = configManager.backup();
    if (backupFile) {
      console.log(c.green('✅ Backup created:'), c.cyan(backupFile));
      configManager.log('info', \`Backup created: \${backupFile}\`);
    } else {
      console.log(c.yellow('No configuration to backup'));
    }
  } catch (error) {
    console.log(c.red('❌ Backup failed:'), error.message);
  }
}

function commandRestore(args) {
  const backupFile = args[0];
  if (!backupFile) {
    console.log(c.red('Usage: ./mech-evolve restore <backup-file>'));
    console.log('\\nAvailable backups:');
    
    const backupDir = '.claude/backups';
    if (fs.existsSync(backupDir)) {
      const backups = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
      if (backups.length > 0) {
        backups.forEach(backup => {
          const stat = fs.statSync(path.join(backupDir, backup));
          console.log(\`  \${backup} (\${stat.mtime.toLocaleString()})\`);
        });
      } else {
        console.log(c.yellow('  No backups found'));
      }
    }
    return;
  }
  
  try {
    const fullPath = path.isAbsolute(backupFile) ? backupFile : path.join('.claude/backups', backupFile);
    configManager.restore(fullPath);
    console.log(c.green('✅ Configuration restored from:'), c.cyan(fullPath));
    configManager.log('info', \`Configuration restored from: \${fullPath}\`);
  } catch (error) {
    console.log(c.red('❌ Restore failed:'), error.message);
  }
}

function commandLogs(args) {
  const logFile = path.join(configManager.logsDir, 'mech-evolve.log');
  
  if (!fs.existsSync(logFile)) {
    console.log(c.yellow('No log file found. Logs will be created when commands are executed.'));
    return;
  }
  
  let content = fs.readFileSync(logFile, 'utf-8');
  let lines = content.trim().split('\\n').filter(line => line.trim());
  
  // Parse arguments
  const tailIndex = args.indexOf('--tail');
  if (tailIndex !== -1 && args[tailIndex + 1]) {
    const count = parseInt(args[tailIndex + 1]);
    if (!isNaN(count)) {
      lines = lines.slice(-count);
    }
  }
  
  const levelIndex = args.indexOf('--level');
  if (levelIndex !== -1 && args[levelIndex + 1]) {
    const level = args[levelIndex + 1].toLowerCase();
    lines = lines.filter(line => line.toLowerCase().includes(\`[\${level}]\`));
  }
  
  const sinceIndex = args.indexOf('--since');
  if (sinceIndex !== -1 && args[sinceIndex + 1]) {
    const since = new Date(args[sinceIndex + 1]);
    if (!isNaN(since.getTime())) {
      lines = lines.filter(line => {
        const dateMatch = line.match(/^(\\d{4}-\\d{2}-\\d{2}T[\\d:.]+Z)/);
        if (dateMatch) {
          const logDate = new Date(dateMatch[1]);
          return logDate >= since;
        }
        return false;
      });
    }
  }
  
  if (lines.length === 0) {
    console.log(c.yellow('No log entries match the specified criteria.'));
    return;
  }
  
  console.log(c.yellow(\`Showing \${lines.length} log entries:\\n\`));
  lines.forEach(line => {
    if (line.includes('[ERROR]')) {
      console.log(c.red(line));
    } else if (line.includes('[WARN]')) {
      console.log(c.yellow(line));
    } else if (line.includes('[INFO]')) {
      console.log(c.green(line));
    } else {
      console.log(line);
    }
  });
}

function commandTest() {
  console.log(c.yellow('Running diagnostic tests...\\n'));
  
  let passed = 0;
  let total = 0;
  
  // Test 1: Configuration validity
  total++;
  console.log(c.blue('1. Testing configuration validity...'));
  const config = configManager.getConfig();
  if (config && typeof config === 'object') {
    console.log(c.green('   ✅ Configuration is valid'));
    passed++;
  } else {
    console.log(c.red('   ❌ Configuration is invalid or missing'));
  }
  
  // Test 2: Required files
  total++;
  console.log(c.blue('2. Testing required files...'));
  const requiredFiles = [
    '.claude/hooks/project-id-manager.cjs',
    '.claude/hooks/context-provider.cjs',
    '.claude/hooks/evolve-hook-enhanced.cjs'
  ];
  
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  if (missingFiles.length === 0) {
    console.log(c.green('   ✅ All required files present'));
    passed++;
  } else {
    console.log(c.red(\`   ❌ Missing files: \${missingFiles.join(', ')}\`));
  }
  
  // Test 3: Service connectivity
  total++;
  console.log(c.blue('3. Testing service connectivity...'));
  testServiceConnectivity().then(connected => {
    if (connected) {
      console.log(c.green('   ✅ Service is reachable'));
      passed++;
    } else {
      console.log(c.yellow('   ⚠ Service is not reachable (local mode)'));
    }
    
    // Test 4: Agent system
    total++;
    console.log(c.blue('4. Testing agent system...'));
    const agentsDir = '.claude/agents';
    if (fs.existsSync(agentsDir)) {
      console.log(c.green('   ✅ Agent directory exists'));
      passed++;
    } else {
      console.log(c.yellow('   ⚠ No agents directory (run create command)'));
    }
    
    // Results
    console.log(\`\\n\${c.yellow('Test Results:')}\`);
    console.log(\`  Passed: \${c.green(passed)}/\${total}\`);
    if (passed === total) {
      console.log(c.green('\\n✅ All tests passed! Mech-evolve is working correctly.'));
    } else {
      console.log(c.yellow(\`\\n⚠ \${total - passed} test(s) failed. Some features may not work properly.\`));
    }
    
    configManager.log('info', \`Diagnostic test completed: \${passed}/\${total} passed\`);
  });
}

function commandUpdate() {
  console.log(c.yellow('Checking for updates...'));
  console.log(c.blue('Current version:'), CLI_VERSION);
  
  // In a real implementation, this would check GitHub releases or npm
  console.log(c.yellow('Update checking not yet implemented.'));
  console.log(c.cyan('To manually update:'));
  console.log('  1. Download latest from: https://github.com/mech-ai/mech-evolve');
  console.log('  2. Redeploy the service');
  console.log('  3. Run: ./mech-evolve version');
  
  configManager.log('info', 'Update check requested');
}

function commandAgents(args) {
  const subcommand = args[0];
  
  if (!subcommand || subcommand === 'list') {
    console.log(c.yellow('📊 Checking agents for:'), getApplicationId());
    
    const http = require('http');
    const url = new URL(\`/api/agents/\${getApplicationId()}\`, EVOLVE_URL);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success && result.agents) {
            console.log(\`\\n\${c.green('🤖 ' + result.agents.length + ' agents found:')}\\n\`);
            result.agents.forEach(agent => {
              console.log(c.cyan(agent.name) + c.blue(\` (\${agent.role})\`));
              console.log('  Status:', agent.status === 'active' ? c.green(agent.status) : c.yellow(agent.status));
              console.log('  Tier:', c.purple(agent.tier), '-', agent.priority);
              console.log('  Performance:', c.blue(agent.performance?.suggestionsGenerated || 0), 'suggestions');
              console.log('');
            });
          } else {
            console.log(c.red('❌ No agents found. Create them with:'), c.cyan('./mech-evolve create'));
          }
        } catch (e) {
          console.log(c.red('❌ Failed to fetch agents. Is mech-evolve service running?'));
        }
      });
    }).on('error', () => {
      console.log(c.red('❌ Cannot connect to mech-evolve service at'), EVOLVE_URL);
    });
    return;
  }
  
  if (subcommand === 'add') {
    console.log(c.yellow('Adding custom agents is not yet implemented.'));
    console.log(c.cyan('Use \`./mech-evolve create\` to create standard agents.'));
    return;
  }
  
  if (subcommand === 'remove') {
    console.log(c.yellow('Removing specific agents is not yet implemented.'));
    console.log(c.cyan('Use \`./mech-evolve reset\` to reset all agents.'));
    return;
  }
  
  console.log(c.red('Unknown agents subcommand:'), subcommand);
  console.log('Available: list, add, remove');
}

function commandCreate() {
  console.log(c.blue('🔄 Creating agents for:'), getApplicationId());
  const postData = JSON.stringify({
    applicationId: getApplicationId(),
    projectPath: process.cwd()
  });
  
  const options = {
    hostname: new URL(EVOLVE_URL).hostname,
    port: new URL(EVOLVE_URL).port || 80,
    path: '/api/agents/analyze-project',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };
  
  const req = require('http').request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.success) {
          console.log(c.green(\`✅ Created \${result.agents ? result.agents.length : 0} agents!\`));
          if (result.agents && result.agents.length > 0) {
            console.log('\\n' + c.yellow('Created agents:'));
            result.agents.forEach(agent => {
              console.log(\`  \${c.cyan(agent.name)} - \${agent.purpose}\`);
            });
          }
          configManager.log('info', \`Created \${result.agents ? result.agents.length : 0} agents\`);
        } else {
          console.log(c.red('❌ Failed to create agents:'), result.error);
        }
      } catch (e) {
        console.log(c.red('❌ Invalid response from service'));
      }
    });
  });
  
  req.on('error', () => {
    console.log(c.red('❌ Cannot connect to mech-evolve service'));
  });
  
  req.write(postData);
  req.end();
}

// Uninstall functionality
const uninstallConfig = {
  safeFiles: ['.claude/hooks/context-provider.cjs', '.claude/hooks/evolve-hook-enhanced.cjs', '.claude/hooks/evolve-hook.cjs', '.claude/hooks/project-id-manager.cjs'],
  conditionalFiles: ['.claude/settings-enhanced.json', '.claude/settings.json', '.claude/project.json'],
  safeDirectories: ['.claude/agent-context', '.claude/agents'],
  tempFiles: ['.claude/hook-debug.log']
};

function parseUninstallArgs(args) {
  const options = { force: false, backup: false, dryRun: false, preserveClaude: false, verbose: false };
  args.forEach(arg => {
    switch(arg) {
      case '--force': case '-f': options.force = true; break;
      case '--backup': case '-b': options.backup = true; break;
      case '--dry-run': case '-d': options.dryRun = true; break;
      case '--preserve-claude': options.preserveClaude = true; break;
      case '--verbose': case '-v': options.verbose = true; break;
    }
  });
  return options;
}

function analyzeInstallation() {
  const installation = { isInstalled: false, files: [], directories: [], hasUserData: false };
  if (fs.existsSync('.claude/project.json')) {
    installation.isInstalled = true;
    uninstallConfig.safeFiles.forEach(file => {
      if (fs.existsSync(file)) {
        installation.files.push({ path: file, safe: true, type: 'hook' });
      }
    });
    uninstallConfig.conditionalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        installation.files.push({ path: file, safe: true, type: 'config' });
      }
    });
    uninstallConfig.tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        installation.files.push({ path: file, safe: true, type: 'temp' });
      }
    });
    uninstallConfig.safeDirectories.forEach(dir => {
      if (fs.existsSync(dir)) {
        installation.directories.push({ path: dir, safe: true });
      }
    });
    if (fs.existsSync('./mech-evolve')) {
      installation.files.push({ path: './mech-evolve', safe: true, type: 'cli' });
    }
    if (fs.existsSync('.claude')) {
      const claudeContents = fs.readdirSync('.claude');
      const knownDirs = ['hooks', 'agent-context', 'agents'];
      const knownFiles = ['project.json', 'settings-enhanced.json', 'settings.json', 'hook-debug.log'];
      claudeContents.forEach(item => {
        if (!knownDirs.includes(item) && !knownFiles.includes(item)) {
          installation.hasUserData = true;
        }
      });
    }
  }
  return installation;
}

function executeUninstall(args) {
  const options = parseUninstallArgs(args);
  console.log(c.blue('🔄 Mech-Evolve Uninstaller'));
  console.log(c.blue('📋 Application ID:'), getApplicationId());
  console.log('');
  const installation = analyzeInstallation();
  if (!installation.isInstalled) {
    console.log(c.yellow('⚠️  Mech-evolve is not installed in this project'));
    console.log('   No .claude/project.json found');
    return;
  }
  console.log(c.yellow('📝 Removal Plan:'));
  console.log(\`   Files to remove: \${installation.files.length}\`);
  console.log(\`   Directories to remove: \${installation.directories.length}\`);
  
  if (options.dryRun) {
    console.log('\\n' + c.cyan('🔍 Dry run mode - showing what would be removed'));
    installation.files.forEach(file => {
      console.log(\`Would remove: \${file.path} (\${file.type})\`);
    });
    installation.directories.forEach(dir => {
      console.log(\`Would remove directory: \${dir.path}\`);
    });
    return;
  }
  
  if (!options.force) {
    console.log('\\n' + c.yellow('❓ This will permanently remove mech-evolve from this project.'));
    console.log('   Run with --force to proceed or --dry-run to preview');
    return;
  }
  
  // Proceed with removal
  let removedCount = 0;
  installation.files.forEach(file => {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        removedCount++;
        if (options.verbose) console.log(\`   ✅ Removed: \${file.path}\`);
      }
    } catch (error) {
      console.log(c.red(\`Failed to remove \${file.path}: \${error.message}\`));
    }
  });
  
  installation.directories.reverse().forEach(dir => {
    try {
      if (fs.existsSync(dir.path)) {
        fs.rmSync(dir.path, { recursive: true, force: true });
        removedCount++;
        if (options.verbose) console.log(\`   ✅ Removed directory: \${dir.path}\`);
      }
    } catch (error) {
      console.log(c.red(\`Failed to remove directory \${dir.path}: \${error.message}\`));
    }
  });
  
  console.log('\\n' + c.green('🎉 Mech-evolve successfully uninstalled!'));
  console.log(\`   Removed \${removedCount} items\`);
}

// Helper functions
function checkServiceConnectivity() {
  testServiceConnectivity().then(connected => {
    if (connected) {
      console.log(c.blue('🟢 Service:'), c.green('CONNECTED'));
    } else {
      console.log(c.blue('🔴 Service:'), c.yellow('DISCONNECTED (local mode)'));
    }
  });
}

function testServiceConnectivity() {
  return new Promise((resolve) => {
    const http = require('http');
    const url = new URL('/health', EVOLVE_URL);
    
    const timeout = setTimeout(() => {
      resolve(false);
    }, 5000);
    
    http.get(url, (res) => {
      clearTimeout(timeout);
      resolve(res.statusCode === 200);
    }).on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

// Run the command
handleCommand(command, args).catch(error => {
  console.error(c.red('❌ Unexpected error:'), error.message);
  process.exit(1);
});`;
}
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

step "Installing Enhanced Mech Evolve CLI with Uninstall Support..."
cat > "./mech-evolve" << 'EOFCLI'
${getEnhancedCLIContent()}
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
// Get Sync Status
app.get('/api/sync/status/:projectId', async (req, res) => {
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
    }
    catch (error) {
        logger.error('Error getting sync status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sync status'
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
// Analytics - Trends
app.get('/api/analytics/trends', async (req, res) => {
    try {
        const { period = '30d', projectId } = req.query;
        const startDate = getStartDate(period);
        // Base match condition
        const matchCondition = {
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
    }
    catch (error) {
        logger.error('Error getting trends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get trends'
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
        // Step 3: Generate Claude Code format
        const claudeConfig = claudeFormatter.generateAgentsConfig(createdAgents);
        const claudeAgents = JSON.parse(claudeConfig);
        // Step 4: Save Claude format to .claude/agents.json
        const claudeDir = path.join(process.cwd(), '.claude');
        const claudeAgentsPath = path.join(claudeDir, 'agents.json');
        try {
            if (!fs.existsSync(claudeDir)) {
                fs.mkdirSync(claudeDir, { recursive: true });
            }
            fs.writeFileSync(claudeAgentsPath, JSON.stringify(claudeAgents, null, 2));
            logger.info(`Saved Claude agents config to ${claudeAgentsPath}`);
        }
        catch (saveError) {
            logger.warn('Could not save Claude agents config locally:', saveError);
        }
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
            claudeFormat: claudeAgents,
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
// Get Active Agents for Project in Claude Format
app.get('/api/agents/:applicationId/claude', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const agents = await agentFactory.getActiveAgents(applicationId);
        // Generate Claude Code format
        const claudeConfig = claudeFormatter.generateAgentsConfig(agents);
        const claudeAgents = JSON.parse(claudeConfig);
        res.json(claudeAgents);
    }
    catch (error) {
        logger.error('Error fetching agents in Claude format:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch agents in Claude format'
        });
    }
});
// Delete All Agents for Application
app.delete('/api/agents/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        logger.info(`🗑️ Deleting all agents for application: ${applicationId}`);
        // Delete all agents for this application
        const result = await db.collection('dynamic_agents').deleteMany({
            applicationId
        });
        // Delete evolution tracking data
        await db.collection('evolution_tracking').deleteMany({
            applicationId
        });
        // Delete agent patterns
        await db.collection('agent_patterns').deleteMany({
            applicationId
        });
        // Delete agent memories
        await db.collection('agent_memories').deleteMany({
            applicationId
        });
        // Remove local Claude config if it exists
        const claudeAgentsPath = path.join(process.cwd(), '.claude', 'agents.json');
        if (fs.existsSync(claudeAgentsPath)) {
            const existingConfig = JSON.parse(fs.readFileSync(claudeAgentsPath, 'utf-8'));
            if (existingConfig.projectId === applicationId) {
                fs.unlinkSync(claudeAgentsPath);
                logger.info(`Removed Claude agents config for ${applicationId}`);
            }
        }
        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} agents and all related data`,
            deletedCount: result.deletedCount
        });
    }
    catch (error) {
        logger.error('Error deleting agents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete agents'
        });
    }
});
// Delete Specific Agent
app.delete('/api/agents/:applicationId/:agentId', async (req, res) => {
    try {
        const { applicationId, agentId } = req.params;
        logger.info(`🗑️ Deleting agent ${agentId} for application: ${applicationId}`);
        const result = await db.collection('dynamic_agents').deleteOne({
            applicationId,
            id: agentId
        });
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        res.json({
            success: true,
            message: `Deleted agent ${agentId}`,
            deletedCount: result.deletedCount
        });
    }
    catch (error) {
        logger.error('Error deleting agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete agent'
        });
    }
});
// Reset/Re-install Agents for Application
app.put('/api/agents/:applicationId/reset', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { projectPath = '.' } = req.body;
        logger.info(`♻️ Resetting agents for application: ${applicationId}`);
        // Step 1: Delete existing agents
        await db.collection('dynamic_agents').deleteMany({ applicationId });
        await db.collection('evolution_tracking').deleteMany({ applicationId });
        await db.collection('agent_patterns').deleteMany({ applicationId });
        await db.collection('agent_memories').deleteMany({ applicationId });
        // Step 2: Re-analyze and create new agents
        const analysis = await codebaseAnalyzer.analyzeProject(applicationId, projectPath);
        const createdAgents = await agentFactory.createAgentsFromAnalysis(analysis);
        // Step 3: Generate and save Claude format
        const claudeConfig = claudeFormatter.generateAgentsConfig(createdAgents);
        const claudeAgents = JSON.parse(claudeConfig);
        const claudeDir = path.join(process.cwd(), '.claude');
        const claudeAgentsPath = path.join(claudeDir, 'agents.json');
        if (!fs.existsSync(claudeDir)) {
            fs.mkdirSync(claudeDir, { recursive: true });
        }
        fs.writeFileSync(claudeAgentsPath, JSON.stringify(claudeAgents, null, 2));
        res.json({
            success: true,
            message: `Reset complete. Created ${createdAgents.length} new agents`,
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
            claudeFormat: claudeAgents
        });
    }
    catch (error) {
        logger.error('Error resetting agents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset agents'
        });
    }
});
// Update Agent Status
app.put('/api/agents/:applicationId/:agentId', async (req, res) => {
    try {
        const { applicationId, agentId } = req.params;
        const { status, performance, memory } = req.body;
        const updateData = {};
        if (status)
            updateData.status = status;
        if (performance)
            updateData.performance = performance;
        if (memory)
            updateData.memory = memory;
        updateData.lastActive = new Date();
        const result = await db.collection('dynamic_agents').updateOne({ applicationId, id: agentId }, { $set: updateData });
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'Agent not found'
            });
        }
        res.json({
            success: true,
            message: `Updated agent ${agentId}`,
            updated: result.modifiedCount > 0
        });
    }
    catch (error) {
        logger.error('Error updating agent:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update agent'
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
// Sync Agents to Files (Claude Code Integration)
app.post('/api/agents/:applicationId/sync-to-files', async (req, res) => {
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
    }
    catch (error) {
        logger.error('Error syncing agents to files:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync agents to files'
        });
    }
});
// Generate Claude Context
app.get('/api/agents/:applicationId/claude-context', async (req, res) => {
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
    }
    catch (error) {
        logger.error('Error generating Claude context:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate Claude context'
        });
    }
});
// Helper function to convert DynamicAgent to Agent
function convertDynamicAgentToAgent(dynamicAgent) {
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
async function syncAgentsToFiles(applicationId, agents, projectPath) {
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
    }
    catch (error) {
        logger.error('Error syncing agents to files:', error);
        throw error;
    }
}
function generateAgentMarkdown(agent) {
    const patterns = agent.memory?.patterns?.map(p => `- ${p.pattern}: seen ${p.frequency} times (confidence: ${p.confidence})`).join('\n') || 'No patterns learned yet';
    const recentContext = agent.memory?.recentContext?.length
        ? agent.memory.recentContext.slice(0, 5).map((item) => `- ${item.action || 'Activity'}: ${item.filePath || 'unknown'}`).join('\n')
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
${agent.capabilities?.map((cap) => `- ${cap}`).join('\n') || 'No capabilities defined'}

## Performance
- **Suggestions Generated**: ${agent.performance?.suggestionsGenerated || 0}
- **Success Rate**: ${agent.performance?.successRate || 0}

## Specification
### Analysis Logic
${agent.specification?.analysisLogic || 'No analysis logic defined'}

### Improvement Strategies
${agent.specification?.improvementStrategies?.map((s) => `- ${s}`).join('\n') || 'No strategies defined'}

### Learning Mechanisms
${agent.specification?.learningMechanisms?.map((m) => `- ${m}`).join('\n') || 'No learning mechanisms defined'}

---
*This file is auto-generated and updated by mech-evolve based on agent learning*
*Last updated: ${new Date().toLocaleString()}*
`;
}
function generateClaudeContext(agents) {
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
            const topPattern = agent.memory.patterns.reduce((top, p) => p.frequency > top.frequency ? p : top);
            context += `**Most Common Pattern**: ${topPattern.pattern} (${topPattern.frequency} occurrences)\n`;
        }
        context += `**Capabilities**: ${agent.capabilities?.join(', ') || 'General analysis'}\n`;
        context += `**Priority**: ${agent.priority} (Tier ${agent.tier})\n\n`;
    });
    context += `## Agent Collaboration\n`;
    context += `These agents work together to provide intelligent suggestions. When making code changes, consider their specialized insights and learned patterns from this project.\n\n`;
    const topAgent = activeAgents.reduce((top, agent) => (agent.performance?.suggestionsGenerated || 0) > (top.performance?.suggestionsGenerated || 0) ? agent : top);
    context += `**Most Active Agent**: ${topAgent.name} has provided the most guidance recently.\n\n`;
    // Add recent learnings
    const recentPatterns = activeAgents
        .flatMap(a => a.memory?.patterns || [])
        .filter((p) => p.lastSeen && new Date(p.lastSeen).getTime() > Date.now() - 24 * 60 * 60 * 1000)
        .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    if (recentPatterns.length > 0) {
        context += `## Recent Learning (Last 24 Hours)\n`;
        recentPatterns.slice(0, 3).forEach((pattern) => {
            context += `- **${pattern.pattern}**: observed ${pattern.frequency} times\n`;
        });
        context += `\n`;
    }
    context += `---\n*Agent status updated: ${new Date().toLocaleString()}*`;
    return context;
}
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
        claudeFormatter = new claude_agent_formatter_1.ClaudeAgentFormatter();
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