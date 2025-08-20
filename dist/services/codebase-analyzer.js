"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodebaseAnalyzer = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
class CodebaseAnalyzer {
    constructor(db) {
        this.db = db;
    }
    /**
     * The "Magic Prompt" Approach - Analyze codebase and suggest agents
     */
    async analyzeProject(applicationId, projectPath) {
        console.log(`🔍 Analyzing project for dynamic agent creation: ${applicationId}`);
        // Step 1: Basic file structure analysis
        const fileStructure = await this.analyzeFileStructure(projectPath);
        // Step 2: Detect project type and patterns
        const projectType = this.detectProjectType(fileStructure);
        const patterns = this.detectPatterns(fileStructure);
        // Step 3: Apply "Magic Prompt" logic - suggest 10+ agents based on analysis
        const suggestedAgents = await this.suggestAgents(projectType.type, patterns, fileStructure);
        // Step 4: Categorize and prioritize agents
        const categorizedAgents = this.categorizeAgents(suggestedAgents);
        const analysis = {
            applicationId,
            projectType: projectType.type,
            languages: projectType.languages,
            frameworks: projectType.frameworks,
            architecture: projectType.architecture,
            complexity: this.assessComplexity(fileStructure, patterns),
            fileStructure,
            patterns,
            suggestedAgents: categorizedAgents
        };
        // Store analysis for future reference
        await this.storeAnalysis(analysis);
        return analysis;
    }
    async analyzeFileStructure(projectPath) {
        const fileTypes = {};
        const configFiles = [];
        const largestFiles = [];
        let totalFiles = 0;
        let maxDepth = 0;
        const walkDirectory = async (dirPath, depth = 0) => {
            maxDepth = Math.max(maxDepth, depth);
            try {
                const entries = await fs_1.promises.readdir(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path_1.default.join(dirPath, entry.name);
                    if (entry.isDirectory()) {
                        // Skip common directories to ignore
                        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
                            await walkDirectory(fullPath, depth + 1);
                        }
                    }
                    else if (entry.isFile()) {
                        totalFiles++;
                        const ext = path_1.default.extname(entry.name).toLowerCase();
                        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
                        // Detect config files
                        if (this.isConfigFile(entry.name)) {
                            configFiles.push(fullPath);
                        }
                        // Track file sizes
                        try {
                            const stats = await fs_1.promises.stat(fullPath);
                            largestFiles.push({ path: fullPath, size: stats.size });
                        }
                        catch (e) {
                            // Skip files we can't read
                        }
                    }
                }
            }
            catch (e) {
                // Skip directories we can't read
            }
        };
        await walkDirectory(projectPath);
        // Get top 10 largest files
        largestFiles.sort((a, b) => b.size - a.size);
        return {
            totalFiles,
            directoryDepth: maxDepth,
            fileTypes,
            largestFiles: largestFiles.slice(0, 10).map(f => f.path),
            configFiles
        };
    }
    detectProjectType(fileStructure) {
        const { fileTypes, configFiles } = fileStructure;
        const languages = [];
        const frameworks = [];
        let projectType = 'unknown';
        let architecture = 'unknown';
        // Language detection
        if (fileTypes['.ts'] || fileTypes['.tsx'])
            languages.push('typescript');
        if (fileTypes['.js'] || fileTypes['.jsx'])
            languages.push('javascript');
        if (fileTypes['.py'])
            languages.push('python');
        if (fileTypes['.go'])
            languages.push('go');
        if (fileTypes['.rs'])
            languages.push('rust');
        if (fileTypes['.java'])
            languages.push('java');
        if (fileTypes['.php'])
            languages.push('php');
        // Framework detection based on config files
        const configFileNames = configFiles.map(f => path_1.default.basename(f));
        if (configFileNames.includes('package.json')) {
            if (configFileNames.includes('next.config.js'))
                frameworks.push('nextjs');
            if (configFileNames.includes('nuxt.config.js'))
                frameworks.push('nuxt');
            if (fileTypes['.vue'])
                frameworks.push('vue');
            if (fileTypes['.svelte'])
                frameworks.push('svelte');
            if (fileTypes['.tsx'] || fileTypes['.jsx'])
                frameworks.push('react');
        }
        if (configFileNames.includes('requirements.txt') || configFileNames.includes('pyproject.toml')) {
            if (configFileNames.some(f => f.includes('fastapi')))
                frameworks.push('fastapi');
            if (configFileNames.some(f => f.includes('django')))
                frameworks.push('django');
            if (configFileNames.some(f => f.includes('flask')))
                frameworks.push('flask');
        }
        // Project type detection
        if (frameworks.includes('nextjs') || frameworks.includes('react')) {
            projectType = 'frontend-webapp';
            architecture = 'spa';
        }
        else if (frameworks.includes('fastapi') || frameworks.includes('django')) {
            projectType = 'backend-api';
            architecture = 'api';
        }
        else if (languages.includes('typescript') && fileTypes['.ts'] > fileTypes['.tsx']) {
            projectType = 'backend-service';
            architecture = 'service';
        }
        else if (configFileNames.includes('docker-compose.yml')) {
            projectType = 'microservices';
            architecture = 'microservices';
        }
        return { type: projectType, languages, frameworks, architecture };
    }
    detectPatterns(fileStructure) {
        const patterns = [];
        // MVC Pattern
        if (fileStructure.fileTypes['.ts'] && fileStructure.configFiles.some(f => f.includes('controller'))) {
            patterns.push({
                name: 'MVC Architecture',
                confidence: 0.8,
                files: ['controllers/', 'models/', 'views/'],
                description: 'Model-View-Controller pattern detected'
            });
        }
        // Component Architecture (React/Vue)
        if (fileStructure.fileTypes['.tsx'] || fileStructure.fileTypes['.jsx']) {
            patterns.push({
                name: 'Component Architecture',
                confidence: 0.9,
                files: ['components/', 'pages/', 'hooks/'],
                description: 'React/Vue component-based architecture'
            });
        }
        // Microservices Pattern
        if (fileStructure.configFiles.some(f => f.includes('docker'))) {
            patterns.push({
                name: 'Containerized Services',
                confidence: 0.7,
                files: ['Dockerfile', 'docker-compose.yml'],
                description: 'Containerized microservices architecture'
            });
        }
        return patterns;
    }
    /**
     * The core "Magic Prompt" logic - suggest agents based on project analysis
     */
    async suggestAgents(projectType, patterns, fileStructure) {
        const suggestions = [];
        // Base agents that every project needs
        suggestions.push({
            name: 'CodeQualityGuardian',
            role: 'quality-assurance',
            purpose: 'Maintains code quality standards and catches issues',
            triggers: ['file-modify', 'function-add', 'refactor'],
            capabilities: ['linting', 'formatting', 'complexity-analysis'],
            priority: 'critical',
            tier: 1
        });
        // Project-type specific agents
        switch (projectType) {
            case 'frontend-webapp':
                suggestions.push({
                    name: 'ComponentArchitect',
                    role: 'architecture',
                    purpose: 'Optimizes React/Vue component patterns and structure',
                    triggers: ['component-create', 'hook-add', 'state-change'],
                    capabilities: ['component-analysis', 'hook-optimization', 'prop-validation'],
                    priority: 'critical',
                    tier: 1
                }, {
                    name: 'PerformanceWatchdog',
                    role: 'performance',
                    purpose: 'Monitors and optimizes frontend performance',
                    triggers: ['bundle-analysis', 'render-optimization'],
                    capabilities: ['bundle-analysis', 'lazy-loading', 'memoization'],
                    priority: 'important',
                    tier: 2
                });
                break;
            case 'backend-api':
                suggestions.push({
                    name: 'APIArchitect',
                    role: 'architecture',
                    purpose: 'Designs and optimizes API endpoints and structure',
                    triggers: ['endpoint-add', 'middleware-change', 'route-modify'],
                    capabilities: ['api-design', 'middleware-optimization', 'error-handling'],
                    priority: 'critical',
                    tier: 1
                }, {
                    name: 'SecuritySentinel',
                    role: 'security',
                    purpose: 'Identifies and prevents security vulnerabilities',
                    triggers: ['auth-change', 'validation-add', 'data-access'],
                    capabilities: ['vulnerability-scanning', 'auth-analysis', 'input-validation'],
                    priority: 'critical',
                    tier: 1
                });
                break;
            case 'microservices':
                suggestions.push({
                    name: 'ServiceOrchestrator',
                    role: 'orchestration',
                    purpose: 'Manages service communication and dependencies',
                    triggers: ['service-add', 'communication-change', 'config-modify'],
                    capabilities: ['service-discovery', 'load-balancing', 'circuit-breaking'],
                    priority: 'critical',
                    tier: 1
                });
                break;
        }
        // Framework-specific agents
        if (fileStructure.fileTypes['.ts'] || fileStructure.fileTypes['.tsx']) {
            suggestions.push({
                name: 'TypeScriptGuru',
                role: 'language-expert',
                purpose: 'Optimizes TypeScript usage and type safety',
                triggers: ['type-definition', 'interface-change', 'generic-usage'],
                capabilities: ['type-optimization', 'generic-analysis', 'strict-mode'],
                priority: 'important',
                tier: 2
            });
        }
        // Pattern-specific agents
        patterns.forEach(pattern => {
            if (pattern.name === 'Component Architecture') {
                suggestions.push({
                    name: 'ComponentPatternWizard',
                    role: 'pattern-specialist',
                    purpose: 'Enforces component best practices and patterns',
                    triggers: ['component-create', 'props-change', 'state-update'],
                    capabilities: ['pattern-enforcement', 'best-practices', 'refactoring'],
                    priority: 'important',
                    tier: 2
                });
            }
        });
        // Universal helpful agents (tier 3)
        suggestions.push({
            name: 'TestingChampion',
            role: 'testing',
            purpose: 'Ensures comprehensive test coverage',
            triggers: ['function-add', 'feature-complete', 'bug-fix'],
            capabilities: ['test-generation', 'coverage-analysis', 'mocking'],
            priority: 'important',
            tier: 2
        }, {
            name: 'DocumentationScribe',
            role: 'documentation',
            purpose: 'Maintains up-to-date documentation',
            triggers: ['api-change', 'feature-add', 'config-update'],
            capabilities: ['doc-generation', 'api-docs', 'readme-updates'],
            priority: 'nice-to-have',
            tier: 3
        }, {
            name: 'RefactoringMaster',
            role: 'refactoring',
            purpose: 'Identifies and suggests code improvements',
            triggers: ['complexity-threshold', 'duplication-detected', 'smell-analysis'],
            capabilities: ['code-analysis', 'refactoring-suggestions', 'cleanup'],
            priority: 'nice-to-have',
            tier: 3
        });
        return suggestions;
    }
    categorizeAgents(suggestions) {
        // Sort by tier and priority
        return suggestions.sort((a, b) => {
            if (a.tier !== b.tier)
                return a.tier - b.tier;
            const priorityOrder = { 'critical': 0, 'important': 1, 'nice-to-have': 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
    assessComplexity(fileStructure, patterns) {
        let score = 0;
        // File count scoring
        if (fileStructure.totalFiles > 1000)
            score += 3;
        else if (fileStructure.totalFiles > 500)
            score += 2;
        else if (fileStructure.totalFiles > 100)
            score += 1;
        // Directory depth scoring
        if (fileStructure.directoryDepth > 8)
            score += 2;
        else if (fileStructure.directoryDepth > 5)
            score += 1;
        // Pattern complexity
        score += patterns.length;
        // Language diversity
        const languages = Object.keys(fileStructure.fileTypes).length;
        if (languages > 5)
            score += 2;
        else if (languages > 3)
            score += 1;
        if (score >= 8)
            return 'enterprise';
        if (score >= 5)
            return 'complex';
        if (score >= 2)
            return 'moderate';
        return 'simple';
    }
    isConfigFile(filename) {
        const configFiles = [
            'package.json', 'tsconfig.json', 'webpack.config.js', 'next.config.js',
            'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'go.mod',
            'Dockerfile', 'docker-compose.yml', '.env', '.env.local'
        ];
        return configFiles.includes(filename) || filename.startsWith('.') || filename.endsWith('.config.js');
    }
    async storeAnalysis(analysis) {
        await this.db.collection('codebase_analyses').replaceOne({ applicationId: analysis.applicationId }, { ...analysis, analyzedAt: new Date() }, { upsert: true });
    }
}
exports.CodebaseAnalyzer = CodebaseAnalyzer;
//# sourceMappingURL=codebase-analyzer.js.map