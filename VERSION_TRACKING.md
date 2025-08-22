# Mech-Evolve Version Tracking System

This document describes the comprehensive version tracking system implemented for mech-evolve deployments.

## Overview

The version tracking system provides complete visibility into deployment status, version information, and build metadata. It solves the problem of not being able to easily verify which version is running in production.

## Features

- **Build Metadata Generation**: Automatic capture of version, git information, and build details
- **Version API Endpoints**: RESTful endpoints to check deployment status and version info
- **Deployment Verification**: Scripts to verify version consistency across environments
- **Docker Integration**: Build-time metadata capture in container images
- **Health Checks**: Enhanced health checks with version verification

## API Endpoints

### Version Information
```bash
curl http://evolve.mech.is/api/version
```

Returns comprehensive version and deployment information:
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
    "branch": "main",
    "remote": "https://github.com/dundas/mech-evolve.git"
  },
  "features": [
    "enhanced-cli",
    "dynamic-agents", 
    "version-tracking",
    "deployment-metadata"
  ],
  "environment": {
    "nodeVersion": "v20.19.0",
    "platform": "linux",
    "runtime": {
      "uptime": 3600,
      "memory": {...},
      "timestamp": "2025-08-21T23:15:00Z"
    }
  },
  "deployment": {
    "containerized": true,
    "healthCheckEnabled": true
  },
  "status": "operational"
}
```

### Deployment Status
```bash
curl http://evolve.mech.is/api/deployment-status
```

Returns detailed deployment verification information including artifact presence and version consistency.

## Build System Integration

### NPM Scripts

- `npm run build` - Build with metadata generation
- `npm run build:metadata` - Generate build metadata only
- `npm run build:docker` - Build and create Docker image
- `npm run build:production` - Production build with verification
- `npm run version:check` - Check version consistency
- `npm run version:verify` - Verify all versions match
- `npm run deploy:verify` - Verify deployment status

### Build Artifacts

The build process creates several files in the `dist/` directory:

- `build-metadata.json` - Complete build and deployment metadata
- `build-metadata.js` - Runtime-accessible metadata module
- `VERSION` - Simple version string for quick checks
- `DEPLOYMENT_INFO` - Human-readable deployment information

## Docker Integration

The Dockerfile has been enhanced to capture build metadata during image creation:

```dockerfile
# Generate build metadata before copying built application
RUN node scripts/generate-build-metadata.js

# Ensure build metadata is available in final image
RUN if [ -f dist/build-metadata.json ]; then \
      echo "✅ Build metadata available"; \
      cat dist/VERSION; \
    else \
      echo "⚠️  Build metadata not generated, creating fallback"; \
      # ... fallback creation
    fi
```

## Usage Examples

### Quick Version Check
```bash
curl -s http://evolve.mech.is/api/version | jq '.version'
```

### Complete Deployment Verification
```bash
npm run deploy:verify
```

### Local Development
```bash
# Build with metadata
npm run build

# Check version consistency
npm run version:check

# Start with metadata
npm run start:dev
```

### Production Deployment
```bash
# Build production-ready version
npm run build:production

# Build and tag Docker image
npm run build:docker

# Deploy (your existing deployment process)
# ...

# Verify deployment
npm run deploy:verify
```

## Verification Scripts

### `scripts/version-check.js`
Checks version consistency between:
- package.json
- Build metadata
- VERSION file
- Compiled artifacts

### `scripts/deployment-verification.js`
Verifies deployment by:
- Testing service health
- Checking version endpoints
- Comparing local vs remote versions
- Validating feature availability

### `scripts/generate-build-metadata.js`
Generates comprehensive build metadata including:
- Version information
- Git commit details
- Build timestamp
- Environment information
- Feature flags
- Deployment ID

## Troubleshooting

### Version Mismatch
If versions don't match between local and deployed:

1. Check package.json version
2. Run `npm run build`
3. Verify with `npm run version:check`
4. Redeploy with metadata: `npm run build:production`

### Missing Build Metadata
If build metadata is missing:

1. Run `npm run build:metadata`
2. Check that `dist/build-metadata.json` exists
3. Verify git repository is available during build

### Service Not Responding
If version endpoints are not available:

1. Check service health: `curl http://evolve.mech.is/health`
2. Verify deployment completed: `npm run deploy:verify`
3. Check service logs for errors
4. Confirm new version includes version tracking features

## Deployment Best Practices

1. **Always verify locally first**:
   ```bash
   npm run build:production
   npm run version:check
   ```

2. **Include version verification in CI/CD**:
   ```bash
   npm run deploy:verify
   ```

3. **Check deployment immediately after deploying**:
   ```bash
   curl http://evolve.mech.is/api/version
   ```

4. **Monitor version consistency**:
   ```bash
   npm run deploy:verify http://evolve.mech.is
   ```

## Files Added/Modified

### New Files
- `scripts/generate-build-metadata.js` - Build metadata generation
- `scripts/version-check.js` - Version consistency checker  
- `scripts/deployment-verification.js` - Deployment verification
- `VERSION_TRACKING.md` - This documentation

### Modified Files
- `src/index.ts` - Added version and deployment status endpoints
- `package.json` - Added build and verification scripts
- `Dockerfile` - Enhanced with build metadata capture

## Expected Outcome

After implementing this system, you can easily verify deployment status:

```bash
curl http://evolve.mech.is/api/version
```

And get immediate visibility into:
- Current running version
- Build timestamp and deployment ID
- Git commit hash
- Feature availability
- Runtime status
- Version consistency

This eliminates the guesswork around deployment verification and provides reliable tracking of which version is running where.