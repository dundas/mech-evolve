import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Comprehensive Test Runner
 * 
 * Executes all test suites and generates a detailed report:
 * 1. Service health verification
 * 2. Sequential test suite execution
 * 3. Performance monitoring during tests
 * 4. Detailed test report generation
 * 5. Production readiness assessment
 */

interface TestSuite {
  name: string;
  file: string;
  description: string;
  critical: boolean;
  estimatedDuration: number; // minutes
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  errors: string[];
  warnings: string[];
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  responseTime: number;
  timestamp: number;
}

class ComprehensiveTestRunner {
  private serviceUrl = 'http://localhost:3011';
  private results: TestResult[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private startTime: number = Date.now();

  private testSuites: TestSuite[] = [
    {
      name: 'Comprehensive API Tests',
      file: 'comprehensive-api-test-suite.ts',
      description: 'Complete API CRUD operations and data consistency validation',
      critical: true,
      estimatedDuration: 15
    },
    {
      name: 'Claude Code Integration Tests',
      file: 'claude-integration-test-suite.ts',
      description: 'Hook system, agent synchronization, and Claude Code workflow',
      critical: true,
      estimatedDuration: 20
    },
    {
      name: 'End-to-End Workflow Tests',
      file: 'e2e-workflow-test-suite.ts',
      description: 'Real-world scenarios from project onboarding to production',
      critical: true,
      estimatedDuration: 25
    },
    {
      name: 'Load and Stress Tests',
      file: 'load-stress-test-suite.ts',
      description: 'Performance under load, concurrent operations, and resource limits',
      critical: false,
      estimatedDuration: 30
    },
    {
      name: 'Documentation Verification Tests',
      file: 'documentation-verification-test-suite.ts',
      description: 'All documentation examples and installation procedures',
      critical: false,
      estimatedDuration: 10
    },
    {
      name: 'Error Handling and Edge Cases',
      file: 'error-handling-edge-cases-test-suite.ts',
      description: 'Input validation, security, and error recovery mechanisms',
      critical: true,
      estimatedDuration: 15
    }
  ];

  async run(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite for Mech-Evolve Service');
    console.log('================================================================================');
    
    const totalEstimatedTime = this.testSuites.reduce((sum, suite) => sum + suite.estimatedDuration, 0);
    console.log(`📊 Total estimated time: ${totalEstimatedTime} minutes`);
    console.log(`🎯 Critical test suites: ${this.testSuites.filter(s => s.critical).length}`);
    console.log(`📋 Optional test suites: ${this.testSuites.filter(s => !s.critical).length}`);
    console.log('');

    // 1. Pre-flight checks
    console.log('🔍 Pre-flight Checks');
    console.log('--------------------');
    const preflightSuccess = await this.runPreflightChecks();
    
    if (!preflightSuccess) {
      console.error('❌ Pre-flight checks failed. Cannot proceed with comprehensive testing.');
      process.exit(1);
    }

    console.log('✅ Pre-flight checks passed\n');

    // 2. Start system monitoring
    const monitoringInterval = this.startSystemMonitoring();

    // 3. Execute test suites sequentially
    console.log('🧪 Executing Test Suites');
    console.log('-------------------------');
    
    let criticalFailures = 0;
    
    for (const suite of this.testSuites) {
      console.log(`\n📝 Running: ${suite.name}`);
      console.log(`   ${suite.description}`);
      console.log(`   Estimated duration: ${suite.estimatedDuration} minutes`);
      console.log(`   Priority: ${suite.critical ? 'CRITICAL' : 'OPTIONAL'}`);
      
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (result.failed > 0) {
        if (suite.critical) {
          criticalFailures++;
          console.log(`   ❌ CRITICAL TEST SUITE FAILED: ${result.failed} failures`);
        } else {
          console.log(`   ⚠️  Optional test suite had ${result.failed} failures`);
        }
      } else {
        console.log(`   ✅ All tests passed (${result.passed} tests, ${result.duration.toFixed(2)}s)`);
      }

      // Brief pause between test suites to allow service recovery
      await this.sleep(2000);
    }

    // 4. Stop monitoring
    clearInterval(monitoringInterval);

    // 5. Final health check
    console.log('\n🏁 Final Health Check');
    console.log('----------------------');
    const finalHealthy = await this.checkServiceHealth();
    
    if (!finalHealthy) {
      console.log('⚠️  Service health degraded after testing');
    } else {
      console.log('✅ Service maintained health throughout testing');
    }

    // 6. Generate comprehensive report
    await this.generateComprehensiveReport();

    // 7. Production readiness assessment
    const productionReady = this.assessProductionReadiness(criticalFailures);
    
    console.log('\n🎯 Production Readiness Assessment');
    console.log('===================================');
    
    if (productionReady) {
      console.log('🎉 PRODUCTION READY: All critical tests passed');
      console.log('   The service is ready for production deployment');
      process.exit(0);
    } else {
      console.log('❌ NOT PRODUCTION READY: Critical test failures detected');
      console.log(`   ${criticalFailures} critical test suite(s) failed`);
      console.log('   Address critical issues before deploying to production');
      process.exit(1);
    }
  }

  private async runPreflightChecks(): Promise<boolean> {
    const checks = [
      { name: 'Service Availability', check: () => this.checkServiceHealth() },
      { name: 'Node.js Version', check: () => this.checkNodeVersion() },
      { name: 'Test Files Exist', check: () => this.checkTestFiles() },
      { name: 'Test Dependencies', check: () => this.checkTestDependencies() }
    ];

    for (const check of checks) {
      try {
        const result = await check.check();
        console.log(`   ${result ? '✅' : '❌'} ${check.name}`);
        
        if (!result) {
          return false;
        }
      } catch (error) {
        console.log(`   ❌ ${check.name}: ${error}`);
        return false;
      }
    }

    return true;
  }

  private async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  private async checkNodeVersion(): Promise<boolean> {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    return majorVersion >= 18;
  }

  private checkTestFiles(): boolean {
    return this.testSuites.every(suite => 
      fs.existsSync(path.join(__dirname, suite.file))
    );
  }

  private checkTestDependencies(): boolean {
    try {
      const packageJson = JSON.parse(fs.readFileSync(
        path.join(__dirname, '..', 'package.json'), 'utf-8'
      ));
      
      const requiredDeps = ['jest', 'supertest', 'ts-jest'];
      return requiredDeps.every(dep => 
        packageJson.devDependencies?.[dep] || packageJson.dependencies?.[dep]
      );
    } catch (error) {
      return false;
    }
  }

  private startSystemMonitoring(): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        const startTime = Date.now();
        const response = await fetch(`${this.serviceUrl}/health`);
        const responseTime = Date.now() - startTime;
        
        const metrics: SystemMetrics = {
          cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          responseTime,
          timestamp: Date.now()
        };
        
        this.systemMetrics.push(metrics);
        
        // Keep only last 100 measurements
        if (this.systemMetrics.length > 100) {
          this.systemMetrics.shift();
        }
      } catch (error) {
        // Monitoring error, continue silently
      }
    }, 5000); // Every 5 seconds
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testProcess = spawn('npm', ['run', 'test', '--', suite.file], {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      testProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const exitCode = await new Promise<number>((resolve) => {
        testProcess.on('close', resolve);
        
        // Timeout after suite's estimated duration + 50%
        const timeout = suite.estimatedDuration * 60 * 1000 * 1.5;
        setTimeout(() => {
          testProcess.kill('SIGTERM');
          resolve(-1);
        }, timeout);
      });

      const duration = (Date.now() - startTime) / 1000;
      
      // Parse Jest output to extract test results
      const results = this.parseJestOutput(stdout + stderr);
      
      return {
        suite: suite.name,
        passed: results.passed,
        failed: results.failed,
        skipped: results.skipped,
        duration,
        coverage: results.coverage,
        errors: results.errors,
        warnings: results.warnings
      };
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      return {
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration,
        errors: [`Test suite execution failed: ${error}`],
        warnings: []
      };
    }
  }

  private parseJestOutput(output: string): {
    passed: number;
    failed: number;
    skipped: number;
    coverage?: number;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Extract test results
    const passedMatch = output.match(/(\d+) passing/);
    const failedMatch = output.match(/(\d+) failing/);
    const skippedMatch = output.match(/(\d+) pending/);
    const coverageMatch = output.match(/All files\s+\|\s+[\d.]+\s+\|\s+([\d.]+)/);

    // Extract errors
    const errorMatches = output.match(/^\s+\d+\)\s+(.+)$/gm);
    if (errorMatches) {
      errors.push(...errorMatches);
    }

    // Extract warnings
    const warningMatches = output.match(/Warning:\s+(.+)$/gm);
    if (warningMatches) {
      warnings.push(...warningMatches);
    }

    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      coverage: coverageMatch ? parseFloat(coverageMatch[1]) : undefined,
      errors,
      warnings
    };
  }

  private async generateComprehensiveReport(): Promise<void> {
    const totalDuration = (Date.now() - this.startTime) / 1000;
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: {
        totalTests,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        successRate: (totalPassed / totalTests) * 100
      },
      testSuites: this.results,
      systemMetrics: {
        averageResponseTime: this.systemMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.systemMetrics.length,
        maxResponseTime: Math.max(...this.systemMetrics.map(m => m.responseTime)),
        averageMemoryUsage: this.systemMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.systemMetrics.length,
        maxMemoryUsage: Math.max(...this.systemMetrics.map(m => m.memoryUsage))
      },
      productionReadiness: {
        ready: this.assessProductionReadiness(this.results.filter(r => r.failed > 0).length),
        criticalIssues: this.results.filter(r => r.failed > 0 && this.testSuites.find(s => s.name === r.suite)?.critical),
        recommendations: this.generateRecommendations()
      }
    };

    // Save detailed JSON report
    const reportPath = path.join(__dirname, '..', 'comprehensive-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownReport = this.generateMarkdownReport(report);
    const markdownPath = path.join(__dirname, '..', 'TEST_REPORT.md');
    fs.writeFileSync(markdownPath, markdownReport);

    console.log('\n📊 Test Report Generated');
    console.log(`   JSON Report: ${reportPath}`);
    console.log(`   Markdown Report: ${markdownPath}`);
    
    // Print summary to console
    console.log('\n📈 Test Summary');
    console.log('================');
    console.log(`Total Duration: ${Math.floor(totalDuration / 60)}m ${Math.floor(totalDuration % 60)}s`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Skipped: ${totalSkipped} (${((totalSkipped / totalTests) * 100).toFixed(1)}%)`);
    
    if (this.systemMetrics.length > 0) {
      console.log(`\n🖥️  System Performance`);
      console.log(`Average Response Time: ${report.systemMetrics.averageResponseTime.toFixed(2)}ms`);
      console.log(`Max Response Time: ${report.systemMetrics.maxResponseTime}ms`);
      console.log(`Average Memory Usage: ${report.systemMetrics.averageMemoryUsage.toFixed(2)}MB`);
      console.log(`Max Memory Usage: ${report.systemMetrics.maxMemoryUsage.toFixed(2)}MB`);
    }
  }

  private generateMarkdownReport(report: any): string {
    return `# Mech-Evolve Comprehensive Test Report

Generated: ${report.timestamp}
Duration: ${Math.floor(report.duration / 60)}m ${Math.floor(report.duration % 60)}s

## Executive Summary

- **Total Tests**: ${report.summary.totalTests}
- **Success Rate**: ${report.summary.successRate.toFixed(1)}%
- **Production Ready**: ${report.productionReadiness.ready ? '✅ YES' : '❌ NO'}

## Test Results by Suite

${this.results.map(result => `
### ${result.suite}

- **Passed**: ${result.passed}
- **Failed**: ${result.failed}
- **Skipped**: ${result.skipped}
- **Duration**: ${result.duration.toFixed(2)}s
- **Status**: ${result.failed === 0 ? '✅ PASSED' : '❌ FAILED'}

${result.errors.length > 0 ? `
#### Errors
\`\`\`
${result.errors.join('\n')}
\`\`\`
` : ''}

${result.warnings.length > 0 ? `
#### Warnings
\`\`\`
${result.warnings.join('\n')}
\`\`\`
` : ''}
`).join('')}

## System Performance Metrics

- **Average Response Time**: ${report.systemMetrics.averageResponseTime.toFixed(2)}ms
- **Max Response Time**: ${report.systemMetrics.maxResponseTime}ms
- **Average Memory Usage**: ${report.systemMetrics.averageMemoryUsage.toFixed(2)}MB
- **Max Memory Usage**: ${report.systemMetrics.maxMemoryUsage.toFixed(2)}MB

## Production Readiness Assessment

${report.productionReadiness.ready ? 
  '✅ **READY FOR PRODUCTION**\n\nAll critical tests passed. The service meets production quality standards.' :
  '❌ **NOT READY FOR PRODUCTION**\n\nCritical issues detected. Address the following before deployment:'
}

### Recommendations

${report.productionReadiness.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## Next Steps

${report.productionReadiness.ready ? 
  '1. Review optional test failures and consider improvements\n2. Monitor performance metrics in production\n3. Set up continuous monitoring and alerting' :
  '1. Fix critical test failures\n2. Re-run comprehensive test suite\n3. Address performance concerns if any'
}

---
*Report generated by Mech-Evolve Comprehensive Test Suite*
`;
  }

  private assessProductionReadiness(criticalFailures: number): boolean {
    const criticalSuites = this.testSuites.filter(s => s.critical);
    const failedCriticalSuites = this.results.filter(r => 
      r.failed > 0 && this.testSuites.find(s => s.name === r.suite)?.critical
    );

    // Production ready if no critical test suites failed
    return failedCriticalSuites.length === 0;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedSuites = this.results.filter(r => r.failed > 0);
    const highErrorSuites = this.results.filter(r => r.errors.length > 5);
    
    if (failedSuites.length > 0) {
      recommendations.push(`Address ${failedSuites.length} failing test suite(s)`);
    }
    
    if (highErrorSuites.length > 0) {
      recommendations.push('Review and fix tests with multiple errors');
    }
    
    const avgResponseTime = this.systemMetrics.reduce((sum, m) => sum + m.responseTime, 0) / this.systemMetrics.length;
    if (avgResponseTime > 1000) {
      recommendations.push('Optimize response times (currently > 1000ms average)');
    }
    
    const maxMemoryUsage = Math.max(...this.systemMetrics.map(m => m.memoryUsage));
    if (maxMemoryUsage > 500) {
      recommendations.push('Monitor memory usage (peaked at > 500MB during testing)');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All tests passed successfully - consider implementing continuous integration');
    }
    
    return recommendations;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Execute the comprehensive test runner
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  runner.run().catch(error => {
    console.error('Comprehensive test runner failed:', error);
    process.exit(1);
  });
}