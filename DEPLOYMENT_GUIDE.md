# Mech-Evolve Deployment Guide with Version Tracking

This guide shows how to deploy the updated mech-evolve service with version tracking capabilities.

## Quick Deployment Steps

### 1. Prepare the Build
```bash
# Navigate to mech-evolve directory
cd /Users/kefentse/dev_env/mech/mech-evolve

# Build with version tracking
npm run build:production

# Verify build is ready
npm run version:check
```

### 2. Build Docker Image
```bash
# Build production Docker image with metadata
npm run build:docker

# Or manually:
docker build -t mech-evolve:latest .
```

### 3. Deploy to Production
```bash
# Tag for production registry (adjust registry URL as needed)
docker tag mech-evolve:latest your-registry/mech-evolve:latest

# Push to registry
docker push your-registry/mech-evolve:latest

# Deploy to production server
# (Replace with your actual deployment commands)
```

### 4. Verify Deployment
```bash
# Check version endpoint
curl http://evolve.mech.is/api/version

# Run comprehensive verification
npm run deploy:verify http://evolve.mech.is
```

## Expected Results

### Before Update (Current State)
```bash
curl http://evolve.mech.is/api/version
# Returns: Cannot GET /api/version
```

### After Update (With Version Tracking)
```bash
curl http://evolve.mech.is/api/version
```

Should return:
```json
{
  "service": "mech-evolve",
  "version": "2.0.0",
  "cliVersion": "enhanced-v2.0.0",
  "buildTime": "2025-08-21T23:01:40.665Z",
  "deploymentId": "deploy-1755817300960-9b11b70a",
  "git": {
    "commit": "9b11b70a8a33ef735d2c8fdba3c2ca1ee8f4256c",
    "shortCommit": "9b11b70a",
    "branch": "main"
  },
  "features": [
    "enhanced-cli",
    "dynamic-agents",
    "version-tracking",
    "deployment-metadata"
  ],
  "status": "operational"
}
```

## Verification Commands

After deployment, you can verify the service with these commands:

### Health Check
```bash
curl http://evolve.mech.is/health
```

### Version Information
```bash
curl http://evolve.mech.is/api/version | jq '.'
```

### Deployment Status
```bash
curl http://evolve.mech.is/api/deployment-status | jq '.'
```

### Complete Verification
```bash
node scripts/deployment-verification.js http://evolve.mech.is
```

## What's New

The updated service includes:

1. **Version API Endpoint** (`/api/version`)
   - Complete version and build information
   - Git commit details
   - Feature availability
   - Runtime statistics

2. **Deployment Status Endpoint** (`/api/deployment-status`)
   - Artifact verification
   - Version consistency checks
   - Deployment metadata

3. **Enhanced Health Check**
   - Includes version verification
   - Better error reporting

4. **Build Metadata**
   - Captured during Docker build
   - Includes git commit, build time, features
   - Available at runtime

## Troubleshooting

### If Version Endpoint Returns 404
The deployment hasn't been updated yet. Verify:
1. Docker image was built with latest code
2. Container was restarted with new image
3. No caching issues in proxy/load balancer

### If Versions Don't Match
1. Check local build: `npm run version:check`
2. Rebuild: `npm run build:production`
3. Redeploy with fresh image

### If Deployment Verification Fails
1. Check service logs
2. Verify network connectivity
3. Confirm service is running on expected port
4. Check for proxy/firewall issues

## Production Deployment Checklist

- [ ] Code is committed and pushed to main branch
- [ ] Local build completes successfully (`npm run build:production`)
- [ ] Version check passes (`npm run version:check`)
- [ ] Docker image builds without errors (`npm run build:docker`)
- [ ] Image is pushed to production registry
- [ ] Production service is updated with new image
- [ ] Health check returns healthy status
- [ ] Version endpoint returns expected version
- [ ] Deployment verification passes (`npm run deploy:verify`)

## Monitoring

After deployment, you can monitor version information:

```bash
# Quick version check
curl -s http://evolve.mech.is/api/version | jq '.version'

# Check uptime
curl -s http://evolve.mech.is/api/version | jq '.environment.runtime.uptime'

# Monitor deployment ID
curl -s http://evolve.mech.is/api/version | jq '.deploymentId'
```

This gives you reliable visibility into what's running in production and when it was deployed.