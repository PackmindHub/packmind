---
name: 'Port-Adapter Cross-Domain Integration'
paths: ['**/*Adapter.ts', '**/*Hexa.ts']
alwaysApply: false
description: 'Define port interfaces and cross-domain contracts in @packmind/types and packages/types/src/<domain>/contracts/, expose adapters via Hexa getters, and use async HexaFactory.initialize() with registry isRegistered()/get() checks to prevent circular dependencies, maintain loose coupling, and support resilient synchronous and asynchronous cross-domain operations.'
---

## Standard: Port-Adapter Cross-Domain Integration

Define port interfaces and cross-domain contracts in @packmind/types and packages/types/src/<domain>/contracts/, expose adapters via Hexa getters, and use async HexaFactory.initialize() with registry isRegistered()/get() checks to prevent circular dependencies, maintain loose coupling, and support resilient synchronous and asynchronous cross-domain operations. :

- Declare all Command and Response types that define contracts between domains in packages/types/src/<domain>/contracts/ to ensure a single source of truth and prevent import cycles between domain packages.
- Define port interfaces in @packmind/types with domain-specific contracts that expose only the operations needed by consumers, where each method accepts a Command type and returns a Response type or domain entity.
- Expose adapters through public getter methods in the Hexa class that return the port interface implementation, as this is the only way external domains should access another domain's functionality.
- Import only port interfaces from @packmind/types in consumer domain Hexas, allowing direct imports of provider Hexa classes only for retrieving the adapter via the registry, but storing the reference typed as the port interface.
- Use async initialize methods for deferred cross-domain dependencies by implementing an async initialize() method on the HexaFactory when a domain needs dependencies that aren't available during construction, retrieving dependencies from the registry using isRegistered() checks before calling get().

Full standard is available here for further request: [Port-Adapter Cross-Domain Integration](../../../.packmind/standards/port-adapter-cross-domain-integration.md)
