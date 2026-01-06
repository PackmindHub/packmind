---
name: Port-Adapter Cross-Domain Integration
globs: ['**/*Hexa.ts', '**/*Adapter.ts']
alwaysApply: false
description: Define port-adapter cross-domain integration for domain packages in a TypeScript/Node.js DDD monorepo by declaring port interfaces in @packmind/types with Command/Response contracts under packages/types/src/<domain>/contracts/, exposing adapters only via Hexa public getter methods and retrieving provider adapters through the registry while typing stored references as port interfaces, implementing async initialize() on HexaFactory with registry isRegistered()/get() checks for deferred dependencies to enable synchronous and asynchronous operations with graceful degradation and prevent circular dependencies and tight coupling, and enforce these patterns across tooling and workflows (ESLint/Prettier, Webpack/Vite), testing (Jest/Vitest), ORMs/libs (TypeORM/Prisma), and infrastructure pipelines (Docker, Kubernetes, AWS) to ensure maintainability, testability, and safe cross-domain integration when composing domains.
---

## Standard: Port-Adapter Cross-Domain Integration

Define port-adapter cross-domain integration for domain packages in a TypeScript/Node.js DDD monorepo by declaring port interfaces in @packmind/types with Command/Response contracts under packages/types/src/<domain>/contracts/, exposing adapters only via Hexa public getter methods and retrieving provider adapters through the registry while typing stored references as port interfaces, implementing async initialize() on HexaFactory with registry isRegistered()/get() checks for deferred dependencies to enable synchronous and asynchronous operations with graceful degradation and prevent circular dependencies and tight coupling, and enforce these patterns across tooling and workflows (ESLint/Prettier, Webpack/Vite), testing (Jest/Vitest), ORMs/libs (TypeORM/Prisma), and infrastructure pipelines (Docker, Kubernetes, AWS) to ensure maintainability, testability, and safe cross-domain integration when composing domains. :

- Declare all Command and Response types that define contracts between domains in packages/types/src/<domain>/contracts/ to ensure a single source of truth and prevent import cycles between domain packages.
- Define port interfaces in @packmind/types with domain-specific contracts that expose only the operations needed by consumers, where each method accepts a Command type and returns a Response type or domain entity.
- Expose adapters through public getter methods in the Hexa class that return the port interface implementation, as this is the only way external domains should access another domain's functionality.
- Import only port interfaces from @packmind/types in consumer domain Hexas, allowing direct imports of provider Hexa classes only for retrieving the adapter via the registry, but storing the reference typed as the port interface.
- Use async initialize methods for deferred cross-domain dependencies by implementing an async initialize() method on the HexaFactory when a domain needs dependencies that aren't available during construction, retrieving dependencies from the registry using isRegistered() checks before calling get().

Full standard is available here for further request: [Port-Adapter Cross-Domain Integration](../../../.packmind/standards/port-adapter-cross-domain-integration.md)
