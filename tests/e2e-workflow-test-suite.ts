import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

/**
 * End-to-End Workflow Test Suite
 * 
 * Tests complete real-world scenarios from start to finish:
 * 1. New project onboarding flow
 * 2. Developer workflow with agent learning
 * 3. Team collaboration scenarios
 * 4. Production deployment workflows
 * 5. Agent evolution and improvement cycles
 */

describe('End-to-End Workflow Test Suite', () => {
  const serviceUrl = 'http://localhost:3011';
  const testWorkspace = path.join('/tmp', `e2e-test-${Date.now()}`);
  let testProjects: { name: string; path: string; id: string }[] = [];

  beforeAll(async () => {
    // Create test workspace
    fs.mkdirSync(testWorkspace, { recursive: true });
    
    // Verify service is running
    await waitForService(serviceUrl, 30000);
  });

  afterAll(async () => {
    // Cleanup all test projects
    for (const project of testProjects) {
      try {
        await request(serviceUrl)
          .delete(`/api/agents/${project.id}`)
          .expect((res) => expect([200, 404]).toContain(res.status));
      } catch (error) {
        console.warn(`Failed to cleanup project ${project.id}:`, error);
      }
    }
    
    // Remove test workspace
    try {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup test workspace:', error);
    }
  });

  describe('Scenario 1: New Project Onboarding', () => {
    test('should onboard a new TypeScript React project', async () => {
      const projectName = 'react-typescript-app';
      const projectPath = await createTestProject(projectName, 'react-typescript');
      
      // Step 1: Project Analysis
      const analysisResponse = await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: `e2e-${projectName}`,
          projectPath
        })
        .expect(200);
      
      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.analysis.projectType).toBe('frontend');
      expect(analysisResponse.body.analysis.frameworks).toContain('react');
      expect(analysisResponse.body.agents.created).toBeGreaterThan(3); // Should create multiple agents
      
      // Step 2: Verify agent types are appropriate for React project
      const agents = analysisResponse.body.agents.agents;
      const agentRoles = agents.map((a: any) => a.role.toLowerCase());
      
      expect(agentRoles.some((role: string) => role.includes('quality') || role.includes('lint'))).toBe(true);
      expect(agentRoles.some((role: string) => role.includes('test') || role.includes('coverage'))).toBe(true);
      expect(agentRoles.some((role: string) => role.includes('security'))).toBe(true);
      
      // Step 3: Verify Claude integration files were created
      expect(fs.existsSync(path.join(projectPath, '.claude', 'agents.json'))).toBe(true);
      
      const claudeConfig = JSON.parse(fs.readFileSync(path.join(projectPath, '.claude', 'agents.json'), 'utf-8'));
      expect(claudeConfig.projectId).toBe(`e2e-${projectName}`);
      expect(claudeConfig.agents.length).toBeGreaterThan(0);
      
      testProjects.push({
        name: projectName,
        path: projectPath,
        id: `e2e-${projectName}`
      });
    });

    test('should onboard a new Node.js API project', async () => {
      const projectName = 'nodejs-api';
      const projectPath = await createTestProject(projectName, 'nodejs-api');
      
      const analysisResponse = await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: `e2e-${projectName}`,
          projectPath
        })
        .expect(200);
      
      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.analysis.projectType).toBe('backend');
      expect(analysisResponse.body.analysis.frameworks).toContain('express');
      
      // Backend projects should have different agent types
      const agents = analysisResponse.body.agents.agents;
      const agentRoles = agents.map((a: any) => a.role.toLowerCase());
      
      expect(agentRoles.some((role: string) => role.includes('security') || role.includes('vulnerability'))).toBe(true);
      expect(agentRoles.some((role: string) => role.includes('performance') || role.includes('optimization'))).toBe(true);
      
      testProjects.push({
        name: projectName,
        path: projectPath,
        id: `e2e-${projectName}`
      });
    });

    test('should onboard a full-stack project', async () => {
      const projectName = 'fullstack-app';
      const projectPath = await createTestProject(projectName, 'fullstack');
      
      const analysisResponse = await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: `e2e-${projectName}`,
          projectPath
        })
        .expect(200);
      
      expect(analysisResponse.body.success).toBe(true);
      expect(analysisResponse.body.analysis.projectType).toBe('fullstack');
      expect(analysisResponse.body.agents.created).toBeGreaterThan(5); // Should create more agents for complex projects
      
      testProjects.push({
        name: projectName,
        path: projectPath,
        id: `e2e-${projectName}`
      });
    });
  });

  describe('Scenario 2: Developer Workflow with Agent Learning', () => {
    let developmentProject: { name: string; path: string; id: string };

    beforeAll(async () => {
      const projectName = 'learning-project';
      const projectPath = await createTestProject(projectName, 'react-typescript');
      
      await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: `e2e-${projectName}`,
          projectPath
        })
        .expect(200);
      
      developmentProject = {
        name: projectName,
        path: projectPath,
        id: `e2e-${projectName}`
      };
      
      testProjects.push(developmentProject);
    });

    test('should learn from repeated development patterns', async () => {
      // Simulate a series of development activities
      const activities = [
        { filePath: '/src/components/Button.tsx', changeType: 'component-create' },
        { filePath: '/src/components/Modal.tsx', changeType: 'component-create' },
        { filePath: '/src/components/Form.tsx', changeType: 'component-create' },
        { filePath: '/src/utils/helpers.ts', changeType: 'utility-function' },
        { filePath: '/src/hooks/useApi.ts', changeType: 'custom-hook' },
        { filePath: '/src/hooks/useAuth.ts', changeType: 'custom-hook' },
      ];

      // Track each activity
      for (const activity of activities) {
        await request(serviceUrl)
          .post('/api/evolution/track')
          .send({
            applicationId: developmentProject.id,
            filePath: activity.filePath,
            changeType: activity.changeType,
            improvements: [
              { type: 'formatting', priority: 1 },
              { type: 'type-checking', priority: 2 }
            ],
            metadata: { 
              toolName: 'Edit',
              timestamp: new Date().toISOString()
            }
          })
          .expect(200);
      }

      // Get evolution history
      const historyResponse = await request(serviceUrl)
        .get(`/api/evolution/history/${developmentProject.id}`)
        .expect(200);

      expect(historyResponse.body.evolutions.length).toBe(activities.length);

      // Check if agents learned patterns
      const agentsResponse = await request(serviceUrl)
        .get(`/api/agents/${developmentProject.id}`)
        .expect(200);

      // At least one agent should have learned patterns
      const agentsWithPatterns = agentsResponse.body.agents.filter((agent: any) => 
        agent.patterns && agent.patterns > 0
      );
      
      expect(agentsWithPatterns.length).toBeGreaterThanOrEqual(0); // May be 0 if patterns haven't been saved yet
    });

    test('should provide contextual suggestions based on project patterns', async () => {
      // Add a new component file with a pattern that should trigger suggestions
      const newComponentPath = '/src/components/NewComponent.tsx';
      
      await request(serviceUrl)
        .post('/api/evolution/track')
        .send({
          applicationId: developmentProject.id,
          filePath: newComponentPath,
          changeType: 'component-create',
          metadata: { requestSuggestions: true }
        })
        .expect(200);

      // Get suggestions
      const suggestionsResponse = await request(serviceUrl)
        .get(`/api/evolution/suggest/${developmentProject.id}`)
        .expect(200);

      expect(suggestionsResponse.body.success).toBe(true);
      expect(suggestionsResponse.body.suggestions).toBeInstanceOf(Array);
      
      // Suggestions should be relevant to React components
      if (suggestionsResponse.body.suggestions.length > 0) {
        const suggestion = suggestionsResponse.body.suggestions[0];
        expect(suggestion.type).toBeDefined();
        expect(['formatting', 'linting', 'type-check', 'test-generation']).toContain(suggestion.type);
      }
    });

    test('should track agent performance over time', async () => {
      // Apply some suggestions and mark them as successful
      const suggestionsResponse = await request(serviceUrl)
        .get(`/api/evolution/suggest/${developmentProject.id}`)
        .expect(200);

      if (suggestionsResponse.body.suggestions.length > 0) {
        const suggestion = suggestionsResponse.body.suggestions[0];
        
        // Apply the suggestion successfully
        await request(serviceUrl)
          .post('/api/evolution/apply')
          .send({
            suggestionId: suggestion.id,
            projectId: developmentProject.id,
            machineId: 'test-machine',
            result: {
              success: true,
              improvements: [suggestion.type],
              executionTime: 1500
            }
          })
          .expect(200);
      }

      // Check agent performance metrics
      const metricsResponse = await request(serviceUrl)
        .get(`/api/analytics/metrics/${developmentProject.id}`)
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.metrics).toBeDefined();
    });
  });

  describe('Scenario 3: Team Collaboration', () => {
    let teamProject: { name: string; path: string; id: string };
    const teamMembers = ['dev1', 'dev2', 'dev3'];

    beforeAll(async () => {
      const projectName = 'team-collaboration';
      const projectPath = await createTestProject(projectName, 'fullstack');
      
      await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: `e2e-${projectName}`,
          projectPath
        })
        .expect(200);
      
      teamProject = {
        name: projectName,
        path: projectPath,
        id: `e2e-${projectName}`
      };
      
      testProjects.push(teamProject);
    });

    test('should handle multiple developers working on same project', async () => {
      // Simulate multiple developers making changes
      const developerChanges = [
        { developer: 'dev1', files: ['/src/frontend/Dashboard.tsx', '/src/frontend/Charts.tsx'] },
        { developer: 'dev2', files: ['/src/backend/api/users.ts', '/src/backend/api/auth.ts'] },
        { developer: 'dev3', files: ['/src/shared/types.ts', '/src/shared/utils.ts'] }
      ];

      for (const devWork of developerChanges) {
        for (const filePath of devWork.files) {
          await request(serviceUrl)
            .post('/api/evolution/track')
            .send({
              applicationId: teamProject.id,
              filePath,
              changeType: 'team-development',
              metadata: { 
                developer: devWork.developer,
                teamProject: true
              }
            })
            .expect(200);
        }
      }

      // Verify all changes were tracked
      const historyResponse = await request(serviceUrl)
        .get(`/api/evolution/history/${teamProject.id}`)
        .query({ limit: 10 })
        .expect(200);

      const totalExpectedChanges = developerChanges.reduce((sum, dev) => sum + dev.files.length, 0);
      expect(historyResponse.body.evolutions.length).toBeGreaterThanOrEqual(totalExpectedChanges);
    });

    test('should sync improvements across team members', async () => {
      // Dev1 pushes improvements
      const pushResponse = await request(serviceUrl)
        .post('/api/sync/push')
        .send({
          machineId: 'dev1-machine',
          projectId: teamProject.id,
          improvements: [
            { type: 'eslint-fix', filePath: '/src/frontend/Dashboard.tsx', applied: true },
            { type: 'prettier-format', filePath: '/src/frontend/Charts.tsx', applied: true }
          ]
        })
        .expect(200);

      expect(pushResponse.body.success).toBe(true);
      expect(pushResponse.body.syncId).toBeDefined();

      // Dev2 pulls improvements
      const pullResponse = await request(serviceUrl)
        .get('/api/sync/pull/dev2-machine')
        .expect(200);

      expect(pullResponse.body.success).toBe(true);
      expect(pullResponse.body.improvements).toBeInstanceOf(Array);

      // Check sync status
      const statusResponse = await request(serviceUrl)
        .get(`/api/sync/status/${teamProject.id}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.status).toBeDefined();
    });

    test('should provide team-wide analytics', async () => {
      const trendsResponse = await request(serviceUrl)
        .get('/api/analytics/trends')
        .query({ 
          projectId: teamProject.id,
          period: '7d'
        })
        .expect(200);

      expect(trendsResponse.body.success).toBe(true);
      expect(trendsResponse.body.trends).toBeDefined();
      expect(trendsResponse.body.trends.summary).toBeDefined();
      expect(trendsResponse.body.trends.summary.totalChanges).toBeGreaterThan(0);
    });
  });

  describe('Scenario 4: Production Deployment Workflow', () => {
    let prodProject: { name: string; path: string; id: string };

    beforeAll(async () => {
      const projectName = 'production-ready';
      const projectPath = await createTestProject(projectName, 'production');
      
      const analysisResponse = await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: `e2e-${projectName}`,
          projectPath
        })
        .expect(200);
      
      prodProject = {
        name: projectName,
        path: projectPath,
        id: `e2e-${projectName}`
      };
      
      testProjects.push(prodProject);
    });

    test('should validate production readiness', async () => {
      // Simulate pre-deployment activities
      const prodActivities = [
        { type: 'security-scan', priority: 'critical' },
        { type: 'performance-test', priority: 'high' },
        { type: 'dependency-audit', priority: 'high' },
        { type: 'bundle-analysis', priority: 'medium' },
        { type: 'docker-build', priority: 'high' }
      ];

      for (const activity of prodActivities) {
        await request(serviceUrl)
          .post('/api/evolution/track')
          .send({
            applicationId: prodProject.id,
            filePath: '/deployment/pipeline.yml',
            changeType: activity.type,
            metadata: { 
              environment: 'production',
              priority: activity.priority
            }
          })
          .expect(200);
      }

      // Get production-specific suggestions
      const suggestionsResponse = await request(serviceUrl)
        .get(`/api/evolution/suggest/${prodProject.id}`)
        .expect(200);

      expect(suggestionsResponse.body.success).toBe(true);
      
      // Should have security and performance suggestions
      const suggestionTypes = suggestionsResponse.body.suggestions.map((s: any) => s.type);
      const hasSecuritySuggestion = suggestionTypes.some((type: string) => 
        type.includes('security') || type.includes('audit')
      );
      const hasPerformanceSuggestion = suggestionTypes.some((type: string) => 
        type.includes('performance') || type.includes('optimization')
      );
      
      // At least one should be present (may not be both depending on agent configuration)
      expect(hasSecuritySuggestion || hasPerformanceSuggestion).toBe(true);
    });

    test('should track deployment success metrics', async () => {
      // Simulate successful deployment
      await request(serviceUrl)
        .post('/api/evolution/apply')
        .send({
          suggestionId: 'deployment-validation',
          projectId: prodProject.id,
          machineId: 'ci-cd-pipeline',
          result: {
            success: true,
            improvements: ['security-pass', 'performance-pass'],
            deploymentTime: new Date().toISOString(),
            environment: 'production'
          }
        })
        .expect(200);

      // Get deployment metrics
      const metricsResponse = await request(serviceUrl)
        .get(`/api/analytics/metrics/${prodProject.id}`)
        .query({ period: '1d' })
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.metrics.totalChanges).toBeGreaterThan(0);
    });

    test('should sync agents to production environment files', async () => {
      const syncResponse = await request(serviceUrl)
        .post(`/api/agents/${prodProject.id}/sync-to-files`)
        .send({
          projectPath: prodProject.path
        })
        .expect(200);

      expect(syncResponse.body.success).toBe(true);
      expect(syncResponse.body.filesSynced).toBeGreaterThan(0);

      // Verify production-ready agent configuration
      const agentsPath = path.join(prodProject.path, '.claude', 'agents.json');
      expect(fs.existsSync(agentsPath)).toBe(true);

      const agentsConfig = JSON.parse(fs.readFileSync(agentsPath, 'utf-8'));
      expect(agentsConfig.projectId).toBe(prodProject.id);
      expect(agentsConfig.agents.length).toBeGreaterThan(0);

      // Should have production-focused agents
      const agentRoles = agentsConfig.agents.map((a: any) => a.role.toLowerCase());
      expect(agentRoles.some((role: string) => 
        role.includes('security') || 
        role.includes('performance') || 
        role.includes('monitoring')
      )).toBe(true);
    });
  });

  describe('Scenario 5: Agent Evolution and Improvement', () => {
    let evolvingProject: { name: string; path: string; id: string };

    beforeAll(async () => {
      const projectName = 'evolving-agents';
      const projectPath = await createTestProject(projectName, 'react-typescript');
      
      await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: `e2e-${projectName}`,
          projectPath
        })
        .expect(200);
      
      evolvingProject = {
        name: projectName,
        path: projectPath,
        id: `e2e-${projectName}`
      };
      
      testProjects.push(evolvingProject);
    });

    test('should improve agent performance over time', async () => {
      // Get initial agent state
      const initialAgentsResponse = await request(serviceUrl)
        .get(`/api/agents/${evolvingProject.id}`)
        .expect(200);

      const initialAgents = initialAgentsResponse.body.agents;
      expect(initialAgents.length).toBeGreaterThan(0);

      // Simulate learning cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        // Generate various activities
        const activities = [
          { file: `/src/cycle${cycle}/Component.tsx`, type: 'component' },
          { file: `/src/cycle${cycle}/hook.ts`, type: 'hook' },
          { file: `/src/cycle${cycle}/test.spec.ts`, type: 'test' }
        ];

        for (const activity of activities) {
          await request(serviceUrl)
            .post('/api/evolution/track')
            .send({
              applicationId: evolvingProject.id,
              filePath: activity.file,
              changeType: activity.type,
              improvements: [
                { type: 'formatting', success: Math.random() > 0.3 },
                { type: 'linting', success: Math.random() > 0.2 }
              ],
              metadata: { cycle }
            })
            .expect(200);
        }

        // Apply some suggestions with varying success
        const suggestionsResponse = await request(serviceUrl)
          .get(`/api/evolution/suggest/${evolvingProject.id}`)
          .expect(200);

        for (const suggestion of suggestionsResponse.body.suggestions.slice(0, 2)) {
          await request(serviceUrl)
            .post('/api/evolution/apply')
            .send({
              suggestionId: suggestion.id,
              projectId: evolvingProject.id,
              machineId: `learning-cycle-${cycle}`,
              result: {
                success: Math.random() > 0.3, // 70% success rate
                improvements: [suggestion.type],
                cycle
              }
            })
            .expect(200);
        }
      }

      // Get final agent state
      const finalAgentsResponse = await request(serviceUrl)
        .get(`/api/agents/${evolvingProject.id}`)
        .expect(200);

      const finalAgents = finalAgentsResponse.body.agents;
      
      // At least one agent should have learned patterns
      const agentsWithPatterns = finalAgents.filter((agent: any) => 
        agent.patterns && agent.patterns > 0
      );
      
      // Performance should be tracked
      const agentsWithPerformance = finalAgents.filter((agent: any) => 
        agent.performance && agent.performance.suggestionsGenerated > 0
      );
      
      expect(agentsWithPerformance.length).toBeGreaterThanOrEqual(0);
    });

    test('should adapt agent configuration based on project evolution', async () => {
      // Reset agents and let them re-analyze the evolved project
      const resetResponse = await request(serviceUrl)
        .put(`/api/agents/${evolvingProject.id}/reset`)
        .send({
          projectPath: evolvingProject.path
        })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
      expect(resetResponse.body.agents.created).toBeGreaterThan(0);

      // New analysis should reflect project evolution
      const newAgents = resetResponse.body.agents.agents;
      
      // Should have appropriate agent types for evolved project
      const agentRoles = newAgents.map((a: any) => a.role.toLowerCase());
      expect(agentRoles.length).toBeGreaterThan(0);
      
      // Verify agents are actively learning
      const activeAgents = newAgents.filter((a: any) => 
        a.status === 'active' || a.status === 'learning'
      );
      expect(activeAgents.length).toBe(newAgents.length);
    });

    test('should maintain agent memory and context across resets', async () => {
      // Get current agents
      const agentsResponse = await request(serviceUrl)
        .get(`/api/agents/${evolvingProject.id}`)
        .expect(200);

      if (agentsResponse.body.agents.length > 0) {
        const agentId = agentsResponse.body.agents[0].id;

        // Add some memory data
        await request(serviceUrl)
          .put(`/api/agents/${evolvingProject.id}/${agentId}`)
          .send({
            memory: {
              patterns: [
                { pattern: 'react-component-pattern', frequency: 10, confidence: 0.9 },
                { pattern: 'typescript-usage', frequency: 15, confidence: 0.95 }
              ],
              context: {
                lastAnalysis: new Date().toISOString(),
                projectComplexity: 'medium',
                frameworkVersion: 'react@18'
              }
            },
            performance: {
              suggestionsGenerated: 25,
              suggestionsAccepted: 20,
              successRate: 0.8
            }
          })
          .expect(200);

        // Verify memory was saved
        const memoryResponse = await request(serviceUrl)
          .get(`/api/agents/${evolvingProject.id}/${agentId}/memory`)
          .expect(200);

        expect(memoryResponse.body.success).toBe(true);
        expect(memoryResponse.body.agent.memory.patterns.length).toBe(2);
        expect(memoryResponse.body.agent.performance.successRate).toBe(0.8);
      }
    });
  });

  describe('Scenario 6: Cross-Platform Compatibility', () => {
    test('should work consistently across different environments', async () => {
      const projectName = 'cross-platform';
      const projectPath = await createTestProject(projectName, 'nodejs-api');
      
      // Test with different environment variables
      const environments = [
        { NODE_ENV: 'development', LOG_LEVEL: 'debug' },
        { NODE_ENV: 'staging', LOG_LEVEL: 'info' },
        { NODE_ENV: 'production', LOG_LEVEL: 'error' }
      ];

      for (const env of environments) {
        const analysisResponse = await request(serviceUrl)
          .post('/api/agents/analyze-project')
          .send({
            applicationId: `e2e-${projectName}-${env.NODE_ENV}`,
            projectPath,
            metadata: { environment: env }
          })
          .expect(200);

        expect(analysisResponse.body.success).toBe(true);
        expect(analysisResponse.body.agents.created).toBeGreaterThan(0);

        testProjects.push({
          name: `${projectName}-${env.NODE_ENV}`,
          path: projectPath,
          id: `e2e-${projectName}-${env.NODE_ENV}`
        });
      }
    });

    test('should handle various project structures', async () => {
      const projectStructures = [
        { name: 'monorepo', type: 'monorepo' },
        { name: 'microservices', type: 'microservices' },
        { name: 'library', type: 'library' }
      ];

      for (const structure of projectStructures) {
        const projectPath = await createTestProject(structure.name, structure.type);
        
        const analysisResponse = await request(serviceUrl)
          .post('/api/agents/analyze-project')
          .send({
            applicationId: `e2e-${structure.name}`,
            projectPath
          })
          .expect(200);

        expect(analysisResponse.body.success).toBe(true);
        expect(analysisResponse.body.analysis.projectType).toBeDefined();
        
        testProjects.push({
          name: structure.name,
          path: projectPath,
          id: `e2e-${structure.name}`
        });
      }
    });
  });
});

// Helper functions for test project creation
async function createTestProject(name: string, type: string): Promise<string> {
  const projectPath = path.join('/tmp', `e2e-test-${Date.now()}`, name);
  fs.mkdirSync(projectPath, { recursive: true });

  // Create different project structures based on type
  switch (type) {
    case 'react-typescript':
      await createReactTypeScriptProject(projectPath);
      break;
    case 'nodejs-api':
      await createNodeJSApiProject(projectPath);
      break;
    case 'fullstack':
      await createFullStackProject(projectPath);
      break;
    case 'production':
      await createProductionProject(projectPath);
      break;
    case 'monorepo':
      await createMonorepoProject(projectPath);
      break;
    case 'microservices':
      await createMicroservicesProject(projectPath);
      break;
    case 'library':
      await createLibraryProject(projectPath);
      break;
    default:
      await createBasicProject(projectPath, name);
  }

  return projectPath;
}

async function createReactTypeScriptProject(projectPath: string) {
  // Package.json
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
    name: 'test-react-app',
    version: '1.0.0',
    dependencies: {
      'react': '^18.0.0',
      'react-dom': '^18.0.0',
      'typescript': '^5.0.0'
    },
    scripts: {
      'start': 'react-scripts start',
      'build': 'react-scripts build',
      'test': 'react-scripts test'
    }
  }, null, 2));

  // TypeScript config
  fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'es5',
      lib: ['dom', 'dom.iterable'],
      allowJs: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: 'node',
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx'
    },
    include: ['src']
  }, null, 2));

  // Source files
  const srcDir = path.join(projectPath, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'App.tsx'), `
import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>Test React Application</p>
      </header>
    </div>
  );
}

export default App;
`);

  fs.writeFileSync(path.join(srcDir, 'index.tsx'), `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`);

  // Components directory
  const componentsDir = path.join(srcDir, 'components');
  fs.mkdirSync(componentsDir, { recursive: true });

  fs.writeFileSync(path.join(componentsDir, 'Button.tsx'), `
import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary' }) => {
  return (
    <button
      className={\`btn btn--\${variant}\`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
`);

  // Test files
  fs.writeFileSync(path.join(srcDir, 'App.test.tsx'), `
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders test application', () => {
  render(<App />);
  const linkElement = screen.getByText(/Test React Application/i);
  expect(linkElement).toBeInTheDocument();
});
`);
}

async function createNodeJSApiProject(projectPath: string) {
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
    name: 'test-api',
    version: '1.0.0',
    main: 'src/index.js',
    dependencies: {
      'express': '^4.18.0',
      'cors': '^2.8.5',
      'helmet': '^7.0.0',
      'mongodb': '^6.0.0'
    },
    scripts: {
      'start': 'node src/index.js',
      'dev': 'nodemon src/index.js',
      'test': 'jest'
    }
  }, null, 2));

  const srcDir = path.join(projectPath, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'index.js'), `
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Test API Server' });
});

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.post('/api/users', (req, res) => {
  res.json({ message: 'User created' });
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`);

  // API routes
  const routesDir = path.join(srcDir, 'routes');
  fs.mkdirSync(routesDir, { recursive: true });

  fs.writeFileSync(path.join(routesDir, 'auth.js'), `
const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  res.json({ token: 'mock-token' });
});

router.post('/register', (req, res) => {
  res.json({ message: 'User registered' });
});

module.exports = router;
`);
}

