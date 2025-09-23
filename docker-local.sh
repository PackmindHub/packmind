#!/bin/bash

# Production Docker Build and Deploy Script
# This script builds all Docker images and starts the production stack

set -e  # Exit on any error

echo "🐳 Building production Docker images..."

# Build API image
echo "📦 Building API image..."
docker build -f Dockerfile/Dockerfile.api -t packmind-api-local .

# Build MCP Server image
echo "📦 Building MCP Server image..."
docker build -f Dockerfile/Dockerfile.mcp -t packmind-mcp-local .

# Build Frontend image
echo "📦 Building Frontend image..."
docker build -f Dockerfile/Dockerfile.frontend -t packmind-frontend-local .

echo "✅ All images built successfully!"

# Stop any existing production containers
echo "🛑 Stopping existing production containers..."
docker-compose -f Dockerfile/local/docker-compose.yaml down || true

# Start the production stack
echo "🚀 Starting production stack..."
docker-compose -f Dockerfile/local/docker-compose.yaml up -d

echo "🎉 Production stack is running!"
echo ""
echo "📍 Service URLs:"
echo "   Frontend: http://localhost"
echo "   API: http://localhost/api"
echo "   MCP Server: http://localhost/mcp"
echo "   PostgreSQL: localhost:5432"
echo ""
echo "📊 Check status with: docker-compose -f Dockerfile/local/docker-compose.yaml ps"
echo "📜 View logs with: docker-compose -f Dockerfile/local/docker-compose.yaml logs -f"
echo "🛑 Stop with: docker-compose -f Dockerfile/local/docker-compose.yaml down"
