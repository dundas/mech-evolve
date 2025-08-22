#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Verifies deployment status and version consistency for mech-evolve service
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_URLS = [
  'http://localhost:3011',
  'http://evolve.mech.is'
];

const TIMEOUT = 10000; // 10 seconds

function makeRequest(url, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'GET',
      timeout
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: result });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function checkServiceHealth(baseUrl) {
  try {
    const response = await makeRequest(`${baseUrl}/health`);
    return {
      url: baseUrl,
      healthy: response.statusCode === 200,
      status: response.statusCode,
      data: response.data
    };
  } catch (error) {
    return {
      url: baseUrl,
      healthy: false,
      error: error.message
    };
  }
}

async function checkServiceVersion(baseUrl) {
  try {
    const response = await makeRequest(`${baseUrl}/api/version`);
    return {
      url: baseUrl,
      available: response.statusCode === 200,
      status: response.statusCode,
      version: response.data
    };
  } catch (error) {
    return {
      url: baseUrl,
      available: false,
      error: error.message
    };
  }
}

async function checkDeploymentStatus(baseUrl) {
  try {
    const response = await makeRequest(`${baseUrl}/api/deployment-status`);
    return {
      url: baseUrl,
      available: response.statusCode === 200,
      status: response.statusCode,
      deployment: response.data
    };
  } catch (error) {
    return {
      url: baseUrl,
      available: false,
      error: error.message
    };
  }
}

function getLocalVersion() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
  } catch (error) {
    return 'unknown';
  }
}

function getLocalBuildMetadata() {
  try {
    const buildMetadataPath = path.join(__dirname, '..', 'dist', 'build-metadata.json');
    if (fs.existsSync(buildMetadataPath)) {
      return JSON.parse(fs.readFileSync(buildMetadataPath, 'utf-8'));
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function verifyDeployment(urls = DEFAULT_URLS) {
  console.log('🚀 Mech-Evolve Deployment Verification\n');
  
  const localVersion = getLocalVersion();
  const localBuildMetadata = getLocalBuildMetadata();
  
  console.log(`📦 Local package version: ${localVersion}`);
  if (localBuildMetadata) {
    console.log(`🏗️  Local build version: ${localBuildMetadata.version}`);
    console.log(`📅 Local build time: ${localBuildMetadata.buildTime}`);
    console.log(`🎯 Local deployment ID: ${localBuildMetadata.deploymentId}`);
  } else {
    console.log('⚠️  No local build metadata found');
  }
  
  console.log('\n🔍 Checking service endpoints...\n');
  
  const results = {
    services: [],
    healthy: 0,
    versionMatch: 0,
    deploymentInfo: []
  };
  
  for (const url of urls) {
    console.log(`📡 Checking ${url}...`);
    
    // Health check
    const health = await checkServiceHealth(url);
    if (health.healthy) {
      console.log(`  ✅ Health: OK`);
      results.healthy++;
    } else {
      console.log(`  ❌ Health: ${health.error || 'FAILED'}`);
    }
    
    // Version check
    const version = await checkServiceVersion(url);
    if (version.available) {
      console.log(`  ✅ Version API: Available`);
      console.log(`  📊 Service version: ${version.version.version}`);
      console.log(`  🎨 CLI version: ${version.version.cliVersion}`);
      console.log(`  📅 Build time: ${version.version.buildTime}`);
      console.log(`  🌿 Git commit: ${version.version.git.shortCommit}`);
      
      // Version comparison
      if (version.version.version === localVersion) {
        console.log(`  ✅ Version match: ${localVersion}`);
        results.versionMatch++;
      } else {
        console.log(`  ⚠️  Version mismatch: local=${localVersion}, remote=${version.version.version}`);
      }
      
      // Feature comparison
      if (version.version.features && version.version.features.length > 0) {
        console.log(`  🔧 Features: ${version.version.features.length} enabled`);
        if (version.version.features.includes('version-tracking')) {
          console.log(`  ✅ Version tracking: Enabled`);
        }
      }
    } else {
      console.log(`  ❌ Version API: ${version.error || 'NOT AVAILABLE'}`);
    }
    
    // Deployment status check
    const deployment = await checkDeploymentStatus(url);
    if (deployment.available) {
      console.log(`  ✅ Deployment API: Available`);
      const depInfo = deployment.deployment;
      if (depInfo.versionMatch) {
        console.log(`  ✅ Deployment version consistency: OK`);
      } else {
        console.log(`  ⚠️  Deployment version inconsistency detected`);
      }
      results.deploymentInfo.push({
        url,
        ...depInfo
      });
    } else {
      console.log(`  ❌ Deployment API: ${deployment.error || 'NOT AVAILABLE'}`);
    }
    
    results.services.push({
      url,
      health: health.healthy,
      version: version.available,
      deployment: deployment.available
    });
    
    console.log(''); // Empty line between services
  }
  
  // Summary
  console.log('📋 Deployment Verification Summary:');
  console.log(`   Services checked: ${urls.length}`);
  console.log(`   Healthy services: ${results.healthy}/${urls.length}`);
  console.log(`   Version matches: ${results.versionMatch}/${results.services.filter(s => s.version).length}`);
  
  const allHealthy = results.healthy === urls.length;
  const allVersionsMatch = results.versionMatch === results.services.filter(s => s.version).length;
  
  if (allHealthy && allVersionsMatch) {
    console.log('\n🎉 All deployments verified successfully!');
    console.log('✅ All services are healthy');
    console.log('✅ All versions match local version');
    return { success: true, results };
  } else {
    console.log('\n⚠️  Deployment verification issues detected:');
    if (!allHealthy) {
      console.log(`❌ ${urls.length - results.healthy} service(s) not healthy`);
    }
    if (!allVersionsMatch) {
      console.log(`❌ Version mismatches detected`);
    }
    
    console.log('\n🔧 Recommended actions:');
    console.log('1. Check service logs for errors');
    console.log('2. Verify deployment completed successfully');
    console.log('3. Confirm version numbers in package.json');
    console.log('4. Re-run: npm run build:production && npm run deploy:verify');
    
    return { success: false, results };
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  let urls = DEFAULT_URLS;
  
  // Allow custom URLs via command line
  if (args.length > 0) {
    urls = args;
  }
  
  try {
    const result = await verifyDeployment(urls);
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Deployment verification failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { 
  verifyDeployment, 
  checkServiceHealth, 
  checkServiceVersion, 
  checkDeploymentStatus 
};