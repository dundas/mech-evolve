/**
 * Unit Tests for AgentFactory
 */

import { AgentFactory, DynamicAgent, ChangeEvent, AgentResponse } from '../../src/services/agent-factory';
import { CodebaseAnalysis, AgentSuggestion } from '../../src/services/codebase-analyzer';
import { createTestDb, createTestAgent, createTestChangeEvent, createTestCodebaseAnalysis } from '../setup';
import { Db } from 'mongodb';

describe('AgentFactory', () => {
  let agentFactory: AgentFactory;
  let testDb: Db;

  beforeEach(() => {
    testDb = createTestDb();
    agentFactory = new AgentFactory(testDb);
  });

  describe('createAgentsFromAnalysis', () => {
    it('should create agents from codebase analysis', async () => {
      const analysis = createTestCodebaseAnalysis({
        applicationId: 'test-app',
        suggestedAgents: [
          {
            name: 'CodeQualityGuardian',
            role: 'Code Quality',
            purpose: 'Maintain code standards',
            triggers: ['*.ts', '*.js'],
            capabilities: ['linting', 'formatting'],
            priority: 'critical',
            tier: 1,
            reasoning: 'Essential for code quality'
          },
          {
            name: 'TestingChampion',
            role: 'Testing',
            purpose: 'Ensure test coverage',
            triggers: ['*.test.ts', '*.spec.js'],
            capabilities: ['test-generation', 'coverage-analysis'],
            priority: 'important',
            tier: 2,
            reasoning: 'Important for reliability'
          }
        ]
      });

      const agents = await agentFactory.createAgentsFromAnalysis(analysis);

      expect(agents).toHaveLength(2);
      expect(agents[0].name).toBe('CodeQualityGuardian');
      expect(agents[0].tier).toBe(1);
      expect(agents[0].status).toBe('learning');
      expect(agents[1].name).toBe('TestingChampion');
      expect(agents[1].tier).toBe(2);

      // Verify agents were stored in database
      const storedAgents = await testDb.collection('dynamic_agents').find({}).toArray();
      expect(storedAgents).toHaveLength(2);
    });

    it('should not create duplicate agents', async () => {
      const analysis = createTestCodebaseAnalysis({
        applicationId: 'test-app',
        suggestedAgents: [
          {
            name: 'CodeQualityGuardian',
            role: 'Code Quality',
            purpose: 'Maintain standards',
            triggers: ['*.ts'],
            capabilities: ['linting'],
            priority: 'critical',
            tier: 1,
            reasoning: 'Essential'
          }
        ]
      });

      // Create agents first time
      await agentFactory.createAgentsFromAnalysis(analysis);
      
      // Try to create same agents again
      const secondCreation = await agentFactory.createAgentsFromAnalysis(analysis);
      
      expect(secondCreation).toHaveLength(0);
      
      // Verify only one agent in database
      const storedAgents = await testDb.collection('dynamic_agents').find({}).toArray();
      expect(storedAgents).toHaveLength(1);
    });

    it('should limit Tier 2 agents to 3', async () => {
      const analysis = createTestCodebaseAnalysis({
        suggestedAgents: Array(5).fill(null).map((_, i) => ({
          name: `Agent${i}`,
          role: `Role${i}`,
          purpose: `Purpose${i}`,
          triggers: [`trigger${i}`],
          capabilities: [`capability${i}`],
          priority: 'important',
          tier: 2,
          reasoning: `Reason${i}`
        }))
      });

      const agents = await agentFactory.createAgentsFromAnalysis(analysis);
      
      const tier2Agents = agents.filter(a => a.tier === 2);
      expect(tier2Agents).toHaveLength(3);
    });

    it('should store agent ecosystem state', async () => {
      const analysis = createTestCodebaseAnalysis({
        applicationId: 'test-app'
      });

      await agentFactory.createAgentsFromAnalysis(analysis);

      const ecosystem = await testDb.collection('agent_ecosystems').findOne({
        applicationId: 'test-app'
      });

      expect(ecosystem).toBeTruthy();
      expect(ecosystem?.agentCount).toBeGreaterThan(0);
      expect(ecosystem?.agentTypes).toBeDefined();
    });
  });

  describe('getActiveAgents', () => {
    it('should return only active and learning agents', async () => {
      const agents = [
        createTestAgent({ id: '1', status: 'active' }),
        createTestAgent({ id: '2', status: 'learning' }),
        createTestAgent({ id: '3', status: 'inactive' }),
        createTestAgent({ id: '4', status: 'error' })
      ];

      await testDb.collection('dynamic_agents').insertMany(agents);

      const activeAgents = await agentFactory.getActiveAgents('test-app');
      
      expect(activeAgents).toHaveLength(2);
      expect(activeAgents.map(a => a.status)).toEqual(['active', 'learning']);
    });
  });

  describe('triggerAgentAnalysis', () => {
    it('should trigger analysis for relevant agents', async () => {
      const agent = createTestAgent({
        id: 'test-agent',
        triggers: ['*.ts', 'file-modify'],
        status: 'active'
      });

      await testDb.collection('dynamic_agents').insertOne(agent);

      const changeEvent = createTestChangeEvent({
        filePath: '/src/test.ts',
        changeType: 'file-modify'
      });

      const responses = await agentFactory.triggerAgentAnalysis('test-app', changeEvent);

      expect(responses).toHaveLength(1);
      expect(responses[0].agentId).toBe('test-agent');
      expect(responses[0].analysis).toBeDefined();
      expect(responses[0].suggestions).toBeDefined();
      expect(responses[0].confidence).toBeGreaterThanOrEqual(0);
      expect(responses[0].confidence).toBeLessThanOrEqual(1);
    });

    it('should not trigger for irrelevant changes', async () => {
      const agent = createTestAgent({
        triggers: ['*.py', 'python'],
        status: 'active'
      });

      await testDb.collection('dynamic_agents').insertOne(agent);

      const changeEvent = createTestChangeEvent({
        filePath: '/src/test.ts',
        changeType: 'file-modify'
      });

      const responses = await agentFactory.triggerAgentAnalysis('test-app', changeEvent);

      expect(responses).toHaveLength(0);
    });

    it('should update agent performance metrics', async () => {
      const agent = createTestAgent({
        id: 'perf-test-agent',
        triggers: ['*.ts'],
        status: 'active',
        performance: {
          suggestionsGenerated: 5,
          suggestionsAccepted: 3,
          successRate: 0.6
        }
      });

      await testDb.collection('dynamic_agents').insertOne(agent);

      const changeEvent = createTestChangeEvent({
        filePath: '/src/test.ts'
      });

      await agentFactory.triggerAgentAnalysis('test-app', changeEvent);

      const updatedAgent = await testDb.collection('dynamic_agents').findOne({
        id: 'perf-test-agent'
      });

      expect(updatedAgent?.performance.suggestionsGenerated).toBeGreaterThan(5);
      expect(updatedAgent?.lastActive).toBeDefined();
    });

    it('should coordinate responses between multiple agents', async () => {
      const agents = [
        createTestAgent({
          id: 'agent-1',
          name: 'Agent1',
          triggers: ['*.ts'],
          status: 'active'
        }),
        createTestAgent({
          id: 'agent-2',
          name: 'Agent2',
          triggers: ['*.ts'],
          status: 'active'
        })
      ];

      await testDb.collection('dynamic_agents').insertMany(agents);

      const changeEvent = createTestChangeEvent({
        filePath: '/src/test.ts'
      });

      const responses = await agentFactory.triggerAgentAnalysis('test-app', changeEvent);

      expect(responses).toHaveLength(2);
      
      // Check coordination
      responses.forEach(response => {
        if (response.coordination) {
          expect(response.coordination.relatedAgents).toHaveLength(1);
          expect(response.coordination.sharedFindings).toBeDefined();
        }
      });
    });
  });

  describe('Agent Memory Management', () => {
    it('should update agent memory with patterns', async () => {
      const agent = createTestAgent({
        id: 'memory-test-agent',
        triggers: ['*.ts'],
        status: 'active'
      });

      await testDb.collection('dynamic_agents').insertOne(agent);

      const changeEvent = createTestChangeEvent({
        filePath: '/src/component.ts',
        changeType: 'file-modify'
      });

      await agentFactory.triggerAgentAnalysis('test-app', changeEvent);

      const updatedAgent = await testDb.collection('dynamic_agents').findOne({
        id: 'memory-test-agent'
      });

      expect(updatedAgent?.memory.patterns).toHaveLength(1);
      expect(updatedAgent?.memory.patterns[0].pattern).toBe('file-modify_ts');
      expect(updatedAgent?.memory.patterns[0].frequency).toBe(1);
    });

    it('should increment pattern frequency for repeated patterns', async () => {
      const agent = createTestAgent({
        id: 'pattern-test-agent',
        triggers: ['*.ts'],
        status: 'active',
        memory: {
          patterns: [{
            pattern: 'file-modify_ts',
            frequency: 2,
            confidence: 0.7,
            examples: ['/src/old.ts'],
            lastSeen: new Date('2024-01-01')
          }],
          successes: [],
          failures: [],
          learnings: [],
          context: {}
        }
      });

      await testDb.collection('dynamic_agents').insertOne(agent);

      const changeEvent = createTestChangeEvent({
        filePath: '/src/new.ts',
        changeType: 'file-modify'
      });

      await agentFactory.triggerAgentAnalysis('test-app', changeEvent);

      const updatedAgent = await testDb.collection('dynamic_agents').findOne({
        id: 'pattern-test-agent'
      });

      const pattern = updatedAgent?.memory.patterns.find(p => p.pattern === 'file-modify_ts');
      expect(pattern?.frequency).toBe(3);
      expect(pattern?.lastSeen).not.toEqual(new Date('2024-01-01'));
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate higher confidence for successful agents', async () => {
      const successfulAgent = createTestAgent({
        id: 'successful-agent',
        triggers: ['*.ts'],
        status: 'active',
        performance: {
          suggestionsGenerated: 100,
          suggestionsAccepted: 85,
          successRate: 0.85
        }
      });

      const unsuccessfulAgent = createTestAgent({
        id: 'unsuccessful-agent',
        triggers: ['*.ts'],
        status: 'active',
        performance: {
          suggestionsGenerated: 100,
          suggestionsAccepted: 30,
          successRate: 0.3
        }
      });

      await testDb.collection('dynamic_agents').insertMany([
        successfulAgent,
        unsuccessfulAgent
      ]);

      const changeEvent = createTestChangeEvent({
        filePath: '/src/test.ts'
      });

      const responses = await agentFactory.triggerAgentAnalysis('test-app', changeEvent);

      const successfulResponse = responses.find(r => r.agentId === 'successful-agent');
      const unsuccessfulResponse = responses.find(r => r.agentId === 'unsuccessful-agent');

      expect(successfulResponse?.confidence).toBeGreaterThan(0.7);
      expect(unsuccessfulResponse?.confidence).toBeLessThan(0.6);
    });

    it('should increase confidence for recognized patterns', async () => {
      const agent = createTestAgent({
        id: 'pattern-confident-agent',
        triggers: ['*.ts'],
        status: 'active',
        memory: {
          patterns: [{
            pattern: 'file-modify_ts',
            frequency: 10,
            confidence: 0.9,
            examples: ['/src/file1.ts', '/src/file2.ts'],
            lastSeen: new Date()
          }],
          successes: [],
          failures: [],
          learnings: [],
          context: {}
        }
      });

      await testDb.collection('dynamic_agents').insertOne(agent);

      const changeEvent = createTestChangeEvent({
        filePath: '/src/test.ts',
        changeType: 'file-modify'
      });

      const responses = await agentFactory.triggerAgentAnalysis('test-app', changeEvent);

      expect(responses[0].confidence).toBeGreaterThan(0.6);
    });
  });

  describe('Agent Specifications', () => {
    it('should generate correct specifications for known agents', async () => {
      const analysis = createTestCodebaseAnalysis({
        suggestedAgents: [
          {
            name: 'CodeQualityGuardian',
            role: 'Code Quality',
            purpose: 'Maintain standards',
            triggers: ['*.ts'],
            capabilities: ['linting'],
            priority: 'critical',
            tier: 1,
            reasoning: 'Essential'
          },
          {
            name: 'SecuritySentinel',
            role: 'Security',
            purpose: 'Security scanning',
            triggers: ['*.ts'],
            capabilities: ['scanning'],
            priority: 'critical',
            tier: 1,
            reasoning: 'Security is critical'
          }
        ]
      });

      const agents = await agentFactory.createAgentsFromAnalysis(analysis);

      const qualityAgent = agents.find(a => a.name === 'CodeQualityGuardian');
      const securityAgent = agents.find(a => a.name === 'SecuritySentinel');

      expect(qualityAgent?.specification.analysisLogic).toContain('complexity');
      expect(qualityAgent?.specification.improvementStrategies).toContain('linting');

      expect(securityAgent?.specification.analysisLogic).toContain('vulnerabilities');
      expect(securityAgent?.specification.improvementStrategies).toContain('vulnerability-patching');
    });

    it('should generate default specifications for unknown agents', async () => {
      const analysis = createTestCodebaseAnalysis({
        suggestedAgents: [{
          name: 'CustomAgent',
          role: 'Custom Role',
          purpose: 'Custom Purpose',
          triggers: ['custom'],
          capabilities: ['custom-capability'],
          priority: 'important',
          tier: 2,
          reasoning: 'Custom reasoning'
        }]
      });

      const agents = await agentFactory.createAgentsFromAnalysis(analysis);
      const customAgent = agents[0];

      expect(customAgent.specification.analysisLogic).toContain('Custom Role');
      expect(customAgent.specification.improvementStrategies).toEqual(['custom-capability']);
      expect(customAgent.specification.communicationProtocols).toContain('broadcast-findings');
    });
  });
});