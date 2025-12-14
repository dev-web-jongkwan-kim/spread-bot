FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port (default 3033, can be overridden by PORT env var)
EXPOSE 3033

# Start application
CMD ["node", "dist/main"]


