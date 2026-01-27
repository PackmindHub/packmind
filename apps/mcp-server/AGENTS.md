# MCP Server Application

Model Context Protocol server exposing Packmind capabilities to AI coding agents.

## Architecture

- **Framework**: Fastify 5 with MCP SDK integration
- **Protocol**: Model Context Protocol (MCP) for AI agent communication
- **Shared Architecture**: Reuses hexagonal architecture from API app
- **Database**: PostgreSQL with TypeORM (shared with API)
- **Authentication**: JWT-based authentication for user context
- **Error Tracking**: Sentry for production error monitoring

### MCP Integration

- Exposes Packmind tools (standards, recipes, skills) as MCP tools
- AI agents (Claude Code, Cursor, etc.) can invoke tools via MCP protocol
- Shares domain packages with API for consistent business logic

## Technologies

- **Fastify**: v5 - Fast HTTP server with low overhead
- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **TypeORM**: v0.3 - Shared entity management with API
- **PostgreSQL**: Primary database
- **JWT**: Authentication tokens for user identification
- **Sentry**: Error tracking and monitoring
- **TypeScript**: Type-safe tool definitions and handlers

## Main Commands

- Build: `nx build mcp-server`
- Test: `nx test mcp-server`
- Serve (development): `nx serve mcp-server` *(for isolated testing only; use `docker compose up` for regular local development)*
- Type check: `nx typecheck mcp-server`
- Lint: `nx lint mcp-server`

## Configuration

- **Port**: 3001 (default)
- **Environment Variables**: See `.env.example` in root
- **Database**: Shared TypeORM config with API
- **MCP Protocol**: WebSocket or stdio transport

## MCP Tools Exposed

- **Standards**: Query and apply coding standards
- **Commands**: Execute multi-step coding commands
- **Skills**: Access specialized AI agent capabilities
- **Deployments**: Manage standard/recipe deployments

