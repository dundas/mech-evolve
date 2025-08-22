#!/usr/bin/env node

/**
 * Build Metadata Generation Script
 * Generates deployment and version metadata during Docker build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read package.json for version info
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

// Generate build metadata
function generateBuildMetadata() {
  const buildTime = new Date().toISOString();
  const version = packageJson.version;
  
  // Try to get git information
  let gitCommit = 'unknown';
  let gitBranch = 'unknown';
  let gitRemote = 'unknown';
  
  try {
    gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.warn('Could not get git commit hash:', e.message);
  }
  
  try {
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.warn('Could not get git branch:', e.message);
  }
  
  try {
    gitRemote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.warn('Could not get git remote:', e.message);
  }
  
  // Determine CLI version based on features
  const cliVersion = `enhanced-v${version}`;
  
  // Define feature set
  const features = [
    'enhanced-cli',
    'dynamic-agents', 
    'uninstall-support',
    'version-tracking',
    'deployment-metadata',
    'agent-factory',
    'claude-integration',
    'mongodb-persistence'
  ];
  
  // Generate deployment ID
  const deploymentId = `deploy-${Date.now()}-${gitCommit.slice(0, 8)}`;
  
  const metadata = {
    version,
    cliVersion,
    buildTime,
    deploymentId,
    git: {
      commit: gitCommit,
      shortCommit: gitCommit.slice(0, 8),
      branch: gitBranch,
      remote: gitRemote
    },
    features,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    package: {
      name: packageJson.name,
      description: packageJson.description,
      author: packageJson.author,
      license: packageJson.license
    },
    deployment: {
      strategy: 'docker',
      containerized: true,
      healthCheck: true
    }
  };
  
  return metadata;
}

// Write metadata to multiple formats
function writeBuildMetadata() {
  const metadata = generateBuildMetadata();
  
  // Ensure dist directory exists
  const distDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  // Write JSON metadata
  const metadataPath = path.join(distDir, 'build-metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  // Write TypeScript module for runtime access
  const tsModulePath = path.join(distDir, 'build-metadata.js');
  const moduleContent = `// Auto-generated build metadata
module.exports = ${JSON.stringify(metadata, null, 2)};
`;
  fs.writeFileSync(tsModulePath, moduleContent);
  
  // Write version info for quick access
  const versionPath = path.join(distDir, 'VERSION');
  fs.writeFileSync(versionPath, `${metadata.version}\n`);
  
  // Write deployment info
  const deploymentPath = path.join(distDir, 'DEPLOYMENT_INFO');
  const deploymentInfo = `Deployment ID: ${metadata.deploymentId}
Version: ${metadata.version}
CLI Version: ${metadata.cliVersion}
Build Time: ${metadata.buildTime}
Git Commit: ${metadata.git.commit}
Git Branch: ${metadata.git.branch}
Features: ${metadata.features.join(', ')}
Node Version: ${metadata.environment.nodeVersion}
Platform: ${metadata.environment.platform}
`;
  fs.writeFileSync(deploymentPath, deploymentInfo);
  
  console.log('✅ Build metadata generated successfully');
  console.log(`📦 Version: ${metadata.version}`);
  console.log(`🚀 Deployment ID: ${metadata.deploymentId}`);
  console.log(`📝 Git Commit: ${metadata.git.shortCommit}`);
  console.log(`🔧 Features: ${metadata.features.length} enabled`);
  console.log(`📄 Files created:`);
  console.log(`   - ${metadataPath}`);
  console.log(`   - ${tsModulePath}`);
  console.log(`   - ${versionPath}`);
  console.log(`   - ${deploymentPath}`);
  
  return metadata;
}

// Run if called directly
if (require.main === module) {
  try {
    writeBuildMetadata();
  } catch (error) {
    console.error('❌ Failed to generate build metadata:', error);
    process.exit(1);
  }
}

module.exports = { generateBuildMetadata, writeBuildMetadata };