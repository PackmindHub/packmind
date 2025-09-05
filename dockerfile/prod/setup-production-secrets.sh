#!/bin/bash
# Setup Production Secrets for Packmind Docker Compose Deployment
# This script generates secure encryption keys and JWT secrets for production deployment

set -euo pipefail

echo "🔐 Setting up Packmind production secrets with Docker Compose..."

# Create secrets directory with restricted permissions
SECRETS_DIR="./secrets"
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

echo "📁 Created secrets directory: $SECRETS_DIR"

# Function to generate a key if it doesn't exist
generate_key_if_missing() {
    local key_file="$1"
    local key_name="$2"
    
    if [ ! -f "$key_file" ]; then
        echo "🔑 Generating $key_name..."
        openssl rand -base64 32 > "$key_file"
        chmod 600 "$key_file"
        echo "✅ Generated: $key_file"
    else
        echo "✅ Key already exists: $key_file"
    fi
}

# Generate all required keys
generate_key_if_missing "$SECRETS_DIR/encryption_key.txt" "Encryption Key (for git tokens and sensitive data)"
generate_key_if_missing "$SECRETS_DIR/api_jwt_secret_key.txt" "API JWT Secret Key"
generate_key_if_missing "$SECRETS_DIR/mcp_jwt_secret_key.txt" "MCP JWT Secret Key"

echo ""
echo "🔒 Security Summary:"
echo "   - Secrets stored in: $SECRETS_DIR/"
echo "   - Directory permissions: $(stat -c '%a' "$SECRETS_DIR" 2>/dev/null || stat -f '%A' "$SECRETS_DIR")"
echo "   - File permissions: $(stat -c '%a' "$SECRETS_DIR"/*.txt 2>/dev/null || stat -f '%A' "$SECRETS_DIR"/*.txt | head -1)"
echo ""
