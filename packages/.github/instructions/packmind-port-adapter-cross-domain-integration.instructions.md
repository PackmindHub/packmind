---
applyTo: '**/*Adapter.ts,**/*Hexa.ts'
---
# Standard: Port-Adapter Cross-Domain Integration

This standard defines how domain packages communicate with each other through the Port/Adapter pattern in our DDD monorepo architecture. By following these rules, you prevent circular dependencies, ma... :
* Declare all Command and Response types that define contracts between domains in packages/types/src/<domain>/contracts/ to ensure a single source of truth and prevent import cycles between domain packages.
* Define port interfaces in @packmind/types with domain-specific contracts that expose only the operations needed by consumers, where each method accepts a Command type and returns a Response type or domain entity.
* Expose adapters through public getter methods in the Hexa class that return the port interface implementation, as this is the only way external domains should access another domain's functionality.
* Import only port interfaces from @packmind/types in consumer domain Hexas, allowing direct imports of provider Hexa classes only for retrieving the adapter via the registry, but storing the reference typed as the port interface.
* Use async initialize methods for deferred cross-domain dependencies by implementing an async initialize() method on the HexaFactory when a domain needs dependencies that aren't available during construction, retrieving dependencies from the registry using isRegistered() checks before calling get().

Full standard is available here for further request: [Port-Adapter Cross-Domain Integration](../../.packmind/standards/port-adapter-cross-domain-integration.md)