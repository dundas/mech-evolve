FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built application with metadata
COPY dist ./dist

# Copy environment config
COPY .env.production .env

# Verify build metadata is available in final image
RUN if [ -f dist/build-metadata.json ]; then \
      echo "✅ Build metadata available"; \
      cat dist/VERSION 2>/dev/null || echo "No VERSION file"; \
    else \
      echo "⚠️  Build metadata not found, creating fallback"; \
      echo "2.0.0" > dist/VERSION; \
      echo '{"version":"2.0.0","buildTime":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","deploymentId":"docker-fallback","git":{"commit":"unknown","branch":"unknown"},"features":["docker-deployment"]}' > dist/build-metadata.json; \
    fi

# Add build information as labels
LABEL org.opencontainers.image.title="Mech Evolve Service"
LABEL org.opencontainers.image.description="Dynamic AI agent system for code evolution"
LABEL org.opencontainers.image.version="2.0.0"
LABEL org.opencontainers.image.created="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
LABEL org.opencontainers.image.source="https://github.com/mech-ai/mech-evolve"
LABEL org.opencontainers.image.documentation="https://evolve.mech.is/api/docs"

# Health check with version verification
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e " \
      const http = require('http'); \
      http.get('http://localhost:3011/health', (r) => { \
        let data = ''; \
        r.on('data', chunk => data += chunk); \
        r.on('end', () => { \
          try { \
            const health = JSON.parse(data); \
            process.exit(health.status === 'healthy' ? 0 : 1); \
          } catch (e) { \
            process.exit(1); \
          } \
        }); \
      }).on('error', () => process.exit(1)); \
    "

EXPOSE 3011

# Add deployment timestamp to environment
ENV DEPLOYMENT_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"
ENV CONTAINER_VERSION="2.0.0"

CMD ["node", "dist/index.js"]