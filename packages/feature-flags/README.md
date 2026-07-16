# feature-flags

Pure, browser-safe shared package holding Packmind's feature-flag registry
(feature keys + email-domain rules) and the pure `isFeatureFlagEnabled`
decision function. Consumed by both the frontend (`@packmind/ui`) and the
backend so the flag decision never diverges.

This package is tagged `env:shared` and MUST stay browser-safe: do not add
`@packmind/node-utils`, TypeORM, or any node-only dependency.

## Building

Run `nx build feature-flags` to build the library.

## Running unit tests

Run `nx test feature-flags` to execute the unit tests via [Jest](https://jestjs.io).
