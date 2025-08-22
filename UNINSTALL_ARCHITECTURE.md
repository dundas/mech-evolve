# Mech-Evolve Uninstall Architecture Design

**Agent**: SystemArchitect  
**Status**: COMPLETE  
**Timestamp**: [2025-08-21 15:50]

## Installation Footprint Analysis

### Complete File Inventory
Based on analysis of test installation and CLI code, mech-evolve creates the following files:

#### 1. CLI Executable
- **File**: `./mech-evolve`
- **Type**: Node.js executable script
- **Purpose**: Main command interface
- **Safety**: SAFE TO REMOVE (mech-evolve specific)

#### 2. Claude Hook System
- **Directory**: `.claude/hooks/`
- **Files**:
  - `context-provider.cjs` - Provides agent context to Claude
  - `evolve-hook-enhanced.cjs` - Main evolution tracking hook
  - `evolve-hook.cjs` - Legacy evolution hook
  - `project-id-manager.cjs` - Manages application ID
- **Safety**: SAFE TO REMOVE (mech-evolve specific)

#### 3. Configuration Files
- **File**: `.claude/settings-enhanced.json` - Hook configurations
- **File**: `.claude/project.json` - Application ID and metadata
- **File**: `.claude/settings.json` - Additional settings
- **Safety**: REQUIRES ANALYSIS (may contain non-mech-evolve data)

#### 4. Agent Context System
- **Directory**: `.claude/agent-context/`
- **Subdirectories**: `cache/`
- **Purpose**: Agent coordination and caching
- **Safety**: SAFE TO REMOVE (mech-evolve specific)

#### 5. Agent Storage
- **Directory**: `.claude/agents/`
- **Purpose**: Individual agent configuration files
- **Safety**: SAFE TO REMOVE (mech-evolve specific)

#### 6. Runtime/Debug Files
- **File**: `.claude/hook-debug.log` - Hook execution logs
- **Purpose**: Debugging and monitoring
- **Safety**: SAFE TO REMOVE (temporary data)

### Pre-Existing File Detection Strategy

#### .claude Directory Analysis
1. **Check Creation Source**: Look for mech-evolve signatures in files
2. **Timestamp Analysis**: Compare file creation times with project.json
3. **Content Analysis**: Scan for mech-evolve specific content
4. **Backup Strategy**: Create backup before any removal

#### Safe Removal Criteria
```javascript
// Pseudocode for safe removal detection
function isSafeToRemove(filePath) {
  if (isMechEvolveSignature(filePath)) return true;
  if (isCreatedAfterInstall(filePath)) return true;
  if (hasNoUserContent(filePath)) return true;
  return false; // Preserve when in doubt
}
```

## Uninstall Command Architecture

### Command Structure
```
./mech-evolve remove [options]

Options:
  --force, -f         Force removal without confirmation
  --backup, -b        Create backup before removal
  --dry-run, -d       Show what would be removed without doing it
  --preserve-claude   Keep .claude directory, only remove mech-evolve files
  --verbose, -v       Detailed output during removal
  --help, -h          Show help information
```

### Implementation Flow

#### Phase 1: Pre-Removal Validation
```
1. Check if mech-evolve is actually installed
   - Verify .claude/project.json exists
   - Check for mech-evolve specific files
   
2. Status verification
   - Ensure evolution is disabled (off state)
   - Check for running processes
   - Validate user permissions
   
3. User confirmation
   - Display removal plan
   - Confirm destructive operation
   - Option to create backup
```

#### Phase 2: Safe Removal Process
```
1. Disable hooks (if not already disabled)
   - Update settings-enhanced.json
   - Ensure no active processes
   
2. Create backup (if requested)
   - Zip .claude directory to .claude-backup-TIMESTAMP.zip
   - Include removal manifest
   
3. Remove files in safe order:
   a) Runtime/cache files first
   b) Agent context and agents directories
   c) Hook files
   d) Configuration files (with content analysis)
   e) CLI executable last
   
4. Clean up empty directories
   - Remove .claude if completely empty
   - Preserve if contains non-mech-evolve files
```

#### Phase 3: Verification and Reporting
```
1. Verify complete removal
   - Check for orphaned files
   - Validate directory cleanup
   
2. Generate removal report
   - List removed files
   - Note preserved files
   - Backup location (if created)
   
3. Final status check
   - Confirm mech-evolve is uninstalled
   - Provide manual cleanup instructions if needed
```

## Safety Mechanisms

