#!/bin/bash

# Alternative deployment trigger script
# Since SSH is not accessible, try to trigger redeploy through other means

echo "🔄 Attempting to trigger production redeploy..."

# Check current service version
echo "Current production health:"
curl -s http://evolve.mech.is/health | jq . || echo "Health check failed"

echo ""
echo "Checking current version endpoint:"
curl -s http://evolve.mech.is/api/version | jq . || echo "Version endpoint not available"

echo ""
echo "✅ Image ready in registry: derivativelabs/mech-evolve:latest"
echo "🔧 Manual intervention required to redeploy production container"

echo ""
echo "Manual deployment commands (run on production server):"
echo "  docker pull derivativelabs/mech-evolve:latest"
echo "  docker stop mech-evolve-production"
echo "  docker rm mech-evolve-production"
echo "  docker run -d --name mech-evolve-production --restart unless-stopped -p 3011:3011 \\"
echo "    -e NODE_ENV=production -e PORT=3011 \\"
echo "    -e MONGODB_URI=\"mongodb+srv://mechMIN:kXlxqCLtftmzOejA@main.h81m1fq.mongodb.net/mech-evolve?retryWrites=true&w=majority&appName=MAIN\" \\"
echo "    -e LOG_LEVEL=info -e MECH_EVOLVE_URL=https://evolve.mech.is \\"
echo "    -e CORS_ORIGINS=\"http://localhost:3000,http://localhost:5500,https://evolve.mech.is\" \\"
echo "    -v mech-evolve-data:/app/data -v mech-evolve-logs:/app/logs \\"
echo "    derivativelabs/mech-evolve:latest"