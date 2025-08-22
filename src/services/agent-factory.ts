import { Db, Collection } from 'mongodb';
import { AgentSuggestion, CodebaseAnalysis } from './codebase-analyzer';

export interface DynamicAgent {
  id: string;
  applicationId: string;
  name: string;
  role: string;
  purpose: string;
  triggers: string[];
  capabilities: string[];
  priority: 'critical' | 'important' | 'nice-to-have';
  tier: 1 | 2 | 3;
  status: 'active' | 'inactive' | 'learning' | 'error';
  createdAt: Date;
  lastActive: Date;
  performance: {
    suggestionsGenerated: number;
    suggestionsAccepted: number;
    successRate: number;
  };
  memory: AgentMemory;
  specification: AgentSpecification;
}

export interface AgentMemory {
  patterns: PatternMemory[];
  successes: string[];
  failures: string[];
  learnings: string[];
  context: Record<string, any>;
}

export interface PatternMemory {
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
  lastSeen: Date;
}

export interface AgentSpecification {
  analysisLogic: string;
  improvementStrategies: string[];
  communicationProtocols: string[];
  learningMechanisms: string[];
}

export class AgentFactory {
  private db: Db;
  private agentsCollection: Collection<DynamicAgent>;
  private activeAgents: Map<string, DynamicAgent> = new Map();

  constructor(db: Db) {
    this.db = db;
    this.agentsCollection = db.collection('dynamic_agents');
  }

  /**
   * Create agents based on codebase analysis (implements "Magic Prompt" approach)
   */
  async createAgentsFromAnalysis(analysis: CodebaseAnalysis): Promise<DynamicAgent[]> {
    console.log(`🏭 Creating dynamic agents for ${analysis.applicationId}`);
    
    const createdAgents: DynamicAgent[] = [];
    
    // Get existing agents to avoid duplicates
    const existingAgents = await this.getExistingAgents(analysis.applicationId);
    const existingNames = new Set(existingAgents.map(a => a.name));
    
    // Create Tier 1 agents first (critical)
    const tier1Agents = analysis.suggestedAgents.filter(s => s.tier === 1);
    for (const suggestion of tier1Agents) {
      if (!existingNames.has(suggestion.name)) {
        const agent = await this.createAgent(analysis.applicationId, suggestion);
        createdAgents.push(agent);
      }
    }
    
    // Create Tier 2 agents (important) - limit to 3 for now
    const tier2Agents = analysis.suggestedAgents
      .filter(s => s.tier === 2)
      .slice(0, 3);
      
    for (const suggestion of tier2Agents) {
      if (!existingNames.has(suggestion.name)) {
        const agent = await this.createAgent(analysis.applicationId, suggestion);
        createdAgents.push(agent);
      }
    }
    
    // Store agent ecosystem state
    await this.storeAgentEcosystem(analysis.applicationId, createdAgents);
    
    console.log(`✅ Created ${createdAgents.length} dynamic agents`);
    return createdAgents;
  }

  private async createAgent(applicationId: string, suggestion: AgentSuggestion): Promise<DynamicAgent> {
    const agent: DynamicAgent = {
      id: this.generateAgentId(applicationId, suggestion.name),
      applicationId,
      name: suggestion.name,
      role: suggestion.role,
      purpose: suggestion.purpose,
      triggers: suggestion.triggers,
      capabilities: suggestion.capabilities,
      priority: suggestion.priority,
      tier: suggestion.tier,
      status: 'learning', // New agents start in learning mode
      createdAt: new Date(),
      lastActive: new Date(),
      performance: {
        suggestionsGenerated: 0,
        suggestionsAccepted: 0,
        successRate: 0
      },
      memory: {
        patterns: [],
        successes: [],
        failures: [],
        learnings: [],
        context: {}
      },
      specification: this.generateAgentSpecification(suggestion)
    };

    // Store in database
    await this.agentsCollection.insertOne(agent);
    
    // Add to active agents
    this.activeAgents.set(agent.id, agent);
    
    console.log(`🤖 Created agent: ${agent.name} (${agent.role})`);
    return agent;
  }

