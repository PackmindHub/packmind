#!/bin/bash

# Local Docker Build and Deploy Script
# This script builds all Nx apps, Docker images, and starts a local production-like stack
# Ports are offset by +10 to avoid conflicts with other docker-compose stacks

set -e  # Exit on any error

COMPOSE_FILE="dockerfile/local/docker-compose.yaml"

# ========================================================================
# STEP 1: BUILD NX APPS
# ========================================================================
echo "🔨 Building Nx applications..."

# Generate tsconfig
echo "📝 Generating tsconfig..."
PACKMIND_EDITION=${PACKMIND_EDITION:-oss} node scripts/select-tsconfig.mjs

# Build all apps
echo "📦 Building frontend..."
./node_modules/.bin/nx build frontend --configuration=production

echo "📦 Building MCP server..."
./node_modules/.bin/nx build mcp-server --configuration=production

echo "📦 Building API..."
./node_modules/.bin/nx build api --configuration=production

# Bundle migrations for Docker
echo "📦 Bundling migrations for Docker..."
./node_modules/.bin/nx bundle-docker migrations

echo "✅ All Nx builds completed!"

# ========================================================================
# STEP 2: BUILD DOCKER IMAGES
# ========================================================================
echo "🐳 Building Docker images..."

# Build API image
echo "📦 Building API Docker image..."
docker build -f dockerfile/Dockerfile.api -t packmind-api-local .

# Build MCP Server image
echo "📦 Building MCP Server Docker image..."
docker build -f dockerfile/Dockerfile.mcp -t packmind-mcp-local .

# Build Frontend image
echo "📦 Building Frontend Docker image..."
docker build -f dockerfile/Dockerfile.frontend -t packmind-frontend-local .

echo "✅ All Docker images built successfully!"

# ========================================================================
# STEP 3: START LOCAL STACK
# ========================================================================

# Stop any existing local containers
echo "🛑 Stopping existing local containers..."
docker compose -f "$COMPOSE_FILE" down || true

# Start the local stack
echo "🚀 Starting local stack..."
docker compose -f "$COMPOSE_FILE" up -d

echo "🎉 Local stack is running!"
echo ""
echo "📍 Service URLs:"
echo "   Frontend: http://localhost:8091"
echo "   API:      http://localhost:8091/api"
echo "   MCP:      http://localhost:8091/mcp"
echo "   API direct:      http://localhost:3010"
echo "   MCP direct:      http://localhost:3011"
echo "   PostgreSQL:      localhost:5442"
echo "   Redis:           localhost:6389"
echo ""
echo "📊 Check status with: docker compose -f $COMPOSE_FILE ps"
echo "📜 View logs with:    docker compose -f $COMPOSE_FILE logs -f"
echo "🛑 Stop with:         docker compose -f $COMPOSE_FILE down"
