#!/usr/bin/env node
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
const EVOLVE_URL = process.env.MECH_EVOLVE_URL || 'http://evolve.mech.is';
const CLI_VERSION = '2.0.0';
const command = process.argv[2] || 'status';
const args = process.argv.slice(3);

// Color helper functions
function colors() {
  return {
    red: (text) => `\033[0;31m${text}\033[0m`,
    green: (text) => `\033[0;32m${text}\033[0m`,
    yellow: (text) => `\033[1;33m${text}\033[0m`,
    blue: (text) => `\033[0;34m${text}\033[0m`,
    purple: (text) => `\033[0;35m${text}\033[0m`,
    cyan: (text) => `\033[0;36m${text}\033[0m`,
    reset: (text) => `\033[0m${text}\033[0m`
  };
}

// Configuration management
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
const c = colors();

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

// Uninstall configuration
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
  console.log('🔄 Mech-Evolve Uninstaller');
  console.log('📋 Application ID:', getApplicationId());
  console.log('');
  const installation = analyzeInstallation();
  if (!installation.isInstalled) {
    console.log('⚠️  Mech-evolve is not installed in this project');
    console.log('   No .claude/project.json found');
    return;
  }
  console.log('📝 Removal Plan:');
  console.log(`   Files to remove: ${installation.files.length}`);
  console.log(`   Directories to remove: ${installation.directories.length}`);
  
  if (options.dryRun) {
    console.log('\\n🔍 Dry run mode - showing what would be removed');
    installation.files.forEach(file => {
      console.log(`Would remove: ${file.path} (${file.type})`);
    });
    installation.directories.forEach(dir => {
      console.log(`Would remove directory: ${dir.path}`);
    });
    return;
  }
  
  if (!options.force) {
    console.log('\\n❓ This will permanently remove mech-evolve from this project.');
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
      console.log(`Failed to remove ${file.path}: ${error.message}`);
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
      console.log(`Failed to remove directory ${dir.path}: ${error.message}`);
    }
  });
  
  console.log('\\n🎉 Mech-evolve successfully uninstalled!');
  console.log(`   Removed ${removedCount} items`);
}

// Additional command implementations
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
    console.log('\\nAvailable backups:');
    
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
    lines = lines.filter(line => line.toLowerCase().includes(`[${level}]`));
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
  
  console.log(c.yellow(`Showing ${lines.length} log entries:\\n`));
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

switch (command) {
  case 'on':
    ensureClaudeDir();
    fs.writeFileSync('.claude/settings-enhanced.json', JSON.stringify(settings, null, 2));
    console.log('🚀 Evolution ENABLED - Agents will now track your code changes');
    console.log('📋 Application ID:', getApplicationId());
    break;
    
  case 'off':
    if (fs.existsSync('.claude/settings-enhanced.json')) {
      fs.writeFileSync('.claude/settings-enhanced.json', JSON.stringify({hooks: {}}, null, 2));
    }
    console.log('🛑 Evolution DISABLED - Agents are no longer tracking changes');
    break;
    
  case 'status':
    const enabled = fs.existsSync('.claude/settings-enhanced.json') && 
                   fs.readFileSync('.claude/settings-enhanced.json', 'utf-8').includes('evolve-hook');
    console.log(enabled ? '🟢 Evolution ACTIVE' : '⭕ Evolution INACTIVE');
    console.log('📋 Application ID:', getApplicationId());
    
    if (enabled) {
      console.log('📁 Claude directory:', fs.existsSync('.claude') ? 'EXISTS' : 'NOT FOUND');
      console.log('🔗 Service URL:', EVOLVE_URL);
    }
    break;
    
  case 'agents':
    console.log('📊 Checking agents for:', getApplicationId());
    const http = require('http');
    const url = new URL(`/api/agents/${getApplicationId()}`, EVOLVE_URL);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.success && result.agents) {
            console.log(`\\n🤖 ${result.agents.length} agents found:\\n`);
            result.agents.forEach(agent => {
              console.log(`${agent.name} (${agent.role})`);
              console.log(`  Status: ${agent.status}`);
              console.log(`  Tier: ${agent.tier} - ${agent.priority}`);
              console.log('');
            });
          } else {
            console.log('❌ No agents found. Create them with: ./mech-evolve create');
          }
        } catch (e) {
          console.log('❌ Failed to fetch agents. Is mech-evolve service running?');
        }
      });
    }).on('error', () => {
      console.log('❌ Cannot connect to mech-evolve service at', EVOLVE_URL);
    });
    break;
    
  case 'create':
    console.log('🔄 Creating agents for:', getApplicationId());
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
            console.log(`✅ Created ${result.agents ? result.agents.length : 0} agents!`);
          } else {
            console.log('❌ Failed to create agents:', result.error);
          }
        } catch (e) {
          console.log('❌ Invalid response from service');
        }
      });
    });
    
    req.on('error', () => {
      console.log('❌ Cannot connect to mech-evolve service');
    });
    
    req.write(postData);
    req.end();
    break;
    
  case 'remove':
  case 'uninstall':
    executeUninstall(process.argv.slice(3));
    break;
    
  default:
    console.log('Usage: ./mech-evolve [on|off|status|agents|create|remove]');
    console.log('');
    console.log('Commands:');
    console.log('  on      - Enable evolution tracking');
    console.log('  off     - Disable evolution tracking');
    console.log('  status  - Check evolution status');
    console.log('  agents  - List active agents');
    console.log('  create  - Create agents for this project');
    console.log('  remove  - Completely uninstall mech-evolve from this project');
    console.log('');
    console.log('Remove options:');
    console.log('  --force, -f       Force removal without confirmation');
    console.log('  --backup, -b      Create backup before removal');
    console.log('  --dry-run, -d     Show what would be removed');
    console.log('  --verbose, -v     Detailed output during removal');
}