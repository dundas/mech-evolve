#!/usr/bin/env node
// Enhanced Mech Evolve CLI with Complete Command Set
// Version 2.0.0 - Production Ready

// Check Node.js version
const nodeVersion = process.versions.node;
const major = parseInt(nodeVersion.split('.')[0]);
if (major < 14) {
  console.error(`❌ Node.js ${nodeVersion} is not supported. Please use Node.js 14 or later.`);
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const EVOLVE_URL = process.env.MECH_EVOLVE_URL || 'https://evolve.mech.is';
const CLI_VERSION = '2.0.0';
const command = process.argv[2] || 'help';
const args = process.argv.slice(3);

// Color helper functions
function colors() {
  return {
    red: (text) => '\x1b[0;31m' + text + '\x1b[0m',
    green: (text) => '\x1b[0;32m' + text + '\x1b[0m',
    yellow: (text) => '\x1b[1;33m' + text + '\x1b[0m',
    blue: (text) => '\x1b[0;34m' + text + '\x1b[0m',
    purple: (text) => '\x1b[0;35m' + text + '\x1b[0m',
    cyan: (text) => '\x1b[0;36m' + text + '\x1b[0m',
    reset: (text) => '\x1b[0m' + text + '\x1b[0m'
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
    const backupFile = path.join(this.backupDir, `settings-${timestamp}.json`);
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
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}\n`;
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
    configManager.log('error', `Command '${command}' failed: ${error.message}`);
    process.exit(1);
  }
}

// Command implementations
function commandVersion() {
  console.log(c.purple('Mech Evolve CLI'));
  console.log(c.cyan(`Version: ${CLI_VERSION}`));
  console.log(c.blue(`Node.js: ${process.version}`));
  console.log(c.yellow(`Platform: ${process.platform} ${process.arch}`));
  console.log(c.green(`Service URL: ${EVOLVE_URL}`));
  
  // Check if we're in a git repo and show project info
  try {
    const gitInfo = execSync('git rev-parse --show-toplevel 2>/dev/null', { encoding: 'utf8' }).trim();
    if (gitInfo) {
      console.log(c.blue(`Project: ${path.basename(gitInfo)}`));
      console.log(c.blue(`Application ID: ${getApplicationId()}`));
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
  console.log(c.cyan('Zero-Setup Code Evolution with AI Agents\n'));
  
  console.log(c.yellow('Usage:'));
  console.log('  ./mech-evolve <command> [options]\n');
  
  console.log(c.yellow('Core Commands:'));
  console.log('  ' + c.green('on') + '               Enable evolution tracking');
  console.log('  ' + c.green('off') + '              Disable evolution tracking');
  console.log('  ' + c.green('status') + '           Check evolution status');
  console.log('  ' + c.green('version') + '          Show version information');
  console.log('  ' + c.green('help') + '             Show this help message\n');
  
  console.log(c.yellow('Agent Management:'));
  console.log('  ' + c.green('agents') + '           List active agents');
  console.log('  ' + c.green('agents list') + '      List agents with details');
  console.log('  ' + c.green('agents add') + '       Add a new agent type');
  console.log('  ' + c.green('agents remove') + '    Remove an agent');
  console.log('  ' + c.green('create') + '           Create agents for this project\n');
  
  console.log(c.yellow('Configuration:'));
  console.log('  ' + c.green('config') + '           Show current configuration');
  console.log('  ' + c.green('config get') + '       Get a configuration value');
  console.log('  ' + c.green('config set') + '       Set a configuration value');
  console.log('  ' + c.green('reset') + '            Reset to default settings\n');
  
  console.log(c.yellow('Maintenance:'));
  console.log('  ' + c.green('backup') + '           Create configuration backup');
  console.log('  ' + c.green('restore') + '          Restore from backup');
  console.log('  ' + c.green('logs') + '             View activity logs');
  console.log('  ' + c.green('test') + '             Run diagnostic tests');
  console.log('  ' + c.green('update') + '           Update to latest version\n');
  
  console.log(c.yellow('Information:'));
  console.log('  ' + c.green('info') + '             Show detailed installation info');
  console.log('  ' + c.green('remove') + '           Completely uninstall mech-evolve\n');
  
  console.log(c.cyan('For detailed help on a specific command:'));
  console.log('  ./mech-evolve help <command>\n');
  
  console.log(c.purple('Examples:'));
  console.log('  ./mech-evolve on                  # Enable evolution');
  console.log('  ./mech-evolve config set tier 1   # Set agent tier');
  console.log('  ./mech-evolve logs --tail 10      # Show last 10 log entries');
  console.log('  ./mech-evolve agents list         # List all agents\n');
}

function showSpecificHelp(command) {
  const helpTexts = {
    on: 'Enable evolution tracking\n\nThis activates AI agents to monitor your code changes and provide suggestions.',
    off: 'Disable evolution tracking\n\nThis stops AI agents from monitoring your code changes.',
    status: 'Check evolution status\n\nShows whether evolution is active, agent count, and service connectivity.',
    agents: 'Agent management commands\n\nSubcommands:\n  list     - Show all agents with details\n  add      - Add a new agent type\n  remove   - Remove an agent',
    config: 'Configuration management\n\nSubcommands:\n  get <key>      - Get configuration value\n  set <key> <value> - Set configuration value\n  list           - Show all configuration',
    logs: 'View activity logs\n\nOptions:\n  --tail <n>     - Show last n entries\n  --level <lvl>  - Filter by log level\n  --since <time> - Show logs since time',
    test: 'Run diagnostic tests\n\nTests service connectivity, configuration validity, and agent status.',
    update: 'Update to latest version\n\nChecks for and installs the latest version of mech-evolve.',
    backup: 'Create configuration backup\n\nSaves current configuration to timestamped backup file.',
    restore: 'Restore from backup\n\nUsage: ./mech-evolve restore <backup-file>',
    reset: 'Reset to default settings\n\nOptions:\n  --keep-agents  - Keep agent configuration\n  --confirm      - Skip confirmation prompt',
    info: 'Show detailed installation information\n\nDisplays configuration, file locations, and system status.'
  };
  
  if (helpTexts[command]) {
    console.log(c.yellow(`Help: ${command}\n`));
    console.log(helpTexts[command]);
  } else {
    console.log(c.red(`No help available for command: ${command}`));
    console.log('Run `./mech-evolve help` for available commands.');
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
  console.log(c.purple('Mech Evolve Installation Information\n'));
  
  const appId = getApplicationId();
  const config = configManager.getConfig();
  const enabled = config && config.agentIntegration && config.agentIntegration.enabled;
  
  console.log(c.yellow('Project Details:'));
  console.log('  Application ID:', c.cyan(appId));
  console.log('  Working Directory:', c.cyan(process.cwd()));
  console.log('  Project Name:', c.cyan(path.basename(process.cwd())));
  
  console.log('\n' + c.yellow('Configuration:'));
  console.log('  Status:', enabled ? c.green('ACTIVE') : c.red('INACTIVE'));
  console.log('  Config File:', c.cyan(configManager.configPath));
  console.log('  Service URL:', c.cyan(EVOLVE_URL));
  
  console.log('\n' + c.yellow('File Structure:'));
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
    console.log('\n' + c.yellow('Agent Configuration:'));
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
    console.log(c.yellow('Current Configuration:\n'));
    if (config) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log(c.red('No configuration found. Run `./mech-evolve on` to create default config.'));
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
      console.log(c.red(`Configuration key '${key}' not found`));
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
    console.log(c.green(`Set ${key} = ${value}`));
    configManager.log('info', `Configuration updated: ${key} = ${value}`);
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
      configManager.log('info', `Backup created: ${backupFile}`);
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
    console.log('\nAvailable backups:');
    
    const backupDir = '.claude/backups';
    if (fs.existsSync(backupDir)) {
      const backups = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
      if (backups.length > 0) {
        backups.forEach(backup => {
          const stat = fs.statSync(path.join(backupDir, backup));
          console.log(`  ${backup} (${stat.mtime.toLocaleString()})`);
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
    configManager.log('info', `Configuration restored from: ${fullPath}`);
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
  let lines = content.trim().split('\n').filter(line => line.trim());
  
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
    lines = lines.filter(line => line.toLowerCase().includes(`[${level}]`));
  }
  
  const sinceIndex = args.indexOf('--since');
  if (sinceIndex !== -1 && args[sinceIndex + 1]) {
    const since = new Date(args[sinceIndex + 1]);
    if (!isNaN(since.getTime())) {
      lines = lines.filter(line => {
        const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)/);
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
  
  console.log(c.yellow(`Showing ${lines.length} log entries:\n`));
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
  console.log(c.yellow('Running diagnostic tests...\n'));
  
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
    console.log(c.red(`   ❌ Missing files: ${missingFiles.join(', ')}`));
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
    console.log(`\n${c.yellow('Test Results:')}`);
    console.log(`  Passed: ${c.green(passed)}/${total}`);
    if (passed === total) {
      console.log(c.green('\n✅ All tests passed! Mech-evolve is working correctly.'));
    } else {
      console.log(c.yellow(`\n⚠ ${total - passed} test(s) failed. Some features may not work properly.`));
    }
    
    configManager.log('info', `Diagnostic test completed: ${passed}/${total} passed`);
  });
}

function commandUpdate() {
  console.log(c.yellow('Checking for updates...'));
  console.log(c.blue('Current version:'), CLI_VERSION);
  
  // In a real implementation, this would check GitHub releases or npm
  console.log(c.yellow('Update checking not yet implemented.'));
  console.log(c.cyan('To manually update:'));
  console.log('  1. Download latest from: https://github.com/mech-ai/mech-evolve');
  console.log('  2. Replace enhanced-cli.js');
  console.log('  3. Run: ./mech-evolve version');
  
  configManager.log('info', 'Update check requested');
}

function commandAgents(args) {
  const subcommand = args[0];
  
  if (!subcommand || subcommand === 'list') {
    console.log(c.yellow('📊 Checking agents for:'), getApplicationId());
    
    const http = require('http');
    const url = new URL(`/api/agents/${getApplicationId()}`, EVOLVE_URL);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success && result.agents) {
            console.log(`\n${c.green('🤖 ' + result.agents.length + ' agents found:')}\n`);
            result.agents.forEach(agent => {
              console.log(c.cyan(agent.name) + c.blue(` (${agent.role})`));
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
    console.log(c.cyan('Use `./mech-evolve create` to create standard agents.'));
    return;
  }
  
  if (subcommand === 'remove') {
    console.log(c.yellow('Removing specific agents is not yet implemented.'));
    console.log(c.cyan('Use `./mech-evolve reset` to reset all agents.'));
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
    port: new URL(EVOLVE_URL).port || 443,
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
          console.log(c.green(`✅ Created ${result.agents ? result.agents.length : 0} agents!`));
          if (result.agents && result.agents.length > 0) {
            console.log('\n' + c.yellow('Created agents:'));
            result.agents.forEach(agent => {
              console.log(`  ${c.cyan(agent.name)} - ${agent.purpose}`);
            });
          }
          configManager.log('info', `Created ${result.agents ? result.agents.length : 0} agents`);
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

// Uninstall functionality (existing code)
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
  console.log(`   Files to remove: ${installation.files.length}`);
  console.log(`   Directories to remove: ${installation.directories.length}`);
  
  if (options.dryRun) {
    console.log('\n' + c.cyan('🔍 Dry run mode - showing what would be removed'));
    installation.files.forEach(file => {
      console.log(`Would remove: ${file.path} (${file.type})`);
    });
    installation.directories.forEach(dir => {
      console.log(`Would remove directory: ${dir.path}`);
    });
    return;
  }
  
  if (!options.force) {
    console.log('\n' + c.yellow('❓ This will permanently remove mech-evolve from this project.'));
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
        if (options.verbose) console.log(`   ✅ Removed: ${file.path}`);
      }
    } catch (error) {
      console.log(c.red(`Failed to remove ${file.path}: ${error.message}`));
    }
  });
  
  installation.directories.reverse().forEach(dir => {
    try {
      if (fs.existsSync(dir.path)) {
        fs.rmSync(dir.path, { recursive: true, force: true });
        removedCount++;
        if (options.verbose) console.log(`   ✅ Removed directory: ${dir.path}`);
      }
    } catch (error) {
      console.log(c.red(`Failed to remove directory ${dir.path}: ${error.message}`));
    }
  });
  
  console.log('\n' + c.green('🎉 Mech-evolve successfully uninstalled!'));
  console.log(`   Removed ${removedCount} items`);
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
});