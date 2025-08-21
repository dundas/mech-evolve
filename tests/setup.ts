/**
 * Test Setup
 * Global test configuration and utilities
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import { Db, MongoClient } from 'mongodb';

// Global test database
let mongoServer: MongoMemoryServer;
let mongoClient: MongoClient;
let testDb: Db;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to test database
  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  testDb = mongoClient.db('test');
  
  // Make test database available globally
  (global as any).testDb = testDb;
  (global as any).mongoClient = mongoClient;
});

// Cleanup after all tests
afterAll(async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clear collections between tests
afterEach(async () => {
  if (testDb) {
    const collections = await testDb.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Test utilities
export const createTestDb = (): Db => {
  return (global as any).testDb;
};

export const getMongoClient = (): MongoClient => {
  return (global as any).mongoClient;
};

// Mock file system utilities
export const mockFileSystem = {
  files: new Map<string, string>(),
  
  addFile(path: string, content: string) {
    this.files.set(path, content);
  },
  
  getFile(path: string): string | undefined {
    return this.files.get(path);
  },
  
  clear() {
    this.files.clear();
  }
};

// Mock HTTP utilities for testing hooks
export const mockHttpServer = {
  responses: new Map<string, any>(),
  requests: [] as any[],
  
  setResponse(path: string, response: any) {
    this.responses.set(path, response);
  },
  
  getRequests(path?: string): any[] {
    if (path) {
      return this.requests.filter(r => r.path === path);
    }
    return this.requests;
  },
  
  clear() {
    this.responses.clear();
    this.requests = [];
  }
};

// Test data factories
export const createTestAgent = (overrides = {}) => ({
  id: 'test-agent-1',
  applicationId: 'test-app',
  name: 'TestAgent',
  role: 'Test Role',
  purpose: 'Test Purpose',
  triggers: ['test-trigger'],
  capabilities: ['test-capability'],
  priority: 'important' as const,
  tier: 2 as const,
  status: 'active' as const,
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
  specification: {
    analysisLogic: 'Test analysis logic',
    improvementStrategies: ['test-strategy'],
    communicationProtocols: ['test-protocol'],
    learningMechanisms: ['test-mechanism']
  },
  ...overrides
});

export const createTestChangeEvent = (overrides = {}) => ({
  id: 'change-1',
  applicationId: 'test-app',
  filePath: '/test/file.ts',
  changeType: 'file-modify',
  timestamp: new Date(),
  metadata: {},
  ...overrides
});

export const createTestCodebaseAnalysis = (overrides = {}) => ({
  applicationId: 'test-app',
  projectPath: '/test/project',
  timestamp: new Date(),
  metrics: {
    totalFiles: 100,
    totalLines: 10000,
    languages: { TypeScript: 60, JavaScript: 40 },
    frameworks: ['React', 'Express'],
    testCoverage: 75,
    complexity: 'medium' as const
  },
  suggestedAgents: [
    {
      name: 'CodeQualityGuardian',
      role: 'Code Quality',
      purpose: 'Maintain code quality',
      triggers: ['*.ts', '*.js'],
      capabilities: ['linting', 'formatting'],
      priority: 'critical' as const,
      tier: 1 as const,
      reasoning: 'Large codebase needs quality control'
    }
  ],
  patterns: {
    hasTests: true,
    hasLinting: true,
    hasTypeScript: true,
    hasDocker: false,
    hasCI: true,
    hasDocumentation: true
  },
  recommendations: [
    'Add TypeScript strict mode',
    'Increase test coverage to 80%'
  ],
  ...overrides
});