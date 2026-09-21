# @packmind/integration-tests

This library was generated with [Nx](https://nx.dev).

Cross-domain integration tests that exercise several Packmind hexas together through a real `HexaRegistry`, running against an in-memory Postgres (`pg-mem`) and mocked Redis/BullMQ, so no real database, Redis, or Docker is required.

## Building

Run `nx build @packmind/integration-tests` to build the library.

## Running integration tests

Run `nx test @packmind/integration-tests` to execute the tests via [Jest](https://jestjs.io).
