FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist ./dist
COPY .env.production .env

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3011/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

EXPOSE 3011

CMD ["node", "dist/index.js"]