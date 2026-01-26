# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS production

WORKDIR /usr/src/app

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Copy dependency definitions
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built assets from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# uploads 디렉토리 생성
RUN mkdir -p /usr/src/app/uploads

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