### 1. Pre-Removal Checks
```javascript
const preRemovalChecks = [
  'verifyMechEvolveInstallation',
  'checkRunningProcesses', 
  'validatePermissions',
  'analyzeClaudeDirectory',
  'confirmUserIntent'
];
```

### 2. Rollback Capability
- **Backup Creation**: Automatic backup of .claude directory
- **Rollback Command**: `./mech-evolve restore --backup <backup-file>`
- **Partial Failure Recovery**: Resume removal from last successful step

### 3. Error Handling Strategy
```javascript
const errorHandlers = {
  'PERMISSION_DENIED': 'Provide sudo instructions',
  'FILE_IN_USE': 'Guide to stop processes',
  'PARTIAL_REMOVAL': 'Offer manual cleanup steps',
  'BACKUP_FAILED': 'Warn and offer to continue'
};
```

### 4. User Data Preservation
- **Conservative Approach**: When in doubt, preserve files
- **Content Analysis**: Scan for user modifications
- **Granular Options**: Allow selective removal

## Command Implementation Specification

### CLI Integration Points
Based on existing CLI structure in `examples/mech-evolve-cli`:

```javascript
// Add to switch statement around line 193
case 'remove':
case 'uninstall':
  await executeUninstall(process.argv.slice(3));
  break;
```

### Function Signatures
```javascript
async function executeUninstall(options) {
  // Main uninstall orchestration
}

function analyzeInstallation() {
  // Return installation footprint analysis
}

function createRemovalPlan(installation) {
  // Generate safe removal plan
}

function executeRemovalPlan(plan, options) {
  // Execute the removal with safety checks
}

function createBackup(claudeDir, backupPath) {
  // Create backup archive
}

function verifyRemoval(plan) {
  // Verify all files were removed properly
}
```

### Configuration Schema
```javascript
const uninstallConfig = {
  safeFiles: [
    '.claude/hooks/context-provider.cjs',
    '.claude/hooks/evolve-hook-enhanced.cjs',
    '.claude/hooks/evolve-hook.cjs', 
    '.claude/hooks/project-id-manager.cjs'
  ],
  conditionalFiles: [
    '.claude/settings-enhanced.json',
    '.claude/settings.json'
  ],
  safeDirectories: [
    '.claude/agent-context',
    '.claude/agents'
  ],
  backupIgnore: [
    '*.log',
    'cache/*'
  ]
};
```

## Edge Cases and Special Handling

### 1. Partial Installations
- **Scenario**: Installation was interrupted
- **Handling**: Detect partial state and remove what exists
- **Validation**: Don't fail if expected files are missing

### 2. Modified Configurations
- **Scenario**: User modified mech-evolve files
- **Handling**: Detect modifications and warn user
- **Options**: Preserve modified files or force removal

### 3. Permission Issues
- **Scenario**: Insufficient permissions for file removal
- **Handling**: Provide clear error messages and sudo guidance
- **Fallback**: Offer manual removal instructions

### 4. Multiple Projects
- **Scenario**: mech-evolve installed in multiple projects
- **Handling**: Only remove from current project
- **Warning**: Inform about other installations

## Success Criteria Verification

### Functional Tests
- [ ] Fresh installation → removal → verification of clean state
- [ ] Partial installation → removal → graceful handling
- [ ] Permission denied → helpful error message
- [ ] Dry run mode → accurate preview without changes

### Safety Tests  
- [ ] Backup creation → restoration → functionality verification
- [ ] User files preservation → non-mech-evolve files untouched
- [ ] Rollback functionality → complete restoration capability

### User Experience Tests
- [ ] Clear progress indication during removal
- [ ] Helpful error messages for common issues
- [ ] Confirmation prompts prevent accidental removal
- [ ] Help documentation is comprehensive

## Handoff to ImplementationMaster

### Ready for Implementation
This architecture provides:
1. **Complete file inventory** with safety classifications
2. **Detailed removal process** with proper sequencing  
3. **Safety mechanisms** to prevent data loss
4. **Error handling strategy** for common issues
5. **CLI integration points** for seamless addition

### Implementation Priorities
1. **High**: Core removal functionality with safety checks
2. **Medium**: Backup and restore capabilities
3. **Low**: Advanced options like --preserve-claude

### Architecture Sign-off
**SystemArchitect Agent**: Architecture design COMPLETE and ready for implementation.

---
[2025-08-21 15:50] [ARCHITECT] [COMPLETE] - Uninstall architecture design completed with comprehensive safety analysis