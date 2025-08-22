#!/usr/bin/env node

/**
 * Version Consistency Check Script
 * Ensures version consistency across package.json, build metadata, and deployment
 */

const fs = require('fs');
const path = require('path');

function checkVersionConsistency() {
  console.log('🔍 Checking version consistency...\n');
  
  // Read package.json version
  const packagePath = path.join(__dirname, '..', 'package.json');
  let packageVersion = 'unknown';
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    packageVersion = packageJson.version;
    console.log(`📦 Package.json version: ${packageVersion}`);
  } catch (error) {
    console.error('❌ Failed to read package.json:', error.message);
    process.exit(1);
  }
  
  // Check build metadata version
  const buildMetadataPath = path.join(__dirname, '..', 'dist', 'build-metadata.json');
  let buildVersion = 'unknown';
  let buildMetadataExists = false;
  
  if (fs.existsSync(buildMetadataPath)) {
    buildMetadataExists = true;
    try {
      const buildMetadata = JSON.parse(fs.readFileSync(buildMetadataPath, 'utf-8'));
      buildVersion = buildMetadata.version;
      console.log(`🏗️  Build metadata version: ${buildVersion}`);
      console.log(`📅 Build time: ${buildMetadata.buildTime}`);
      console.log(`🎯 Deployment ID: ${buildMetadata.deploymentId}`);
      console.log(`🌿 Git commit: ${buildMetadata.git.shortCommit}`);
      console.log(`📋 Features: ${buildMetadata.features.length} enabled`);
    } catch (error) {
      console.error('❌ Failed to read build metadata:', error.message);
      buildVersion = 'error';
    }
  } else {
    console.log('⚠️  Build metadata not found (run npm run build:metadata)');
  }
  
  // Check VERSION file
  const versionFilePath = path.join(__dirname, '..', 'dist', 'VERSION');
  let fileVersion = 'unknown';
  
  if (fs.existsSync(versionFilePath)) {
    try {
      fileVersion = fs.readFileSync(versionFilePath, 'utf-8').trim();
      console.log(`📄 VERSION file: ${fileVersion}`);
    } catch (error) {
      console.error('❌ Failed to read VERSION file:', error.message);
      fileVersion = 'error';
    }
  } else {
    console.log('⚠️  VERSION file not found');
  }
  
  // Version consistency check
  console.log('\n📊 Version Consistency Report:');
  
  const allVersionsMatch = packageVersion === buildVersion && packageVersion === fileVersion;
  const buildMetadataMatch = !buildMetadataExists || packageVersion === buildVersion;
  const versionFileMatch = fileVersion === 'unknown' || packageVersion === fileVersion;
  
  if (allVersionsMatch && buildMetadataExists) {
    console.log('✅ All versions match perfectly');
  } else if (buildMetadataMatch && versionFileMatch) {
    console.log('✅ Available versions are consistent');
    if (!buildMetadataExists) {
      console.log('ℹ️  Run `npm run build:metadata` to generate build metadata');
    }
  } else {
    console.log('❌ Version mismatch detected:');
    console.log(`   Package.json: ${packageVersion}`);
    console.log(`   Build metadata: ${buildVersion}`);
    console.log(`   VERSION file: ${fileVersion}`);
    console.log('\n🔧 To fix:');
    console.log('   1. Update package.json version');
    console.log('   2. Run: npm run build');
    console.log('   3. Verify: npm run version:check');
    process.exit(1);
  }
  
  // Additional checks
  console.log('\n🔎 Additional Checks:');
  
  // Check if dist directory exists
  const distDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(distDir)) {
    console.log('✅ Dist directory exists');
    
    // Check for compiled files
    const indexJsPath = path.join(distDir, 'index.js');
    if (fs.existsSync(indexJsPath)) {
      console.log('✅ Compiled JavaScript files present');
    } else {
      console.log('⚠️  Main compiled file (index.js) not found');
    }
  } else {
    console.log('❌ Dist directory not found (run npm run build)');
    process.exit(1);
  }
  
  console.log('\n🎉 Version check completed successfully!');
  
  return {
    packageVersion,
    buildVersion,
    fileVersion,
    consistent: allVersionsMatch || (buildMetadataMatch && versionFileMatch)
  };
}

// Run if called directly
if (require.main === module) {
  try {
    checkVersionConsistency();
  } catch (error) {
    console.error('❌ Version check failed:', error.message);
    process.exit(1);
  }
}

module.exports = { checkVersionConsistency };