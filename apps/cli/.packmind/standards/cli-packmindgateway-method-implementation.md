# CLI Gateway Implementation

When adding new methods to the PackmindGateway class in the CLI application, use the PackmindHttpClient abstraction to avoid code duplication and maintain consistency. The older methods contain extensive boilerplate (manual API key decoding, JWT parsing, duplicated error handling) that should not be replicated.

## Rules

* Use `this.httpClient.getAuthContext()` to retrieve `organizationId` instead of manually decoding the API key and JWT
* Use `this.httpClient.request<ResponseType>()` for all HTTP calls instead of manual fetch with duplicated error handling
* Define the method return type using `Promise<ResponseType>` for type safety
* Pass HTTP method and body via options object to `httpClient.request()` for non-GET requests (e.g., `{ method: 'POST', body: data }`)
* Keep gateway methods concise by delegating authentication and error handling to `PackmindHttpClient`
* PackmindGateway must delegate to sub-gateways for each hexa
* Gateway interfaces should only expose `Gateway<UseCase>`
* Gateway implementations methods should always be typed using `Gateway<UseCase>`
* Gateway should never expose custom command or response types
