# Install Packmind on your server

Find how to deploy Packmind using Docker Compose or Kubernetes, and how to customize the setup.

## With Docker Compose

For Linux and MacOS users, run this script to create a `./packmind` folder with a Docker Compose setup inside:

```bash
mkdir packmind && \
cd packmind && \
curl -fsSL -o install.sh https://raw.githubusercontent.com/PackmindHub/packmind/refs/heads/main/dockerfile/prod/setup-packmind-compose.sh && \
chmod +x install.sh && \
./install.sh
```

Once this command is executed, Packmind is now available at http://localhost:8081/, and you can start using it right away.

Update later with `docker compose pull && docker compose up -d`.

## With Helm on Kubernetes

Get started on the [Helm Chart GitHub repository](https://github.com/PackmindHub/packmind-ai-helm-chart) to deploy Packmind on Kubernetes.

## Connect your LLM (Optional but important)

Connecting a LLM offers a better experience when distributing your standards and recipes in your Git Repositories, while it's _not mandatory_ and you can use Packmind without this.

_OpenAI_ is the only currently supported AI Provider.

If you use Docker Compose, you'll have to update the `docker-compose.yml` file.

```yaml
x-openai-config: &openai-config
  OPENAI_API_KEY: <YOUR_KEY>
```

Restart then with:

```bash
docker compose up -d
```

## Configure deployment and environment variables

### Override environment variables

#### With Docker Compose

You can override both `api` and `mcp` sections of the `docker-compose.yaml` file.

Here is an example of how to add the `SMTP_FROM` variable to Docker Compose.

```yaml
  api:
    image: packmind/api:${PACKMIND_TAG:-latest}
    container_name: packmind-api
    ports:
      - '3000:3000'
    environment:
      <<: [*database-url, *redis-config, *openai-config]
      SMTP_FROM: username@acme.org
```

#### With Helm Chart

Follow the instructions on the [Helm Chart GitHub repository](https://github.com/PackmindHub/packmind-ai-helm-chart) on how the YAML values file.

### List of Environment variables

Database Configuration:

- `DATABASE_URL`️ - PostgreSQL database connection URL used by the API, TypeORM migrations, and data sources

Application URLs & CORS:

- `APP_WEB_URL` - Base URL of the web application, used for generating links in password reset and invitation emails
- `PACKMIND_MCP_BASE_URL` - Base URL for the Packmind MCP (Model Context Protocol) server (should be `APP_WEB_URL/mcp` in most cases)
- `CORS_ORIGINS` - Comma-separated list of allowed origins for CORS (Cross-Origin Resource Sharing) configuration

Redis Configuration:

- `REDIS_URI` - Full Redis connection URI used for caching and SSE (Server-Sent Events) client connections

SMTP Configuration:

- `SMTP_HOST` - SMTP server hostname for sending emails
- `SMTP_PORT` - SMTP server port number
- `SMTP_SECURE` - Whether to use secure connection (TLS/SSL) for SMTP
- `SMTP_USER` - Username for SMTP authentication
- `SMTP_PASSWORD` - Password for SMTP authentication
- `SMTP_FROM` - Default sender email address for outgoing emails
- `SMTP_IS_EXCHANGE_SERVER` - Flag indicating if the SMTP server is a Microsoft Exchange server

Authentication & Security:

- `JWT_SECRET` - Secret key used for signing and verifying JWT tokens for authentication
- `ENCRYPTION_KEY` - Key used for encrypting sensitive data like password reset tokens, invitations, and git provider credentials
- `MAX_LOGIN_ATTEMPTS` - Maximum number of failed login attempts before rate limiting is triggered (defaults to a configured value if not set)
- `LOGIN_BAN_TIME_SECONDS` - Duration (in seconds) for which user will not be allow to try to login again.

API Integration:

- `OPENAI_API_KEY` - API key for accessing OpenAI services for customizing standards and recipes for AI Agents.

Rate Limiting:

- `RATE_LIMIT_MAX_REQUESTS` - Maximum number of requests allowed within the rate limit time window (defaults to 100)
- `RATE_LIMIT_TIME_WINDOW` - Time window in milliseconds for rate limiting (defaults to 60000ms / 1 minute)

Monitoring & Debugging:

- `PACKMIND_LOG_LEVEL` - Log level for Packmind logger (e.g., 'debug', 'info', 'warn', 'error')
