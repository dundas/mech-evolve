#!/bin/bash

# Production deployment verification script
# Tests all version tracking and deployment features

echo "🔍 Verifying Mech-Evolve Deployment with Version Tracking"
echo "======================================================="

# Test 1: Health Check
echo "1. Testing health endpoint..."
if curl -s -f http://evolve.mech.is/health > /dev/null; then
    echo "✅ Health check passed"
    curl -s http://evolve.mech.is/health | jq .
else
    echo "❌ Health check failed"
    exit 1
fi

echo ""

# Test 2: Version Endpoint
echo "2. Testing version endpoint..."
if curl -s -f http://evolve.mech.is/api/version > /dev/null; then
    echo "✅ Version endpoint available"
    VERSION_DATA=$(curl -s http://evolve.mech.is/api/version)
    echo "$VERSION_DATA" | jq .
    
    # Verify specific fields
    VERSION=$(echo "$VERSION_DATA" | jq -r .version)
    DEPLOYMENT_ID=$(echo "$VERSION_DATA" | jq -r .deploymentId)
    GIT_COMMIT=$(echo "$VERSION_DATA" | jq -r .git.shortCommit)
    
    echo ""
    echo "📦 Version: $VERSION"
    echo "🚀 Deployment ID: $DEPLOYMENT_ID"
    echo "📝 Git Commit: $GIT_COMMIT"
    
    # Verify version tracking features
    if echo "$VERSION_DATA" | jq -e '.features | contains(["version-tracking"])' > /dev/null; then
        echo "✅ Version tracking feature enabled"
    else
        echo "❌ Version tracking feature not found"
    fi
    
    if echo "$VERSION_DATA" | jq -e '.features | contains(["deployment-metadata"])' > /dev/null; then
        echo "✅ Deployment metadata feature enabled"
    else
        echo "❌ Deployment metadata feature not found"
    fi
    
else
    echo "❌ Version endpoint not available"
    echo "Current deployment needs to be updated"
    exit 1
fi

echo ""

# Test 3: CLI Integration
echo "3. Testing CLI version verification..."
if [ -f "./enhanced-cli.js" ]; then
    echo "✅ Enhanced CLI available"
    CLI_VERSION=$(node enhanced-cli.js --version 2>/dev/null || echo "CLI version failed")
    echo "CLI Version: $CLI_VERSION"
else
    echo "⚠️ Enhanced CLI not found in current directory"
fi

echo ""

# Test 4: Build Metadata Files
echo "4. Verifying build metadata files..."
if [ -f "./dist/build-metadata.json" ]; then
    echo "✅ Build metadata available locally"
    LOCAL_VERSION=$(cat dist/build-metadata.json | jq -r .version)
    echo "Local build version: $LOCAL_VERSION"
else
    echo "❌ Build metadata not found locally"
fi

echo ""
echo "🎉 Deployment verification complete!"
echo ""
echo "Expected production endpoints after deployment:"
echo "  - Health: https://evolve.mech.is/health"
echo "  - Version: https://evolve.mech.is/api/version"
echo "  - Agents: https://evolve.mech.is/api/agents/[applicationId]"