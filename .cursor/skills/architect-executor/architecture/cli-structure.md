# CLI Architecture — Command Structure, Use Cases & Gateways

## Command Structure

Commands are split into two files: the definition (`*Command.ts`) and the handler (`*Handler.ts`).

### Directory Layout

```
apps/cli/src/
├── domain/
│   ├── useCases/       — use case interfaces
│   └── errors/         — custom domain error classes
├── application/
│   └── useCases/       — use case implementations
└── infra/
    ├── commands/
    │   └── {domain}/
    │       ├── {Name}Command.ts    — cmd-ts definition (name, description, args only)
    │       └── {Name}Handler.ts    — handler function (validation, execution, output)
    └── gateways/
        └── PackmindGateway.ts      — delegates to sub-gateways per hexa
```

### Command File Rules

- `*Command.ts` contains ONLY: `name`, `description`, `args` — no inline handler logic
- `*Handler.ts` exports the handler function, imported and referenced via the `handler` property
- Validate and transform input at the START of the handler, before any business logic
- Instantiate `PackmindCliHexa` with `PackmindLogger` AFTER validation, never before

### Output Contract

- `outputError()` for all error output — never raw `console.error` or `console.log`
- `outputSuccess()` for all success output — never raw `console.log`
- `outputHelp()` for contextual guidance when domain errors occur (suggest follow-up commands)
- `exit(1)` after error output, `exit(0)` after success
- Human-readable by default; JSON via `--json` or `--output json` when applicable

### Error Handling in Handlers

- Explicitly catch and check error types — no generic catch-all
- Each domain error type maps to a specific user-facing message + `outputHelp()` suggestion
- Stack traces only in `--debug` mode

---

## CLI Use Case Structure

CLI use cases follow the same domain/application split as backend, but are public (no auth).

### Rules

- Interfaces in `src/domain/useCases/`, implementations in `src/application/useCases/`
- All interfaces extend `IPublicUseCase<Command, Response>` from `@packmind/types`
- Command and Response types defined in the same file as the interface
- Use cases produce **no user output** — no `console.log`, no `outputError`. They throw or return.
- Throw custom domain errors from `src/domain/errors/` — never generic `Error`
- Error classes: one per file, named descriptively (`PackageNotFoundError`, `AccessDenied`, `InvalidStandardFormat`)
- Document which error types a use case can throw — handlers need to know what to catch

---

## Gateway Implementation

All HTTP communication goes through `PackmindHttpClient` — never manual `fetch`.

### Rules

- Use `this.httpClient.getAuthContext()` to get `organizationId` — NEVER manually decode API key/JWT
- Use `this.httpClient.request<ResponseType>()` for all HTTP calls
- Pass method and body via options: `{ method: 'POST', body: data }`
- Return `Promise<ResponseType>` for type safety
- `PackmindGateway` delegates to sub-gateways per hexa — no monolithic gateway
- Gateway interfaces only expose `Gateway<UseCase>` type — never custom command/response types
- Gateway implementations typed as `Gateway<UseCase>`

---

## Backward Compatibility

CLI output in JSON mode and exit codes are a **public API** — breaking changes require deprecation:

- Flag names and positional argument order do not change between versions without warnings
- Deprecated flags still work but emit a deprecation warning pointing to the replacement
- New required flags are never added to existing commands — use defaults or new commands
