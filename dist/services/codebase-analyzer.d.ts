import { Db } from 'mongodb';
export interface CodebaseAnalysis {
    applicationId: string;
    projectType: string;
    languages: string[];
    frameworks: string[];
    architecture: string;
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
    fileStructure: FileStructureAnalysis;
    patterns: DetectedPattern[];
    suggestedAgents: AgentSuggestion[];
}
export interface FileStructureAnalysis {
    totalFiles: number;
    directoryDepth: number;
    fileTypes: Record<string, number>;
    largestFiles: string[];
    configFiles: string[];
}
export interface DetectedPattern {
    name: string;
    confidence: number;
    files: string[];
    description: string;
}
export interface AgentSuggestion {
    name: string;
    role: string;
    purpose: string;
    triggers: string[];
    capabilities: string[];
    priority: 'critical' | 'important' | 'nice-to-have';
    tier: 1 | 2 | 3;
}
export declare class CodebaseAnalyzer {
    private db;
    constructor(db: Db);
    /**
     * The "Magic Prompt" Approach - Analyze codebase and suggest agents
     */
    analyzeProject(applicationId: string, projectPath: string): Promise<CodebaseAnalysis>;
    private analyzeFileStructure;
    private detectProjectType;
    private detectPatterns;
    /**
     * The core "Magic Prompt" logic - suggest agents based on project analysis
     */
    private suggestAgents;
    private categorizeAgents;
    private assessComplexity;
    private isConfigFile;
    private storeAnalysis;
}
//# sourceMappingURL=codebase-analyzer.d.ts.map