# AI Backend Service
# Dockerfile for Node.js Express backend

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]