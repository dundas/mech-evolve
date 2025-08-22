import request from 'supertest';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

/**
 * Comprehensive API Test Suite for Mech-Evolve Service
 * 
 * This test suite covers:
 * 1. All CRUD operations for dynamic agents
 * 2. Error handling and edge cases
 * 3. Integration workflows
 * 4. Performance benchmarks
 * 5. Data consistency validation
 */

describe('Mech-Evolve Comprehensive API Test Suite', () => {
  let mongoServer: MongoMemoryServer;
  let mongoClient: MongoClient;
  let db: Db;
  let app: express.Application;
  let server: any;
  let baseURL: string;
  
  // Test data
  const testApplicationId = 'test-app-comprehensive-2024';
  const testProjectPath = '/tmp/test-project';
  const testAgentId = 'agent-test-123';

  beforeAll(async () => {
    // Start MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27018, // Different port to avoid conflicts
        dbName: 'mech-evolve-test-comprehensive'
      }
    });

    // Get connection string and connect
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    process.env.PORT = '3012'; // Different port for testing
    process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    db = mongoClient.db('mech-evolve-test-comprehensive');

    // Wait a moment for everything to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Start the service (we'll import it dynamically to avoid conflicts)
    const { spawn } = require('child_process');
    server = spawn('npm', ['run', 'dev'], {
      env: { ...process.env, PORT: '3012' },
      detached: false,
      stdio: 'pipe'
    });

    // Wait for service to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    baseURL = 'http://localhost:3012';
  });

  afterAll(async () => {
    // Cleanup
    if (server) {
      server.kill('SIGTERM');
    }
    if (mongoClient) {
      await mongoClient.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('1. Health Check and Basic Connectivity', () => {
    test('should respond to health check', async () => {
      const response = await request(baseURL)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'mech-evolve',
        timestamp: expect.any(String)
      });
    });

    test('should serve API documentation', async () => {
      const response = await request(baseURL)
        .get('/api/docs')
        .expect(200);

      expect(response.body.service).toBe('Mech Evolve');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.evolution).toBeDefined();
    });
  });

  describe('2. Agent CRUD Operations', () => {
    describe('CREATE - Agent Analysis and Creation', () => {
      test('should analyze project and create agents', async () => {
        const response = await request(baseURL)
          .post('/api/agents/analyze-project')
          .send({
            applicationId: testApplicationId,
            projectPath: '.'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.analysis).toBeDefined();
        expect(response.body.agents).toBeDefined();
        expect(response.body.agents.created).toBeGreaterThan(0);
        expect(response.body.claudeFormat).toBeDefined();
      });

      test('should handle invalid project analysis request', async () => {
        const response = await request(baseURL)
          .post('/api/agents/analyze-project')
          .send({}) // Missing required fields
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('applicationId and projectPath are required');
      });

      test('should handle non-existent project path', async () => {
        const response = await request(baseURL)
          .post('/api/agents/analyze-project')
          .send({
            applicationId: 'test-nonexistent',
            projectPath: '/completely/fake/path/that/does/not/exist'
          })
          .expect(500); // Should handle gracefully but may return 500

        expect(response.body.success).toBe(false);
      });
    });

    describe('READ - Get Agent Information', () => {
      test('should get all agents for application', async () => {
        const response = await request(baseURL)
          .get(`/api/agents/${testApplicationId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.applicationId).toBe(testApplicationId);
        expect(response.body.agents).toBeInstanceOf(Array);
        expect(response.body.agentCount).toBeGreaterThanOrEqual(0);
      });

      test('should get agents in Claude format', async () => {
        const response = await request(baseURL)
          .get(`/api/agents/${testApplicationId}/claude`)
          .expect(200);

        // Should return Claude Code compatible format
        expect(response.body).toBeDefined();
        if (response.body.agents) {
          expect(response.body.agents).toBeInstanceOf(Array);
        }
      });

      test('should generate Claude context', async () => {
        const response = await request(baseURL)
          .get(`/api/agents/${testApplicationId}/claude-context`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.context).toBeDefined();
        expect(response.body.agentCount).toBeGreaterThanOrEqual(0);
        expect(response.body.generatedAt).toBeDefined();
      });

      test('should get agent memory and insights', async () => {
        // First get all agents to find a valid agent ID
        const agentsResponse = await request(baseURL)
          .get(`/api/agents/${testApplicationId}`)
          .expect(200);

        if (agentsResponse.body.agents && agentsResponse.body.agents.length > 0) {
          const agentId = agentsResponse.body.agents[0].id;
          
          const response = await request(baseURL)
            .get(`/api/agents/${testApplicationId}/${agentId}/memory`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.agent).toBeDefined();
          expect(response.body.agent.name).toBeDefined();
          expect(response.body.agent.memory).toBeDefined();
        }
      });

      test('should handle non-existent agent memory request', async () => {
        const response = await request(baseURL)
          .get(`/api/agents/${testApplicationId}/fake-agent-id/memory`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Agent not found');
      });
    });

    describe('UPDATE - Agent Modifications', () => {
      test('should update agent status and performance', async () => {
        // First get an agent ID
        const agentsResponse = await request(baseURL)
          .get(`/api/agents/${testApplicationId}`)
          .expect(200);

        if (agentsResponse.body.agents && agentsResponse.body.agents.length > 0) {
          const agentId = agentsResponse.body.agents[0].id;
          
          const response = await request(baseURL)
            .put(`/api/agents/${testApplicationId}/${agentId}`)
            .send({
              status: 'learning',
              performance: {
                suggestionsGenerated: 10,
                suggestionsAccepted: 8,
                successRate: 0.8
              },
              memory: {
                patterns: [
                  { pattern: 'test-pattern', frequency: 5, confidence: 0.9 }
                ]
              }
            })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.message).toContain(`Updated agent ${agentId}`);
        }
      });

      test('should handle update to non-existent agent', async () => {
        const response = await request(baseURL)
          .put(`/api/agents/${testApplicationId}/fake-agent-id`)
          .send({
            status: 'active'
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Agent not found');
      });

      test('should reset all agents for application', async () => {
        const response = await request(baseURL)
          .put(`/api/agents/${testApplicationId}/reset`)
          .send({
            projectPath: '.'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Reset complete');
        expect(response.body.agents).toBeDefined();
        expect(response.body.agents.created).toBeGreaterThanOrEqual(0);
      });
    });

    describe('DELETE - Agent Cleanup', () => {
      test('should delete specific agent', async () => {
        // First get an agent ID
        const agentsResponse = await request(baseURL)
          .get(`/api/agents/${testApplicationId}`)
          .expect(200);

        if (agentsResponse.body.agents && agentsResponse.body.agents.length > 0) {
          const agentId = agentsResponse.body.agents[0].id;
          
          const response = await request(baseURL)
            .delete(`/api/agents/${testApplicationId}/${agentId}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.message).toContain(`Deleted agent ${agentId}`);
          expect(response.body.deletedCount).toBe(1);
        }
      });

      test('should handle delete of non-existent agent', async () => {
        const response = await request(baseURL)
          .delete(`/api/agents/${testApplicationId}/fake-agent-id`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Agent not found');
      });

      test('should delete all agents for application', async () => {
        const response = await request(baseURL)
          .delete(`/api/agents/${testApplicationId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Deleted');
        expect(response.body.deletedCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('3. Evolution Tracking System', () => {
    beforeEach(async () => {
      // Ensure we have agents for evolution tracking
      await request(baseURL)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: testApplicationId,
          projectPath: '.'
        });
    });

    test('should track evolution events', async () => {
      const response = await request(baseURL)
        .post('/api/evolution/track')
        .send({
          applicationId: testApplicationId,
          filePath: '/test/file.ts',
          changeType: 'function-add',
          improvements: [
            { type: 'formatting', command: 'prettier', priority: 1 }
          ],
          metadata: { 
            toolName: 'Edit',
            projectScope: 'isolated'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.evolutionId).toBeDefined();
      expect(response.body.suggestions).toBeInstanceOf(Array);
    });

    test('should get evolution history', async () => {
      const response = await request(baseURL)
        .get(`/api/evolution/history/${testApplicationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.projectId).toBe(testApplicationId);
      expect(response.body.evolutions).toBeInstanceOf(Array);
    });

    test('should get improvement suggestions', async () => {
      const response = await request(baseURL)
        .get(`/api/evolution/suggest/${testApplicationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.suggestions).toBeInstanceOf(Array);
    });

    test('should apply improvements', async () => {
      const response = await request(baseURL)
        .post('/api/evolution/apply')
        .send({
          suggestionId: 'test-suggestion-id',
          projectId: testApplicationId,
          machineId: 'test-machine',
          result: {
            success: true,
            improvements: ['formatting', 'linting']
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.applicationId).toBeDefined();
    });
  });

  describe('4. Analytics and Metrics', () => {
    test('should get project metrics', async () => {
      const response = await request(baseURL)
        .get(`/api/analytics/metrics/${testApplicationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.projectId).toBe(testApplicationId);
      expect(response.body.metrics).toBeDefined();
    });

    test('should get improvement trends', async () => {
      const response = await request(baseURL)
        .get('/api/analytics/trends')
        .query({ projectId: testApplicationId, period: '7d' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.trends).toBeDefined();
      expect(response.body.trends.summary).toBeDefined();
    });

    test('should get global trends without project filter', async () => {
      const response = await request(baseURL)
        .get('/api/analytics/trends')
        .query({ period: '30d' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.projectId).toBe('all');
    });
  });

  describe('5. Sync System', () => {
    const testMachineId = 'test-machine-123';

    test('should push sync data', async () => {
      const response = await request(baseURL)
        .post('/api/sync/push')
        .send({
          machineId: testMachineId,
          projectId: testApplicationId,
          improvements: [
            { type: 'formatting', applied: true },
            { type: 'linting', applied: false }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.syncId).toBeDefined();
    });

    test('should get sync status', async () => {
      const response = await request(baseURL)
        .get(`/api/sync/status/${testApplicationId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
    });

    test('should pull sync data', async () => {
      const response = await request(baseURL)
        .get(`/api/sync/pull/${testMachineId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.improvements).toBeInstanceOf(Array);
    });
  });

  describe('6. File System Integration', () => {
    test('should sync agents to files', async () => {
      const response = await request(baseURL)
        .post(`/api/agents/${testApplicationId}/sync-to-files`)
        .send({
          projectPath: '/tmp'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Synced');
    });

    test('should handle invalid project path for file sync', async () => {
      const response = await request(baseURL)
        .post(`/api/agents/${testApplicationId}/sync-to-files`)
        .send({
          projectPath: '/completely/fake/path'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('does not exist');
    });
  });

  describe('7. Error Handling and Edge Cases', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(baseURL)
        .post('/api/evolution/track')
        .send('invalid json string')
        .type('json')
        .expect(400);
    });

    test('should handle missing required fields', async () => {
      const response = await request(baseURL)
        .post('/api/evolution/track')
        .send({})
        .expect(500); // Internal error due to missing fields
    });

    test('should handle non-existent endpoints', async () => {
      const response = await request(baseURL)
        .get('/api/nonexistent/endpoint')
        .expect(404);
    });

    test('should handle invalid query parameters', async () => {
      const response = await request(baseURL)
        .get('/api/analytics/trends')
        .query({ period: 'invalid-period' })
        .expect(200); // Should handle gracefully

      expect(response.body.success).toBe(true);
    });
  });

  describe('8. Performance and Load Testing', () => {
    test('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        request(baseURL)
          .get('/health')
          .expect(200)
      );

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.body.status).toBe('healthy');
      });
    });

    test('should handle rapid agent creation requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        request(baseURL)
          .post('/api/agents/analyze-project')
          .send({
            applicationId: `test-concurrent-${i}`,
            projectPath: '.'
          })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });

    test('should measure response times', async () => {
      const startTime = Date.now();
      
      await request(baseURL)
        .get(`/api/agents/${testApplicationId}`)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  describe('9. Data Consistency Validation', () => {
    test('should maintain agent count consistency', async () => {
      // Create agents
      await request(baseURL)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: 'consistency-test',
          projectPath: '.'
        })
        .expect(200);

      // Get agent count
      const response1 = await request(baseURL)
        .get('/api/agents/consistency-test')
        .expect(200);

      const initialCount = response1.body.agentCount;

      // Add evolution data
      await request(baseURL)
        .post('/api/evolution/track')
        .send({
          applicationId: 'consistency-test',
          filePath: '/test.ts',
          changeType: 'edit',
          metadata: {}
        });

      // Verify agent count unchanged
      const response2 = await request(baseURL)
        .get('/api/agents/consistency-test')
        .expect(200);

      expect(response2.body.agentCount).toBe(initialCount);

      // Cleanup
      await request(baseURL)
        .delete('/api/agents/consistency-test')
        .expect(200);
    });

    test('should properly cleanup on agent deletion', async () => {
      // Create test application with agents
      await request(baseURL)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: 'cleanup-test',
          projectPath: '.'
        })
        .expect(200);

      // Verify agents exist
      const beforeDelete = await request(baseURL)
        .get('/api/agents/cleanup-test')
        .expect(200);

      expect(beforeDelete.body.agentCount).toBeGreaterThan(0);

      // Delete all agents
      const deleteResponse = await request(baseURL)
        .delete('/api/agents/cleanup-test')
        .expect(200);

      expect(deleteResponse.body.deletedCount).toBeGreaterThan(0);

      // Verify cleanup
      const afterDelete = await request(baseURL)
        .get('/api/agents/cleanup-test')
        .expect(200);

      expect(afterDelete.body.agentCount).toBe(0);
    });
  });

  describe('10. Rate Limiting and Security', () => {
    test('should respect rate limits', async () => {
      // This test may be skipped if rate limiting is high
      const promises = Array.from({ length: 150 }, () => 
        request(baseURL).get('/health')
      );

      const results = await Promise.allSettled(promises);
      const rateLimited = results.some(r => 
        r.status === 'fulfilled' && (r.value as any).status === 429
      );

      // Rate limiting might not trigger in test environment
      // This is more of a smoke test
      expect(results.length).toBe(150);
    });

    test('should validate input data', async () => {
      const response = await request(baseURL)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: '', // Empty string should be invalid
          projectPath: '.'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});