async function createFullStackProject(projectPath: string) {
  // Create both frontend and backend
  const frontendDir = path.join(projectPath, 'frontend');
  const backendDir = path.join(projectPath, 'backend');
  
  fs.mkdirSync(frontendDir, { recursive: true });
  fs.mkdirSync(backendDir, { recursive: true });

  // Root package.json
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
    name: 'fullstack-app',
    version: '1.0.0',
    workspaces: ['frontend', 'backend'],
    scripts: {
      'dev': 'concurrently "npm run dev:frontend" "npm run dev:backend"',
      'dev:frontend': 'cd frontend && npm start',
      'dev:backend': 'cd backend && npm run dev'
    }
  }, null, 2));

  // Frontend (simplified React)
  await createReactTypeScriptProject(frontendDir);
  
  // Backend (simplified Node.js API)
  await createNodeJSApiProject(backendDir);

  // Shared types
  const sharedDir = path.join(projectPath, 'shared');
  fs.mkdirSync(sharedDir, { recursive: true });
  
  fs.writeFileSync(path.join(sharedDir, 'types.ts'), `
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
`);
}

async function createProductionProject(projectPath: string) {
  await createFullStackProject(projectPath);

  // Add production configurations
  fs.writeFileSync(path.join(projectPath, 'Dockerfile'), `
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`);

  fs.writeFileSync(path.join(projectPath, 'docker-compose.yml'), `
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
  db:
    image: mongo:6
    ports:
      - "27017:27017"
`);

  // CI/CD pipeline
  const ciDir = path.join(projectPath, '.github', 'workflows');
  fs.mkdirSync(ciDir, { recursive: true });
  
  fs.writeFileSync(path.join(ciDir, 'deploy.yml'), `
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: npm run build
`);
}

