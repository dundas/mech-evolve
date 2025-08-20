import { Db } from 'mongodb';
import { CodebaseAnalysis } from './codebase-analyzer';
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
export declare class AgentFactory {
    private db;
    private agentsCollection;
    private activeAgents;
    constructor(db: Db);
    /**
     * Create agents based on codebase analysis (implements "Magic Prompt" approach)
     */
    createAgentsFromAnalysis(analysis: CodebaseAnalysis): Promise<DynamicAgent[]>;
    private createAgent;
    private generateAgentSpecification;
    /**
     * Get active agents for a project
     */
    getActiveAgents(applicationId: string): Promise<DynamicAgent[]>;
    /**
     * Trigger agent analysis for a change event
     */
    triggerAgentAnalysis(applicationId: string, changeEvent: ChangeEvent): Promise<AgentResponse[]>;
    private shouldAgentRespond;
    private executeAgentAnalysis;
    private performAnalysis;
    private generateSuggestions;
    private calculateConfidence;
    private updateAgentMemory;
    private extractPattern;
    private coordinateAgentResponses;
    private updateAgentPerformance;
    private getExistingAgents;
    private generateAgentId;
    private storeAgentEcosystem;
}
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
//# sourceMappingURL=agent-factory.d.ts.map