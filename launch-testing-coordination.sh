#!/bin/bash

# Mech-Evolve E2E Testing Coordination Launcher
# This script coordinates the comprehensive end-to-end testing workflow

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
MEMORY_DIR="$PROJECT_ROOT/memory"
COORDINATION_FILE="$PROJECT_ROOT/E2E_TESTING_COORDINATION.md"
ARTIFACTS_DIR="$PROJECT_ROOT/test-reports/e2e-artifacts"

echo "🚀 Mech-Evolve E2E Testing Coordination Suite"
echo "=============================================="
echo "Project Root: $PROJECT_ROOT"
echo "Coordination File: $COORDINATION_FILE"
echo "Artifacts Directory: $ARTIFACTS_DIR"
echo ""

# Ensure coordination infrastructure exists
if [ ! -f "$COORDINATION_FILE" ]; then
    echo "❌ ERROR: Coordination file not found: $COORDINATION_FILE"
    exit 1
fi

if [ ! -d "$ARTIFACTS_DIR" ]; then
    echo "📁 Creating artifacts directory..."
    mkdir -p "$ARTIFACTS_DIR"
fi

# Check if memory files exist for all agents
REQUIRED_AGENTS=(
    "InstallationTestingSentinel"
    "FunctionalityTestingGuardian"
    "IntegrationTestingMaster"
    "UninstallTestingWarden"
    "RegressionTestingChampion"
)

echo "🔍 Validating agent memory files..."
for agent in "${REQUIRED_AGENTS[@]}"; do
    if [ ! -f "$MEMORY_DIR/${agent}.md" ]; then
        echo "❌ ERROR: Missing memory file for $agent"
        exit 1
    else
        echo "  ✅ $agent memory file found"
    fi
done

echo ""
echo "🎯 Testing Phase Sequence:"
echo "  Phase 1: Installation Testing (30 min)"
echo "  Phase 2: Functionality Testing (45 min)"
echo "  Phase 3: Integration Testing (40 min)"
echo "  Phase 4: Uninstall Testing (35 min)"
echo "  Phase 5: Regression Testing (50 min)"
echo "  Total Estimated: 3.5 hours + coordination"
echo ""

# Create launch instructions
cat > "$ARTIFACTS_DIR/agent-launch-instructions.md" << 'EOF'
# Agent Launch Instructions

## Quick Start

### Option 1: Manual Agent Launch
Open 5 separate terminals and run:

```bash
# Terminal 1 - Installation Testing
claude --memory="memory/InstallationTestingSentinel.md" --project="mech-evolve-e2e-testing"

# Terminal 2 - Functionality Testing  
claude --memory="memory/FunctionalityTestingGuardian.md" --project="mech-evolve-e2e-testing"

# Terminal 3 - Integration Testing
claude --memory="memory/IntegrationTestingMaster.md" --project="mech-evolve-e2e-testing"

# Terminal 4 - Uninstall Testing
claude --memory="memory/UninstallTestingWarden.md" --project="mech-evolve-e2e-testing"

# Terminal 5 - Regression Testing
claude --memory="memory/RegressionTestingChampion.md" --project="mech-evolve-e2e-testing"
```

### Option 2: Sequential Execution
Run agents one at a time following the coordination plan.

## Agent Initialization

Each agent should:
1. Acknowledge their role and responsibilities
2. Review the coordination plan in E2E_TESTING_COORDINATION.md
3. Wait for their phase to begin
4. Update status in the coordination document
5. Execute their testing phase
6. Report results and handoff to next phase

## Coordination Protocol

- Central coordination: E2E_TESTING_COORDINATION.md
- Shared artifacts: test-reports/e2e-artifacts/
- Real-time updates with timestamps
- Issue escalation with severity levels

## Success Criteria

All agents must complete successfully with:
- No CRITICAL issues
- All success gates passed
- Comprehensive test coverage
- Production readiness validation
EOF

echo "📋 Agent launch instructions created: $ARTIFACTS_DIR/agent-launch-instructions.md"
echo ""
echo "🎬 Ready to begin E2E testing coordination!"
echo ""
echo "Next Steps:"
echo "1. Review the coordination plan: $COORDINATION_FILE"
echo "2. Follow launch instructions: $ARTIFACTS_DIR/agent-launch-instructions.md"
echo "3. Launch agents according to phase sequence"
echo "4. Monitor coordination document for real-time updates"
echo ""
echo "🚨 Critical Reminders:"
echo "- Each phase must complete before the next begins"
echo "- All CRITICAL issues must be resolved immediately"
echo "- Preserve test artifacts for analysis"
echo "- Update coordination document with findings"
echo ""
echo "Launch coordination complete! ✨"