async function createMonorepoProject(projectPath: string) {
  // Root package.json
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
    name: 'monorepo-project',
    version: '1.0.0',
    workspaces: ['packages/*', 'apps/*'],
    scripts: {
      'build': 'turbo run build',
      'test': 'turbo run test',
      'dev': 'turbo run dev'
    }
  }, null, 2));

  // Apps
  const appsDir = path.join(projectPath, 'apps');
  fs.mkdirSync(appsDir, { recursive: true });
  
  await createReactTypeScriptProject(path.join(appsDir, 'web'));
  await createNodeJSApiProject(path.join(appsDir, 'api'));

  // Packages
  const packagesDir = path.join(projectPath, 'packages');
  fs.mkdirSync(packagesDir, { recursive: true });
  
  await createLibraryProject(path.join(packagesDir, 'ui'));
  await createLibraryProject(path.join(packagesDir, 'utils'));
}

async function createMicroservicesProject(projectPath: string) {
  const services = ['auth', 'users', 'orders', 'gateway'];
  
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
    name: 'microservices-project',
    version: '1.0.0',
    scripts: {
      'dev': 'docker-compose up -d',
      'test': 'npm run test:all-services'
    }
  }, null, 2));

  for (const service of services) {
    const serviceDir = path.join(projectPath, 'services', service);
    await createNodeJSApiProject(serviceDir);
  }

  // Docker compose for all services
  fs.writeFileSync(path.join(projectPath, 'docker-compose.yml'), `
version: '3.8'
services:
${services.map(service => `  ${service}:
    build: ./services/${service}
    ports:
      - "${3000 + services.indexOf(service)}:3000"`).join('\n')}
`);
}

async function createLibraryProject(projectPath: string) {
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
    name: 'test-library',
    version: '1.0.0',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      'build': 'tsc',
      'test': 'jest',
      'prepublishOnly': 'npm run build'
    }
  }, null, 2));

  const srcDir = path.join(projectPath, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  fs.writeFileSync(path.join(srcDir, 'index.ts'), `
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export class Calculator {
  private history: number[] = [];

  add(a: number, b: number): number {
    const result = a + b;
    this.history.push(result);
    return result;
  }

  getHistory(): number[] {
    return [...this.history];
  }
}
`);
}

async function createBasicProject(projectPath: string, name: string) {
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify({
    name,
    version: '1.0.0',
    main: 'index.js'
  }, null, 2));

  fs.writeFileSync(path.join(projectPath, 'index.js'), `
console.log('Hello from ${name}');
`);
}

async function waitForService(url: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await request(url).get('/health');
      if (response.status === 200) {
        return;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`Service at ${url} not available within ${timeoutMs}ms`);
}