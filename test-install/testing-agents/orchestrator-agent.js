#!/usr/bin/env node

/**
 * Central Orchestrator Agent for Mech-Evolve Multi-Agent Testing
 * 
 * This agent coordinates comprehensive testing across specialized testing agents,
 * managing task distribution, progress monitoring, and result aggregation.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class OrchestratorAgent {
  constructor() {
    this.agents = {
      architect: { status: 'pending', progress: 0, results: null },
      builder: { status: 'pending', progress: 0, results: null },
      validator: { status: 'pending', progress: 0, results: null },
      intelligence: { status: 'pending', progress: 0, results: null }
    };
    
    this.testingStreams = {
      infrastructure: { agents: ['architect', 'builder'], priority: 'critical' },
      ai_behavior: { agents: ['intelligence', 'validator'], priority: 'critical' },
      integration: { agents: ['architect', 'builder', 'validator', 'intelligence'], priority: 'high' }
    };
    
    this.startTime = new Date();
    this.statusFile = path.join(__dirname, '../test-results/orchestrator-status.json');
    this.resultsDir = path.join(__dirname, '../test-results');
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async initializeAgent(agentName) {
    console.log(`🚀 Initializing ${agentName} agent...`);
    
    const agentScript = path.join(__dirname, `${agentName}-agent.js`);
    if (!fs.existsSync(agentScript)) {
      throw new Error(`Agent script not found: ${agentScript}`);
    }

    this.agents[agentName].status = 'initializing';
    this.updateStatus();

    return new Promise((resolve, reject) => {
      const agentProcess = spawn('node', [agentScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { 
          ...process.env, 
          AGENT_ROLE: agentName,
          ORCHESTRATOR_MODE: 'true',
          RESULTS_DIR: this.resultsDir
        }
      });

      let output = '';
      let errorOutput = '';

      agentProcess.stdout.on('data', (data) => {
        output += data.toString();
        this.parseAgentProgress(agentName, data.toString());
      });

      agentProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      agentProcess.on('close', (code) => {
        if (code === 0) {
          this.agents[agentName].status = 'completed';
          this.agents[agentName].progress = 1.0;
          this.loadAgentResults(agentName);
          resolve({ success: true, output });
        } else {
          this.agents[agentName].status = 'failed';
          reject(new Error(`Agent ${agentName} failed with code ${code}: ${errorOutput}`));
        }
        this.updateStatus();
      });

      // Start the agent
      this.agents[agentName].status = 'running';
      this.updateStatus();
    });
  }

  parseAgentProgress(agentName, output) {
    // Parse JSON progress updates from agent output
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('{') && line.includes('progress')) {
        try {
          const progressData = JSON.parse(line);
          if (progressData.progress !== undefined) {
            this.agents[agentName].progress = progressData.progress;
            this.updateStatus();
          }
        } catch (e) {
          // Ignore non-JSON lines
        }
      }
    }
  }

  loadAgentResults(agentName) {
    const resultsFile = path.join(this.resultsDir, `${agentName}-results.json`);
    if (fs.existsSync(resultsFile)) {
      try {
        this.agents[agentName].results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
      } catch (e) {
        console.warn(`Failed to load results for ${agentName}: ${e.message}`);
      }
    }
  }

  updateStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      startTime: this.startTime.toISOString(),
      duration: (Date.now() - this.startTime.getTime()) / 1000,
      agents: this.agents,
      overallProgress: this.calculateOverallProgress(),
      currentPhase: this.getCurrentPhase(),
      blockingIssues: this.identifyBlockingIssues()
    };

    fs.writeFileSync(this.statusFile, JSON.stringify(status, null, 2));
  }

  calculateOverallProgress() {
    const totalProgress = Object.values(this.agents).reduce((sum, agent) => sum + agent.progress, 0);
    return totalProgress / Object.keys(this.agents).length;
  }

  getCurrentPhase() {
    const runningAgents = Object.entries(this.agents)
      .filter(([_, agent]) => agent.status === 'running')
      .map(([name, _]) => name);
    
    if (runningAgents.length === 0) {
      const pendingAgents = Object.entries(this.agents)
        .filter(([_, agent]) => agent.status === 'pending')
        .map(([name, _]) => name);
      
      if (pendingAgents.length === 0) {
        return 'completed';
      } else {
        return 'initialization';
      }
    }
    
    return `active: ${runningAgents.join(', ')}`;
  }

  identifyBlockingIssues() {
    const issues = [];
    
    // Check for failed agents
    Object.entries(this.agents).forEach(([name, agent]) => {
      if (agent.status === 'failed') {
        issues.push({
          type: 'agent_failure',
          agent: name,
          severity: 'critical'
        });
      }
    });

    // Check for dependency violations
    if (this.agents.builder.status === 'running' && this.agents.architect.status !== 'completed') {
      issues.push({
        type: 'dependency_violation',
        description: 'Builder agent started before Architect completion',
        severity: 'warning'
      });
    }

    return issues;
  }

  async executeTestingStream(streamName) {
    const stream = this.testingStreams[streamName];
    console.log(`📋 Executing ${streamName} testing stream (${stream.priority} priority)`);
    
    const results = [];
    
    for (const agentName of stream.agents) {
      if (this.agents[agentName].status === 'pending') {
        try {
          const result = await this.initializeAgent(agentName);
          results.push({ agent: agentName, ...result });
        } catch (error) {
          console.error(`❌ Agent ${agentName} failed:`, error.message);
          results.push({ agent: agentName, success: false, error: error.message });
        }
      }
    }
    
    return results;
  }

  async runParallelStreams() {
    console.log('🎯 Starting parallel testing streams...');
    
    // Start critical streams in parallel
    const criticalStreams = Object.entries(this.testingStreams)
      .filter(([_, stream]) => stream.priority === 'critical')
      .map(([name, _]) => name);
    
    const criticalPromises = criticalStreams.map(streamName => 
      this.executeTestingStream(streamName)
    );
    
    const criticalResults = await Promise.all(criticalPromises);
    
    // Run integration tests after critical streams
    const integrationResults = await this.executeTestingStream('integration');
    
    return {
      critical: criticalResults,
      integration: integrationResults
    };
  }

  generateFinalReport() {
    console.log('📊 Generating comprehensive test report...');
    
    const report = {
      summary: {
        testSuite: 'mech-evolve-multi-agent-validation',
        startTime: this.startTime.toISOString(),
        endTime: new Date().toISOString(),
        duration: (Date.now() - this.startTime.getTime()) / 1000,
        overallSuccess: Object.values(this.agents).every(agent => agent.status === 'completed'),
        agentResults: this.agents
      },
      findings: this.aggregateFindings(),
      recommendations: this.generateRecommendations(),
      artifacts: this.collectArtifacts()
    };
    
    const reportFile = path.join(this.resultsDir, 'final-test-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.printSummary(report);
    return report;
  }

  aggregateFindings() {
    const findings = {
      architecture: null,
      implementation: null,
      quality: null,
      ai_behavior: null
    };
    
    Object.entries(this.agents).forEach(([name, agent]) => {
      if (agent.results) {
        switch (name) {
          case 'architect':
            findings.architecture = agent.results;
            break;
          case 'builder':
            findings.implementation = agent.results;
            break;
          case 'validator':
            findings.quality = agent.results;
            break;
          case 'intelligence':
            findings.ai_behavior = agent.results;
            break;
        }
      }
    });
    
    return findings;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze results and generate actionable recommendations
    Object.entries(this.agents).forEach(([name, agent]) => {
      if (agent.results && agent.results.recommendations) {
        recommendations.push(...agent.results.recommendations.map(rec => ({
          ...rec,
          source: name
        })));
      }
    });
    
    return recommendations;
  }

  collectArtifacts() {
    const artifacts = [];
    
    try {
      const files = fs.readdirSync(this.resultsDir);
      files.forEach(file => {
        if (file.endsWith('.json') || file.endsWith('.log') || file.endsWith('.html')) {
          artifacts.push({
            filename: file,
            path: path.join(this.resultsDir, file),
            type: path.extname(file).substring(1)
          });
        }
      });
    } catch (e) {
      console.warn('Failed to collect artifacts:', e.message);
    }
    
    return artifacts;
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 MECH-EVOLVE TESTING COMPLETE');
    console.log('='.repeat(60));
    
    console.log(`⏱️  Duration: ${report.summary.duration.toFixed(2)}s`);
    console.log(`✅ Overall Success: ${report.summary.overallSuccess ? 'PASS' : 'FAIL'}`);
    
    console.log('\n📊 Agent Results:');
    Object.entries(report.summary.agentResults).forEach(([name, agent]) => {
      const status = agent.status === 'completed' ? '✅' : '❌';
      console.log(`   ${status} ${name}: ${agent.status} (${(agent.progress * 100).toFixed(1)}%)`);
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Key Recommendations:');
      report.recommendations.slice(0, 5).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.description} (${rec.source})`);
      });
    }
    
    console.log(`\n📁 Full report: ${path.join(this.resultsDir, 'final-test-report.json')}`);
    console.log('='.repeat(60) + '\n');
  }

  async run() {
    try {
      console.log('🚀 Starting Mech-Evolve Multi-Agent Testing System');
      console.log('📋 Testing comprehensive dynamic agent creation capabilities\n');
      
      // Execute parallel testing streams
      const results = await this.runParallelStreams();
      
      // Generate final report
      const report = this.generateFinalReport();
      
      return report.summary.overallSuccess;
      
    } catch (error) {
      console.error('❌ Orchestrator failed:', error.message);
      return false;
    }
  }
}

// CLI execution
if (require.main === module) {
  const orchestrator = new OrchestratorAgent();
  orchestrator.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = OrchestratorAgent;