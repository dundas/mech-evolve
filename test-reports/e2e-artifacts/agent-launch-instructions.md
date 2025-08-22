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
