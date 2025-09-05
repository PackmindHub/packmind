# Production Deployment Files

This directory contains production deployment files for self-hosted Packmind installations.

## Files

### `docker-compose.yml`

Production Docker Compose configuration with:

- Secure secrets management using Docker Compose native secrets
- Production-ready service configurations
- Proper dependencies and networking

### `setup-production-secrets.sh`

Executable script that generates secure encryption keys and JWT secrets for production deployment:

- Creates `secrets/` directory with proper permissions
- Generates cryptographically secure random keys
- Provides security guidance and usage instructions

## Quick Start

1. **Generate secrets:**

   ```bash
   ./dockerfile/prod/setup-production-secrets.sh
   ```

2. **Deploy the stack:**

   ```bash
   # Deploy with default 'latest' tag (HTTPS with secure cookies):
   docker compose up -d

   # Deploy over HTTP (insecure cookies allowed):
   COOKIE_SECURE=false docker compose up -d

   # Deploy with OpenAI integration:
   OPENAI_API_KEY=your_openai_api_key docker compose up -d

   # Deploy with specific tag:
   PACKMIND_TAG=v1.2.3 docker compose up -d

   # Deploy with all options:
   PACKMIND_TAG=v1.2.3 COOKIE_SECURE=false OPENAI_API_KEY=your_openai_api_key docker compose up -d
   ```

3. **Monitor deployment:**
   ```bash
   docker compose -f dockerfile/prod/docker-compose.yaml ps
   ```

## Security Features

- **Docker Compose Secrets**: Uses native Docker Compose secrets (no Swarm required)
- **File-based Security**: Secrets mounted as read-only files in `/run/secrets/`
- **Granular Access**: Each service only gets the secrets it needs
- **Unique Keys**: Each deployment has its own encryption keys
- **No Environment Variable Exposure**: Secrets never appear in logs or process lists

## Configuration Options

### COOKIE_SECURE

Controls whether authentication cookies require HTTPS:

- `COOKIE_SECURE=true` (default): Cookies only sent over HTTPS - **recommended for production**
- `COOKIE_SECURE=false`: Cookies sent over HTTP - **use for development or HTTP-only deployments**

**Security Note**: Setting `COOKIE_SECURE=false` reduces security as authentication cookies can be intercepted over HTTP. Only use this for development environments or when HTTPS is not available.

### OPENAI_API_KEY

Enables OpenAI integration for AI-powered features:

- `OPENAI_API_KEY=your_api_key`: Enables OpenAI API calls for AI features
- Unset or empty: AI features will be disabled

**Note**: This affects both the API and MCP server services. Make sure you have a valid OpenAI API key if you want to use AI-powered features.

## Images

The production deployment uses these open-source images:

- `packmind/api-oss:${PACKMIND_TAG:-latest}` - API backend service
- `packmind/mcp-oss:${PACKMIND_TAG:-latest}` - MCP (Model Context Protocol) server
- `packmind/front-oss:${PACKMIND_TAG:-latest}` - Frontend web application

The `PACKMIND_TAG` environment variable can be set to deploy specific versions (defaults to `latest`).