  private generateAgentSpecification(suggestion: AgentSuggestion): AgentSpecification {
    const specs: Record<string, AgentSpecification> = {
      'CodeQualityGuardian': {
        analysisLogic: 'Analyze code complexity, maintainability, and adherence to standards',
        improvementStrategies: ['linting', 'formatting', 'complexity-reduction', 'best-practices'],
        communicationProtocols: ['broadcast-quality-issues', 'coordinate-with-builders'],
        learningMechanisms: ['pattern-recognition', 'success-tracking', 'failure-analysis']
      },
      'ComponentArchitect': {
        analysisLogic: 'Analyze React/Vue component patterns, props flow, and state management',
        improvementStrategies: ['component-optimization', 'prop-validation', 'state-simplification'],
        communicationProtocols: ['coordinate-with-performance', 'share-patterns'],
        learningMechanisms: ['component-pattern-learning', 'performance-correlation']
      },
      'APIArchitect': {
        analysisLogic: 'Analyze API design, endpoint structure, and data flow patterns',
        improvementStrategies: ['endpoint-optimization', 'middleware-enhancement', 'error-handling'],
        communicationProtocols: ['coordinate-with-security', 'share-api-patterns'],
        learningMechanisms: ['api-pattern-recognition', 'performance-tracking']
      },
      'SecuritySentinel': {
        analysisLogic: 'Scan for security vulnerabilities, auth issues, and data exposure',
        improvementStrategies: ['vulnerability-patching', 'auth-enhancement', 'data-protection'],
        communicationProtocols: ['alert-critical-issues', 'coordinate-with-architects'],
        learningMechanisms: ['threat-pattern-learning', 'security-trend-analysis']
      },
      'PerformanceWatchdog': {
        analysisLogic: 'Monitor performance metrics, bundle size, and optimization opportunities',
        improvementStrategies: ['bundle-optimization', 'lazy-loading', 'caching', 'memoization'],
        communicationProtocols: ['share-performance-data', 'coordinate-with-components'],
        learningMechanisms: ['performance-pattern-recognition', 'optimization-effectiveness']
      }
    };

    // Default specification for unknown agents
    const defaultSpec: AgentSpecification = {
      analysisLogic: `Analyze ${suggestion.role} patterns and identify improvement opportunities`,
      improvementStrategies: suggestion.capabilities,
      communicationProtocols: ['broadcast-findings', 'coordinate-with-relevant-agents'],
      learningMechanisms: ['pattern-recognition', 'feedback-learning', 'success-tracking']
    };

    return specs[suggestion.name] || defaultSpec;
  }

  /**
   * Get active agents for a project
   */
  async getActiveAgents(applicationId: string): Promise<DynamicAgent[]> {
    const agents = await this.agentsCollection
      .find({ applicationId, status: { $in: ['active', 'learning'] } })
      .toArray();
    
    return agents;
  }

  /**
   * Trigger agent analysis for a change event
   */
  async triggerAgentAnalysis(applicationId: string, changeEvent: ChangeEvent): Promise<AgentResponse[]> {
    const activeAgents = await this.getActiveAgents(applicationId);
    const responses: AgentResponse[] = [];
    
    for (const agent of activeAgents) {
      if (this.shouldAgentRespond(agent, changeEvent)) {
        const response = await this.executeAgentAnalysis(agent, changeEvent);
        responses.push(response);
        
        // Update agent performance
        await this.updateAgentPerformance(agent.id, response);
      }
    }
    
    // Agent coordination - let agents share findings
    await this.coordinateAgentResponses(responses);
    
    return responses;
  }

  private shouldAgentRespond(agent: DynamicAgent, changeEvent: ChangeEvent): boolean {
    return agent.triggers.some(trigger => 
      changeEvent.changeType.includes(trigger) || 
      changeEvent.filePath.includes(trigger)
    );
  }

  private async executeAgentAnalysis(agent: DynamicAgent, changeEvent: ChangeEvent): Promise<AgentResponse> {
    const response: AgentResponse = {
      agentId: agent.id,
      agentName: agent.name,
      changeEventId: changeEvent.id,
      analysis: await this.performAnalysis(agent, changeEvent),
      suggestions: await this.generateSuggestions(agent, changeEvent),
      confidence: this.calculateConfidence(agent, changeEvent),
      timestamp: new Date()
    };
    
    // Store agent memory
    await this.updateAgentMemory(agent.id, changeEvent, response);
    
    return response;
  }

  private async performAnalysis(agent: DynamicAgent, changeEvent: ChangeEvent): Promise<string> {
    // This is where the actual AI agent analysis would happen
    // For now, we'll simulate based on agent specifications
    
    const analysisTemplates: Record<string, string> = {
      'CodeQualityGuardian': `Analyzed ${changeEvent.filePath} for code quality issues. Found complexity score: moderate. Recommended: linting fixes.`,
      'ComponentArchitect': `Reviewed component structure in ${changeEvent.filePath}. Props pattern: good. State management: could be optimized.`,
      'APIArchitect': `Examined API endpoint changes in ${changeEvent.filePath}. Route structure: optimal. Error handling: needs improvement.`,
      'SecuritySentinel': `Security scan of ${changeEvent.filePath}. No critical vulnerabilities. Recommend: input validation enhancement.`,
      'PerformanceWatchdog': `Performance analysis of ${changeEvent.filePath}. Bundle impact: minimal. Optimization opportunity: memoization.`
    };
    
    return analysisTemplates[agent.name] || 
      `${agent.name} analyzed ${changeEvent.filePath} for ${agent.role} improvements.`;
  }

