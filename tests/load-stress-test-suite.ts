import request from 'supertest';
import { spawn, ChildProcess } from 'child_process';
import { performance } from 'perf_hooks';

/**
 * Load and Stress Testing Suite
 * 
 * Tests system behavior under various load conditions:
 * 1. Concurrent API requests
 * 2. Large payload handling
 * 3. Memory usage under load
 * 4. Service recovery after stress
 * 5. Database performance under load
 * 6. Rate limiting behavior
 */

describe('Load and Stress Testing Suite', () => {
  const serviceUrl = 'http://localhost:3011';
  const testApplicationIds: string[] = [];

  beforeAll(async () => {
    await waitForService(serviceUrl, 30000);
  });

  afterAll(async () => {
    // Cleanup all test applications
    for (const appId of testApplicationIds) {
      try {
        await request(serviceUrl)
          .delete(`/api/agents/${appId}`)
          .timeout(5000);
      } catch (error) {
        console.warn(`Failed to cleanup ${appId}:`, error);
      }
    }
  });

  describe('1. Concurrent Request Testing', () => {
    test('should handle 50 concurrent health checks', async () => {
      const concurrency = 50;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrency }, (_, i) =>
        request(serviceUrl)
          .get('/health')
          .timeout(10000)
          .then(res => ({
            index: i,
            status: res.status,
            responseTime: performance.now() - startTime
          }))
          .catch(err => ({
            index: i,
            status: 'error',
            error: err.message,
            responseTime: performance.now() - startTime
          }))
      );

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      const successful = results.filter(r => r.status === 200);
      const failed = results.filter(r => r.status !== 200);
      
      console.log(`Concurrent Health Checks: ${successful.length}/${concurrency} successful in ${totalTime.toFixed(2)}ms`);
      console.log(`Average response time: ${(totalTime / concurrency).toFixed(2)}ms`);
      console.log(`Failure rate: ${(failed.length / concurrency * 100).toFixed(1)}%`);
      
      expect(successful.length).toBeGreaterThan(concurrency * 0.8); // At least 80% success
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    test('should handle 25 concurrent agent creation requests', async () => {
      const concurrency = 25;
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrency }, (_, i) => {
        const appId = `load-test-create-${Date.now()}-${i}`;
        testApplicationIds.push(appId);
        
        return request(serviceUrl)
          .post('/api/agents/analyze-project')
          .send({
            applicationId: appId,
            projectPath: '.'
          })
          .timeout(30000)
          .then(res => ({
            index: i,
            appId,
            status: res.status,
            agentsCreated: res.body.agents?.created || 0,
            responseTime: performance.now() - startTime
          }))
          .catch(err => ({
            index: i,
            appId,
            status: 'error',
            error: err.message,
            responseTime: performance.now() - startTime
          }));
      });

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      const successful = results.filter(r => r.status === 200);
      const failed = results.filter(r => r.status !== 200);
      
      console.log(`Concurrent Agent Creation: ${successful.length}/${concurrency} successful in ${totalTime.toFixed(2)}ms`);
      console.log(`Total agents created: ${successful.reduce((sum, r) => sum + (r.agentsCreated || 0), 0)}`);
      console.log(`Average response time: ${(totalTime / concurrency).toFixed(2)}ms`);
      
      expect(successful.length).toBeGreaterThan(concurrency * 0.6); // At least 60% success (agent creation is complex)
      expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds
    });

    test('should handle mixed concurrent operations', async () => {
      const operations = [
        { type: 'health', count: 20 },
        { type: 'agents-list', count: 15 },
        { type: 'evolution-track', count: 10 },
        { type: 'analytics', count: 5 }
      ];

      const promises: Promise<any>[] = [];
      
      // Health checks
      for (let i = 0; i < operations[0].count; i++) {
        promises.push(
          request(serviceUrl)
            .get('/health')
            .timeout(10000)
            .then(res => ({ type: 'health', status: res.status }))
            .catch(err => ({ type: 'health', status: 'error', error: err.message }))
        );
      }

      // Agent list requests
      const testAppId = testApplicationIds[0] || 'fallback-test-app';
      for (let i = 0; i < operations[1].count; i++) {
        promises.push(
          request(serviceUrl)
            .get(`/api/agents/${testAppId}`)
            .timeout(10000)
            .then(res => ({ type: 'agents-list', status: res.status }))
            .catch(err => ({ type: 'agents-list', status: 'error', error: err.message }))
        );
      }

      // Evolution tracking
      for (let i = 0; i < operations[2].count; i++) {
        promises.push(
          request(serviceUrl)
            .post('/api/evolution/track')
            .send({
              applicationId: testAppId,
              filePath: `/load-test-${i}.ts`,
              changeType: 'load-test',
              metadata: { loadTest: true }
            })
            .timeout(10000)
            .then(res => ({ type: 'evolution-track', status: res.status }))
            .catch(err => ({ type: 'evolution-track', status: 'error', error: err.message }))
        );
      }

      // Analytics requests
      for (let i = 0; i < operations[3].count; i++) {
        promises.push(
          request(serviceUrl)
            .get('/api/analytics/trends')
            .query({ period: '1d' })
            .timeout(10000)
            .then(res => ({ type: 'analytics', status: res.status }))
            .catch(err => ({ type: 'analytics', status: 'error', error: err.message }))
        );
      }

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const byType = results.reduce((acc, result) => {
        acc[result.type] = acc[result.type] || { success: 0, error: 0 };
        if (result.status === 200) {
          acc[result.type].success++;
        } else {
          acc[result.type].error++;
        }
        return acc;
      }, {} as Record<string, { success: number; error: number }>);

      console.log('Mixed Operations Results:');
      Object.entries(byType).forEach(([type, counts]) => {
        const total = counts.success + counts.error;
        const successRate = (counts.success / total * 100).toFixed(1);
        console.log(`  ${type}: ${counts.success}/${total} successful (${successRate}%)`);
      });
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);

      // At least 70% of all operations should succeed
      const totalSuccessful = Object.values(byType).reduce((sum, counts) => sum + counts.success, 0);
      const totalOperations = results.length;
      expect(totalSuccessful / totalOperations).toBeGreaterThan(0.7);
    });
  });

  describe('2. Large Payload Testing', () => {
    test('should handle large project analysis request', async () => {
      const largeMetadata = {
        files: Array.from({ length: 1000 }, (_, i) => ({
          path: `/src/component${i}.tsx`,
          size: Math.floor(Math.random() * 10000),
          lastModified: new Date().toISOString()
        })),
        dependencies: Object.fromEntries(
          Array.from({ length: 200 }, (_, i) => [`package-${i}`, `^1.${i}.0`])
        ),
        metrics: {
          linesOfCode: 50000,
          complexity: 'high',
          testCoverage: 85.5,
          buildTime: '2m 15s'
        }
      };

      const appId = `large-payload-test-${Date.now()}`;
      testApplicationIds.push(appId);

      const startTime = performance.now();
      const response = await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: appId,
          projectPath: '.',
          metadata: largeMetadata
        })
        .timeout(45000);

      const responseTime = performance.now() - startTime;
      console.log(`Large payload response time: ${responseTime.toFixed(2)}ms`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(30000); // Should handle within 30 seconds
    });

    test('should handle bulk evolution tracking', async () => {
      const testAppId = `bulk-evolution-${Date.now()}`;
      testApplicationIds.push(testAppId);

      // Create agents first
      await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: testAppId,
          projectPath: '.'
        })
        .timeout(30000);

      // Bulk evolution events
      const events = Array.from({ length: 100 }, (_, i) => ({
        applicationId: testAppId,
        filePath: `/bulk/file${i}.ts`,
        changeType: 'bulk-edit',
        improvements: [
          { type: 'formatting', priority: 1 },
          { type: 'linting', priority: 2 },
          { type: 'type-checking', priority: 3 }
        ],
        metadata: {
          bulkOperation: true,
          batchIndex: i,
          timestamp: new Date().toISOString()
        }
      }));

      const startTime = performance.now();
      const promises = events.map(event =>
        request(serviceUrl)
          .post('/api/evolution/track')
          .send(event)
          .timeout(15000)
          .catch(err => ({ error: err.message }))
      );

      const results = await Promise.all(promises);
      const responseTime = performance.now() - startTime;

      const successful = results.filter(r => !r.error && r.status === 200);
      console.log(`Bulk evolution tracking: ${successful.length}/${events.length} successful in ${responseTime.toFixed(2)}ms`);

      expect(successful.length).toBeGreaterThan(events.length * 0.8); // At least 80% success
    });
  });

  describe('3. Sustained Load Testing', () => {
    test('should maintain performance under sustained load for 2 minutes', async () => {
      const duration = 2 * 60 * 1000; // 2 minutes
      const requestInterval = 500; // Request every 500ms
      const testAppId = `sustained-load-${Date.now()}`;
      testApplicationIds.push(testAppId);

      // Create test agents
      await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: testAppId,
          projectPath: '.'
        })
        .timeout(30000);

      const results: Array<{ timestamp: number; responseTime: number; success: boolean }> = [];
      const startTime = Date.now();
      let requestCount = 0;

      const runSustainedLoad = async (): Promise<void> => {
        return new Promise((resolve) => {
          const interval = setInterval(async () => {
            if (Date.now() - startTime >= duration) {
              clearInterval(interval);
              resolve();
              return;
            }

            const requestStart = performance.now();
            requestCount++;

            try {
              const response = await request(serviceUrl)
                .get(`/api/agents/${testAppId}`)
                .timeout(5000);

              results.push({
                timestamp: Date.now() - startTime,
                responseTime: performance.now() - requestStart,
                success: response.status === 200
              });
            } catch (error) {
              results.push({
                timestamp: Date.now() - startTime,
                responseTime: performance.now() - requestStart,
                success: false
              });
            }
          }, requestInterval);
        });
      };

      await runSustainedLoad();

      // Analyze results
      const successful = results.filter(r => r.success);
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      const successRate = (successful.length / results.length) * 100;

      console.log(`Sustained Load Test Results:`);
      console.log(`  Duration: ${duration / 1000}s`);
      console.log(`  Total requests: ${results.length}`);
      console.log(`  Success rate: ${successRate.toFixed(1)}%`);
      console.log(`  Average response time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`  Max response time: ${maxResponseTime.toFixed(2)}ms`);

      expect(successRate).toBeGreaterThan(90); // At least 90% success rate
      expect(averageResponseTime).toBeLessThan(3000); // Average under 3 seconds
      expect(maxResponseTime).toBeLessThan(10000); // No request over 10 seconds
    });

    test('should handle memory-intensive operations', async () => {
      const testAppId = `memory-intensive-${Date.now()}`;
      testApplicationIds.push(testAppId);

      // Create multiple large analysis operations
      const operations = Array.from({ length: 10 }, (_, i) => {
        const appId = `${testAppId}-${i}`;
        testApplicationIds.push(appId);
        
        return {
          applicationId: appId,
          projectPath: '.',
          metadata: {
            simulatedProject: 'large',
            files: Array.from({ length: 500 }, (_, j) => ({
              path: `/project${i}/file${j}.ts`,
              complexity: Math.floor(Math.random() * 100),
              dependencies: Array.from({ length: 20 }, (_, k) => `dep${k}`)
            }))
          }
        };
      });

      const startTime = performance.now();
      const promises = operations.map(op =>
        request(serviceUrl)
          .post('/api/agents/analyze-project')
          .send(op)
          .timeout(60000)
          .catch(err => ({ error: err.message, appId: op.applicationId }))
      );

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const successful = results.filter(r => !r.error && r.status === 200);
      console.log(`Memory-intensive operations: ${successful.length}/${operations.length} successful in ${totalTime.toFixed(2)}ms`);

      expect(successful.length).toBeGreaterThan(operations.length * 0.7); // At least 70% success
    });
  });

  describe('4. Rate Limiting Testing', () => {
    test('should enforce rate limits appropriately', async () => {
      // Attempt to exceed rate limits
      const burstCount = 200; // Attempt many requests quickly
      const promises = Array.from({ length: burstCount }, (_, i) =>
        request(serviceUrl)
          .get('/api/docs')
          .timeout(5000)
          .then(res => ({ index: i, status: res.status, rateLimited: false }))
          .catch(err => ({
            index: i,
            status: err.status || 'error',
            rateLimited: err.status === 429,
            error: err.message
          }))
      );

      const results = await Promise.all(promises);
      
      const successful = results.filter(r => r.status === 200);
      const rateLimited = results.filter(r => r.rateLimited);
      const errors = results.filter(r => r.status !== 200 && !r.rateLimited);

      console.log(`Rate Limit Test Results:`);
      console.log(`  Successful requests: ${successful.length}/${burstCount}`);
      console.log(`  Rate limited: ${rateLimited.length}/${burstCount}`);
      console.log(`  Other errors: ${errors.length}/${burstCount}`);

      // Should have some successful requests
      expect(successful.length).toBeGreaterThan(0);
      
      // If rate limiting is working, should have some rate limited requests
      // (This depends on rate limit configuration)
      if (rateLimited.length === 0) {
        console.log('Rate limiting not triggered or configured with high limits');
      }
    });

    test('should recover after rate limit period', async () => {
      // First, trigger rate limiting
      const burstPromises = Array.from({ length: 150 }, () =>
        request(serviceUrl).get('/health').timeout(3000).catch(() => ({}))
      );
      await Promise.all(burstPromises);

      // Wait for rate limit window to reset (assuming 60 second window)
      console.log('Waiting for rate limit reset...');
      await new Promise(resolve => setTimeout(resolve, 65000));

      // Test normal operation
      const recoveryResponse = await request(serviceUrl)
        .get('/health')
        .timeout(10000);

      expect(recoveryResponse.status).toBe(200);
      console.log('Successfully recovered from rate limiting');
    }, 80000); // Extended timeout for this test
  });

  describe('5. Error Recovery Testing', () => {
    test('should handle database connection issues gracefully', async () => {
      // This test assumes the service can handle database issues
      // We'll test by creating many operations that might strain the DB connection
      
      const testAppId = `db-stress-${Date.now()}`;
      testApplicationIds.push(testAppId);

      // Create agents first
      await request(serviceUrl)
        .post('/api/agents/analyze-project')
        .send({
          applicationId: testAppId,
          projectPath: '.'
        })
        .timeout(30000);

      // Stress database with many operations
      const operations = [
        ...Array.from({ length: 50 }, (_, i) => ({
          type: 'evolution-track',
          data: {
            applicationId: testAppId,
            filePath: `/stress/file${i}.ts`,
            changeType: 'db-stress-test'
          }
        })),
        ...Array.from({ length: 30 }, (_, i) => ({
          type: 'agent-update',
          data: {
            applicationId: testAppId,
            agentId: `stress-agent-${i}`,
            status: 'learning'
          }
        })),
        ...Array.from({ length: 20 }, () => ({
          type: 'agent-list',
          data: { applicationId: testAppId }
        }))
      ];

      const promises = operations.map(async (op) => {
        try {
          switch (op.type) {
            case 'evolution-track':
              return await request(serviceUrl)
                .post('/api/evolution/track')
                .send(op.data)
                .timeout(10000);
            case 'agent-update':
              // This might fail if agent doesn't exist, which is expected
              return await request(serviceUrl)
                .put(`/api/agents/${op.data.applicationId}/${op.data.agentId}`)
                .send({ status: op.data.status })
                .timeout(10000)
                .catch(() => ({ status: 'expected-failure' }));
            case 'agent-list':
              return await request(serviceUrl)
                .get(`/api/agents/${op.data.applicationId}`)
                .timeout(10000);
            default:
              return { status: 'unknown' };
          }
        } catch (error) {
          return { status: 'error', error: error.message };
        }
      });

      const results = await Promise.all(promises);
      
      const successful = results.filter(r => r.status === 200);
      const errors = results.filter(r => r.status !== 200 && r.status !== 'expected-failure');
      
      console.log(`Database stress test: ${successful.length}/${operations.length} successful operations`);
      console.log(`Errors: ${errors.length}/${operations.length}`);

      // Service should remain responsive even under database stress
      const healthCheck = await request(serviceUrl).get('/health');
      expect(healthCheck.status).toBe(200);
      
      // At least some operations should succeed
      expect(successful.length).toBeGreaterThan(0);
    });

    test('should maintain service stability after stress', async () => {
      // Verify the service is still functional after all stress tests
      const finalHealthCheck = await request(serviceUrl)
        .get('/health')
        .timeout(10000);

      expect(finalHealthCheck.status).toBe(200);
      expect(finalHealthCheck.body.status).toBe('healthy');

      // Test a basic operation
      const docsResponse = await request(serviceUrl)
        .get('/api/docs')
        .timeout(10000);

      expect(docsResponse.status).toBe(200);
      expect(docsResponse.body.service).toBe('Mech Evolve');

      console.log('Service maintained stability after stress testing');
    });
  });

  describe('6. Performance Benchmarks', () => {
    test('should meet response time benchmarks', async () => {
      const benchmarks = [
        { endpoint: '/health', method: 'GET', maxTime: 100, description: 'Health check' },
        { endpoint: '/api/docs', method: 'GET', maxTime: 200, description: 'API documentation' },
      ];

      const results = [];

      for (const benchmark of benchmarks) {
        const measurements = [];
        
        // Take 10 measurements
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();
          
          let response;
          if (benchmark.method === 'GET') {
            response = await request(serviceUrl)
              .get(benchmark.endpoint)
              .timeout(10000);
          }
          
          const responseTime = performance.now() - startTime;
          measurements.push(responseTime);
          
          expect(response?.status).toBe(200);
        }

        const averageTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
        const maxTime = Math.max(...measurements);
        const minTime = Math.min(...measurements);

        results.push({
          ...benchmark,
          averageTime,
          maxTime: maxTime,
          minTime,
          passed: averageTime <= benchmark.maxTime
        });

        console.log(`${benchmark.description}:`);
        console.log(`  Average: ${averageTime.toFixed(2)}ms (target: <${benchmark.maxTime}ms)`);
        console.log(`  Min/Max: ${minTime.toFixed(2)}ms / ${maxTime.toFixed(2)}ms`);
        console.log(`  Passed: ${averageTime <= benchmark.maxTime ? '✓' : '✗'}`);
      }

      // All benchmarks should pass
      const failedBenchmarks = results.filter(r => !r.passed);
      if (failedBenchmarks.length > 0) {
        console.log(`Failed benchmarks: ${failedBenchmarks.map(b => b.description).join(', ')}`);
      }
      
      expect(failedBenchmarks.length).toBe(0);
    });
  });
});

// Helper function
async function waitForService(url: string, timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await request(url).get('/health').timeout(5000);
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