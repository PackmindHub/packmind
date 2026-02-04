---
name: CLI Gateway Implementation
globs: apps/cli/src/infra/repositories/*Gateway.ts
alwaysApply: false
description: Standardize PackmindGateway methods in apps/cli/src/infra/repositories/*Gateway.ts to use PackmindHttpClient (getAuthContext for organizationId and request<ResponseType>() with Promise<ResponseType> return types and options-based non-GET bodies) to eliminate duplicated API key/JWT parsing and error-handling boilerplate and keep gateway logic consistent and concise.
---

## Standard: CLI Gateway Implementation

Standardize PackmindGateway methods in apps/cli/src/infra/repositories/\*Gateway.ts to use PackmindHttpClient (getAuthContext for organizationId and request<ResponseType>() with Promise<ResponseType> return types and options-based non-GET bodies) to eliminate duplicated API key/JWT parsing and error-handling boilerplate and keep gateway logic consistent and concise. :

- Define the method return type using `Promise<ResponseType>` for type safety
- Keep gateway methods concise by delegating authentication and error handling to `PackmindHttpClient`
- PackmindGateway must delegate to sub-gateways for each hexa
- Pass HTTP method and body via options object to `httpClient.request()` for non-GET requests (e.g., `{ method: 'POST', body: data }`)
- Use `this.httpClient.getAuthContext()` to retrieve `organizationId` instead of manually decoding the API key and JWT
- Use `this.httpClient.request<ResponseType>()` for all HTTP calls instead of manual fetch with duplicated error handling

Full standard is available here for further request: [CLI Gateway Implementation](../../../.packmind/standards/cli-packmindgateway-method-implementation.md)
