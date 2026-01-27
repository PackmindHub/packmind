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
- Serve (development): `nx serve mcp-server`
- Type check: `nx typecheck mcp-server`
- Lint: `nx lint mcp-server`

## Key Patterns

### MCP Tool Exposure

- Tools defined in `src/tools/` directory
- Each tool exports MCP tool definition with schema and handler
- Tools invoke use cases from domain packages
- Tool handlers receive user context from JWT authentication

### Shared Domain Packages

- Reuses packages from `packages/` (standards, recipes, skills, etc.)
- Shares TypeORM entities and repositories with API
- Maintains consistency in business logic across API and MCP server

### Authentication Flow

- Client provides JWT token in MCP connection headers
- Server validates token and extracts user context
- User context passed to tool handlers for authorization

### Error Handling

- MCP-specific error formatting for AI agents
- User-friendly error messages for tool failures
- Sentry integration for production error tracking

## Configuration

- **Port**: 3001 (default)
- **Environment Variables**: See `.env.example` in root
- **Database**: Shared TypeORM config with API
- **MCP Protocol**: WebSocket or stdio transport

## Testing

- Unit tests: `*.spec.ts` files colocated with source
- Follow standards in `.claude/rules/packmind/standard-testing-good-practices.md`
- Test tool handlers with mocked use cases
- Integration tests with MCP SDK

## MCP Tools Exposed

- **Standards**: Query and apply coding standards
- **Recipes**: Execute multi-step coding recipes
- **Skills**: Access specialized AI agent capabilities
- **Deployments**: Manage standard/recipe deployments

## Related Documentation

- See `.claude/rules/packmind/` for coding standards
- See `packages/CLAUDE.md` for domain package details
- See root `CLAUDE.md` for monorepo-wide rules
- See [MCP Documentation](https://modelcontextprotocol.io) for protocol details