  private async generateSuggestions(agent: DynamicAgent, changeEvent: ChangeEvent): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Generate suggestions based on agent capabilities
    agent.capabilities.forEach(capability => {
      suggestions.push({
        type: capability,
        description: `Apply ${capability} to ${changeEvent.filePath}`,
        priority: agent.priority === 'critical' ? 1 : agent.priority === 'important' ? 2 : 3,
        effort: 'low',
        impact: agent.priority === 'critical' ? 'high' : 'medium'
      });
    });
    
    return suggestions.slice(0, 3); // Limit to top 3 suggestions
  }

  private calculateConfidence(agent: DynamicAgent, changeEvent: ChangeEvent): number {
    // Base confidence on agent experience and pattern matching
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on performance history
    if (agent.performance.successRate > 0.8) confidence += 0.3;
    else if (agent.performance.successRate > 0.6) confidence += 0.2;
    
    // Increase confidence if agent has seen similar patterns
    const hasSeenPattern = agent.memory.patterns.some(p => 
      changeEvent.filePath.includes(p.pattern)
    );
    if (hasSeenPattern) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  private async updateAgentMemory(agentId: string, changeEvent: ChangeEvent, response: AgentResponse): Promise<void> {
    const agent = await this.agentsCollection.findOne({ id: agentId });
    if (!agent) return;
    
    // Extract patterns from the change
    const pattern = this.extractPattern(changeEvent);
    
    // Update pattern memory
    const existingPattern = agent.memory.patterns.find(p => p.pattern === pattern);
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastSeen = new Date();
    } else {
      agent.memory.patterns.push({
        pattern,
        frequency: 1,
        confidence: response.confidence,
        examples: [changeEvent.filePath],
        lastSeen: new Date()
      });
    }
    
    // Update context
    agent.memory.context[`last_${changeEvent.changeType}`] = {
      filePath: changeEvent.filePath,
      timestamp: new Date(),
      response: response.analysis
    };
    
    await this.agentsCollection.updateOne(
      { id: agentId },
      { $set: { memory: agent.memory, lastActive: new Date() } }
    );
  }

  private extractPattern(changeEvent: ChangeEvent): string {
    const ext = changeEvent.filePath.split('.').pop() || 'unknown';
    return `${changeEvent.changeType}_${ext}`;
  }

  private async coordinateAgentResponses(responses: AgentResponse[]): Promise<void> {
    // Simple coordination - agents can reference each other's findings
    for (const response of responses) {
      const relatedResponses = responses.filter(r => 
        r.agentId !== response.agentId && 
        r.changeEventId === response.changeEventId
      );
      
      if (relatedResponses.length > 0) {
        response.coordination = {
          relatedAgents: relatedResponses.map(r => r.agentName),
          sharedFindings: relatedResponses.map(r => r.analysis).join('; ')
        };
      }
    }
  }

  private async updateAgentPerformance(agentId: string, response: AgentResponse): Promise<void> {
    await this.agentsCollection.updateOne(
      { id: agentId },
      { 
        $inc: { 'performance.suggestionsGenerated': response.suggestions.length },
        $set: { lastActive: new Date() }
      }
    );
  }

  private async getExistingAgents(applicationId: string): Promise<DynamicAgent[]> {
    return await this.agentsCollection.find({ applicationId }).toArray();
  }

  private generateAgentId(applicationId: string, agentName: string): string {
    return `${applicationId}_${agentName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}_${Date.now()}`;
  }

  private async storeAgentEcosystem(applicationId: string, agents: DynamicAgent[]): Promise<void> {
    const ecosystem = {
      applicationId,
      agentCount: agents.length,
      agentTypes: agents.map(a => ({ name: a.name, role: a.role, tier: a.tier })),
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    await this.db.collection('agent_ecosystems').replaceOne(
      { applicationId },
      ecosystem,
      { upsert: true }
    );
  }
}

// Supporting interfaces
export interface ChangeEvent {
  id: string;
  applicationId: string;
  filePath: string;
  changeType: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  changeEventId: string;
  analysis: string;
  suggestions: Suggestion[];
  confidence: number;
  timestamp: Date;
  coordination?: {
    relatedAgents: string[];
    sharedFindings: string;
  };
}

export interface Suggestion {
  type: string;
  description: string;
  priority: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}