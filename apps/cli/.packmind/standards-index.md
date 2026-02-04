# Packmind Standards Index

This standards index contains all available coding standards that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and apply proven practices in coding tasks.

## Available Standards

- [CLI Gateway Implementation](./standards/cli-packmindgateway-method-implementation.md) : Standardize PackmindGateway methods in apps/cli/src/infra/repositories/*Gateway.ts to use PackmindHttpClient (getAuthContext for organizationId and request<ResponseType>() with Promise<ResponseType> return types and options-based non-GET bodies) to eliminate duplicated API key/JWT parsing and error-handling boilerplate and keep gateway logic consistent and concise.


---

*This standards index was automatically generated from deployed standard versions.*