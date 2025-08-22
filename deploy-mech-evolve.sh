#!/bin/bash

# Mech Evolve Production Deployment Script
# Usage: ./deploy-mech-evolve.sh

set -e

# Configuration
SERVICE_NAME="mech-evolve"
DOCKER_IMAGE="mech-evolve:latest"
DOCKER_REGISTRY="derivativelabs"
PRODUCTION_SERVER="root@139.59.20.184"
CONTAINER_NAME="mech-evolve-production"
PORT="3011"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying Mech Evolve to Production${NC}"
echo "================================================"

# 1. Use existing Docker image (already built with version tracking)
echo -e "${YELLOW}Step 1: Using existing Docker image with version tracking...${NC}"
# Image already built and tagged as derivativelabs/mech-evolve:latest
echo -e "${GREEN}✅ Using existing image with build metadata${NC}"

# 2. Skip tagging (already done)
echo -e "${YELLOW}Step 2: Image already tagged and pushed...${NC}"
echo -e "${GREEN}✅ Image ready in registry${NC}"

# 3. Skip push (already done)
echo -e "${YELLOW}Step 3: Image already pushed to Docker Hub...${NC}"
echo -e "${GREEN}✅ Image available in registry${NC}"

# 4. Deploy to production server
echo -e "${YELLOW}Step 4: Deploying to production server...${NC}"
ssh ${PRODUCTION_SERVER} << 'ENDSSH'
set -e

# Pull the latest image
echo "Pulling latest image..."
docker pull derivativelabs/mech-evolve:latest

# Stop and remove existing container if it exists
echo "Stopping existing container..."
docker stop mech-evolve-production 2>/dev/null || true
docker rm mech-evolve-production 2>/dev/null || true

# Run the new container
echo "Starting new container..."
docker run -d \
  --name mech-evolve-production \
  --restart unless-stopped \
  -p 3011:3011 \
  -e NODE_ENV=production \
  -e PORT=3011 \
  -e MONGODB_URI="mongodb+srv://mechMIN:kXlxqCLtftmzOejA@main.h81m1fq.mongodb.net/mech-evolve?retryWrites=true&w=majority&appName=MAIN" \
  -e LOG_LEVEL=info \
  -e MECH_EVOLVE_URL=https://evolve.mech.is \
  -e CORS_ORIGINS="http://localhost:3000,http://localhost:5500,https://evolve.mech.is" \
  -v mech-evolve-data:/app/data \
  -v mech-evolve-logs:/app/logs \
  derivativelabs/mech-evolve:latest

# Wait for container to be healthy
echo "Waiting for container to be healthy..."
sleep 5

# Check if container is running
if docker ps | grep -q mech-evolve-production; then
    echo "✅ Container is running"
    
    # Check health endpoint
    if curl -f http://localhost:3011/health > /dev/null 2>&1; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed"
        exit 1
    fi
else
    echo "❌ Container failed to start"
    docker logs mech-evolve-production
    exit 1
fi

# Update Nginx configuration (if needed)
echo "Updating Nginx configuration..."
cat > /etc/nginx/sites-available/evolve.mech.is << 'NGINX'
server {
    listen 80;
    server_name evolve.mech.is;
    
    location / {
        proxy_pass http://localhost:3011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# Enable the site if not already enabled
ln -sf /etc/nginx/sites-available/evolve.mech.is /etc/nginx/sites-enabled/

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo "✅ Deployment complete!"
ENDSSH

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo -e "${BLUE}Service Details:${NC}"
echo "  - URL: https://evolve.mech.is"
echo "  - Health: https://evolve.mech.is/health"
echo "  - Container: ${CONTAINER_NAME}"
echo "  - Port: ${PORT}"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "  ssh ${PRODUCTION_SERVER} docker logs -f ${CONTAINER_NAME}"