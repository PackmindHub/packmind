---
name: 'CLI Gateway Implementation'
paths: apps/cli/src/infra/repositories/*Gateway.ts
alwaysApply: false
description: 'Standardize apps/cli/src/infra/repositories/*Gateway.ts PackmindGateway methods to use PackmindHttpClient (getAuthContext and typed request<T> with options for non-GET), delegate to sub-gateways, and expose only Gateway<UseCase> interfaces to reduce boilerplate, enforce type safety, and keep authentication and error handling consistent.'
---

## Standard: CLI Gateway Implementation

Standardize apps/cli/src/infra/repositories/\*Gateway.ts PackmindGateway methods to use PackmindHttpClient (getAuthContext and typed request<T> with options for non-GET), delegate to sub-gateways, and expose only Gateway<UseCase> interfaces to reduce boilerplate, enforce type safety, and keep authentication and error handling consistent. :

- Define the method return type using `Promise<ResponseType>` for type safety
- Gateway implementations methods should always be typed using `Gateway<UseCase>`
- Gateway interfaces should only expose `Gateway<UseCase>`
- Gateway should never expose custom command or response types
- Keep gateway methods concise by delegating authentication and error handling to `PackmindHttpClient`
- PackmindGateway must delegate to sub-gateways for each hexa
- Pass HTTP method and body via options object to `httpClient.request()` for non-GET requests (e.g., `{ method: 'POST', body: data }`)
- Use `this.httpClient.getAuthContext()` to retrieve `organizationId` instead of manually decoding the API key and JWT
- Use `this.httpClient.request<ResponseType>()` for all HTTP calls instead of manual fetch with duplicated error handling

Full standard is available here for further request: [CLI Gateway Implementation](../../../.packmind/standards/cli-packmindgateway-method-implementation.md)
