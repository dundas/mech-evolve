/**
 * Unit Tests for ClaudeAgentFormatter
 */

import { ClaudeAgentFormatter, ClaudeCodeAgent } from '../../src/services/claude-agent-formatter';
import { DynamicAgent } from '../../src/services/agent-factory';
import { createTestAgent } from '../setup';

describe('ClaudeAgentFormatter', () => {
  let formatter: ClaudeAgentFormatter;

  beforeEach(() => {
    formatter = new ClaudeAgentFormatter();
  });

  describe('formatForClaudeCode', () => {
    describe('Known Agent Types', () => {
      it('should format CodeQualityGuardian correctly', () => {
        const agent = createTestAgent({
          name: 'CodeQualityGuardian',
          role: 'Code Quality',
          applicationId: 'test-app',
          tier: 1
        });

        const claudeAgent = formatter.formatForClaudeCode(agent);

        expect(claudeAgent.name).toBe('code-quality-guardian');
        expect(claudeAgent.description).toContain('Use PROACTIVELY');
        expect(claudeAgent.description).toContain('code quality');
        expect(claudeAgent.proactive).toBe(true);
        expect(claudeAgent.tools).toContain('Read');
        expect(claudeAgent.tools).toContain('Edit');
        expect(claudeAgent.tools).toContain('Bash');
        expect(claudeAgent.prompt).toContain('Code Quality Guardian');
        expect(claudeAgent.prompt).toContain('test-app');
        expect(claudeAgent.prompt).toContain('Linting & Formatting');
      });

      it('should format TestingChampion correctly', () => {
        const agent = createTestAgent({
          name: 'TestingChampion',
          role: 'Testing',
          applicationId: 'test-app',
          tier: 2
        });

        const claudeAgent = formatter.formatForClaudeCode(agent);

        expect(claudeAgent.name).toBe('testing-champion');
        expect(claudeAgent.description).toContain('Use PROACTIVELY');
        expect(claudeAgent.description).toContain('test coverage');
        expect(claudeAgent.proactive).toBe(true);
        expect(claudeAgent.tools).toContain('Write');
        expect(claudeAgent.tools).toContain('Bash');
        expect(claudeAgent.prompt).toContain('Testing Champion');
        expect(claudeAgent.prompt).toContain('AAA pattern');
      });

      it('should format SecuritySentinel correctly', () => {
        const agent = createTestAgent({
          name: 'SecuritySentinel',
          role: 'Security',
          applicationId: 'secure-app',
          tier: 1
        });

        const claudeAgent = formatter.formatForClaudeCode(agent);

        expect(claudeAgent.name).toBe('security-sentinel');
        expect(claudeAgent.description).toContain('security vulnerabilities');
        expect(claudeAgent.proactive).toBe(true);
        expect(claudeAgent.prompt).toContain('Security Sentinel');
        expect(claudeAgent.prompt).toContain('SQL injection');
        expect(claudeAgent.prompt).toContain('XSS protection');
        expect(claudeAgent.prompt).toContain('secure-app');
      });

      it('should format PerformanceOptimizer correctly', () => {
        const agent = createTestAgent({
          name: 'PerformanceOptimizer',
          role: 'Performance',
          applicationId: 'fast-app',
          tier: 2
        });

        const claudeAgent = formatter.formatForClaudeCode(agent);

        expect(claudeAgent.name).toBe('performance-optimizer');
        expect(claudeAgent.description).toContain('performance');
        expect(claudeAgent.description).toContain('bundle size');
        expect(claudeAgent.proactive).toBe(true);
        expect(claudeAgent.prompt).toContain('Performance Optimizer');
        expect(claudeAgent.prompt).toContain('Bundle Size');
        expect(claudeAgent.prompt).toContain('memoization');
      });

      it('should format DocumentationMaestro correctly', () => {
        const agent = createTestAgent({
          name: 'DocumentationMaestro',
          role: 'Documentation',
          applicationId: 'doc-app',
          tier: 3
        });

        const claudeAgent = formatter.formatForClaudeCode(agent);

        expect(claudeAgent.name).toBe('documentation-maestro');
        expect(claudeAgent.description).toContain('documentation');
        expect(claudeAgent.proactive).toBe(false); // Tier 3, not proactive
        expect(claudeAgent.prompt).toContain('Documentation Maestro');
        expect(claudeAgent.prompt).toContain('JSDoc');
        expect(claudeAgent.prompt).toContain('README');
      });
    });

    describe('Custom Agent Types', () => {
      it('should format custom agents with default template', () => {
        const agent = createTestAgent({
          name: 'Custom Agent',
          role: 'Custom Role',
          purpose: 'Custom monitoring and optimization',
          applicationId: 'custom-app',
          tier: 2,
          capabilities: ['monitoring', 'alerting', 'optimization'],
          triggers: ['*.custom', 'custom-event']
        });

        const claudeAgent = formatter.formatForClaudeCode(agent);

        expect(claudeAgent.name).toBe('custom-agent');
        expect(claudeAgent.description).toContain('Custom monitoring and optimization');
        expect(claudeAgent.description).toContain('Custom Role tasks');
        expect(claudeAgent.proactive).toBe(false); // Tier 2 custom agent
        expect(claudeAgent.tools).toEqual(['Read', 'Edit', 'Grep', 'Bash']);
        expect(claudeAgent.prompt).toContain('Custom Agent');
        expect(claudeAgent.prompt).toContain('custom-app');
        expect(claudeAgent.prompt).toContain('monitoring');
        expect(claudeAgent.prompt).toContain('alerting');
        expect(claudeAgent.prompt).toContain('optimization');
      });

      it('should set proactive based on tier for custom agents', () => {
        const tier1Agent = createTestAgent({
          name: 'Critical Custom',
          tier: 1
        });

        const tier2Agent = createTestAgent({
          name: 'Important Custom',
          tier: 2
        });

        const tier3Agent = createTestAgent({
          name: 'Nice Custom',
          tier: 3
        });

        const claude1 = formatter.formatForClaudeCode(tier1Agent);
        const claude2 = formatter.formatForClaudeCode(tier2Agent);
        const claude3 = formatter.formatForClaudeCode(tier3Agent);

        expect(claude1.proactive).toBe(true);
        expect(claude1.description).toContain('Use PROACTIVELY');
        
        expect(claude2.proactive).toBe(false);
        expect(claude2.description).toContain('Use when requested');
        
        expect(claude3.proactive).toBe(false);
        expect(claude3.description).toContain('Use when requested');
      });
    });

    describe('Agent Name Formatting', () => {
      it('should convert agent names to lowercase-hyphenated format', () => {
        const testCases = [
          { input: 'CamelCaseAgent', expected: 'camelcaseagent' },
          { input: 'Space Separated Agent', expected: 'space-separated-agent' },
          { input: 'Mixed_Under_Score', expected: 'mixed_under_score' },
          { input: 'UPPERCASE', expected: 'uppercase' }
        ];

        testCases.forEach(({ input, expected }) => {
          const agent = createTestAgent({ name: input });
          const claudeAgent = formatter.formatForClaudeCode(agent);
          expect(claudeAgent.name).toBe(expected);
        });
      });
    });

    describe('Prompt Structure', () => {
      it('should include all required sections in prompt', () => {
        const agent = createTestAgent({
          name: 'TestAgent',
          applicationId: 'test-app',
          purpose: 'Test purpose',
          capabilities: ['cap1', 'cap2'],
          triggers: ['trigger1', 'trigger2']
        });

        const claudeAgent = formatter.formatForClaudeCode(agent);
        const prompt = claudeAgent.prompt;

        expect(prompt).toContain('## Your Mission');
        expect(prompt).toContain('## Core Responsibilities');
        expect(prompt).toContain('## Workflow');
        expect(prompt).toContain('## Important Guidelines');
        expect(prompt).toContain('test-app');
        expect(prompt).toContain('Test purpose');
        expect(prompt).toContain('cap1');
        expect(prompt).toContain('cap2');
        expect(prompt).toContain('trigger1');
        expect(prompt).toContain('trigger2');
      });
    });
  });

  describe('generateAgentsConfig', () => {
    it('should generate valid JSON configuration', () => {
      const agents = [
        createTestAgent({
          name: 'Agent1',
          applicationId: 'test-app',
          tier: 1
        }),
        createTestAgent({
          name: 'Agent2',
          applicationId: 'test-app',
          tier: 2
        })
      ];

      const configJson = formatter.generateAgentsConfig(agents);
      const config = JSON.parse(configJson);

      expect(config.version).toBe('1.0');
      expect(config.projectId).toBe('test-app');
      expect(config.agents).toHaveLength(2);
      expect(config.metadata.totalAgents).toBe(2);
      expect(config.metadata.proactiveAgents).toBe(1); // Only tier 1
      expect(config.metadata.generatedBy).toBe('mech-evolve');
      expect(config.metadata.generatedAt).toBeDefined();
    });

    it('should handle empty agent list', () => {
      const configJson = formatter.generateAgentsConfig([]);
      const config = JSON.parse(configJson);

      expect(config.version).toBe('1.0');
      expect(config.projectId).toBe('unknown');
      expect(config.agents).toHaveLength(0);
      expect(config.metadata.totalAgents).toBe(0);
      expect(config.metadata.proactiveAgents).toBe(0);
    });

    it('should include formatted agents in config', () => {
      const agents = [
        createTestAgent({
          name: 'CodeQualityGuardian',
          applicationId: 'test-app',
          tier: 1
        })
      ];

      const configJson = formatter.generateAgentsConfig(agents);
      const config = JSON.parse(configJson);

      expect(config.agents[0].name).toBe('code-quality-guardian');
      expect(config.agents[0].description).toContain('Use PROACTIVELY');
      expect(config.agents[0].proactive).toBe(true);
      expect(config.agents[0].tools).toBeDefined();
      expect(config.agents[0].prompt).toBeDefined();
    });
  });

  describe('generateInitCommands', () => {
    it('should generate Claude Code initialization commands', () => {
      const agents = [
        createTestAgent({
          name: 'CodeQualityGuardian',
          tier: 1
        }),
        createTestAgent({
          name: 'TestingChampion',
          tier: 2
        })
      ];

      const commands = formatter.generateInitCommands(agents);

      expect(commands).toHaveLength(2);
      
      expect(commands[0]).toContain('claude agent create');
      expect(commands[0]).toContain('--name "code-quality-guardian"');
      expect(commands[0]).toContain('--proactive');
      expect(commands[0]).toContain('--tools');
      expect(commands[0]).toContain('--prompt-file');
      
      expect(commands[1]).toContain('--name "testing-champion"');
      expect(commands[1]).toContain('--proactive');
    });

    it('should not include proactive flag for non-proactive agents', () => {
      const agents = [
        createTestAgent({
          name: 'DocumentationMaestro',
          tier: 3
        })
      ];

      const commands = formatter.generateInitCommands(agents);

      expect(commands[0]).toContain('--name "documentation-maestro"');
      expect(commands[0]).not.toContain('--proactive');
    });

    it('should handle agents without tools', () => {
      const agent = createTestAgent({
        name: 'SimpleAgent',
        tier: 1
      });

      // Mock formatter to return agent without tools
      const claudeAgent = formatter.formatForClaudeCode(agent);
      delete (claudeAgent as any).tools;

      const commands = formatter.generateInitCommands([agent]);

      expect(commands[0]).not.toContain('--tools ""');
    });
  });

  describe('Edge Cases', () => {
    it('should handle agents with empty capabilities', () => {
      const agent = createTestAgent({
        name: 'EmptyAgent',
        capabilities: [],
        triggers: []
      });

      const claudeAgent = formatter.formatForClaudeCode(agent);

      expect(claudeAgent.prompt).toBeDefined();
      expect(claudeAgent.prompt).not.toContain('undefined');
    });

    it('should handle agents with special characters in names', () => {
      const agent = createTestAgent({
        name: 'Agent@#$%^&*()',
        applicationId: 'test-app'
      });

      const claudeAgent = formatter.formatForClaudeCode(agent);

      expect(claudeAgent.name).toMatch(/^[a-z0-9-]+$/);
    });

    it('should handle very long agent purposes', () => {
      const longPurpose = 'A'.repeat(500);
      const agent = createTestAgent({
        purpose: longPurpose
      });

      const claudeAgent = formatter.formatForClaudeCode(agent);

      expect(claudeAgent.description).toContain(longPurpose);
      expect(claudeAgent.prompt).toContain(longPurpose);
    });
  });
});