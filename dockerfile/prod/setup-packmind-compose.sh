#!/bin/bash
# Setup Production Secrets for Packmind Docker Compose Deployment
# This script generates secure encryption keys and JWT secrets for production deployment

set -euo pipefail

# Verify Docker Compose is available
echo "Checking Docker Compose availability..."
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available or not properly installed."
    echo ""
    echo "Please install Docker Compose by following the instructions at:"
    echo "https://docs.docker.com/compose/install/"
    echo ""
    echo "After installation, run this script again."
    exit 1
fi

echo "✅ Docker Compose is available"
echo ""

curl -fsSL -o setup-production-secrets.sh https://raw.githubusercontent.com/PackmindHub/packmind/refs/heads/main/dockerfile/prod/setup-production-secrets.sh
curl -fsSL -o docker-compose.yml https://raw.githubusercontent.com/PackmindHub/packmind/refs/heads/main/dockerfile/prod/docker-compose.yml
chmod +x setup-production-secrets.sh
./setup-production-secrets.sh
docker compose up -d

echo "✅ By default, Packmind runs on http:/localhost:8081"