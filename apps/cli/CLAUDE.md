# CLI Application

Packmind CLI. Nx project name is `packmind-cli`.

## Command structure

`src/main.ts` aggregates subcommands with cmd-ts's `subcommands()` helper.

Everything else about authoring a command — the `*Command.ts` / `*Handler.ts` split, grouping into
per-domain subdirectories under `src/infra/commands/`, gateway methods, use case structure — is owned
by the three standards in `apps/cli/.claude/rules/packmind/`: *CLI Command Structure*, *CLI Gateway
Implementation*, *CLI Use Case Structure*. A command file must **not** contain handler logic.

## Stack specifics

- **cmd-ts** for type-safe argument parsing and routing
- **tree-sitter** parsers, embedded as WASM for portability
- **esbuild** for bundling; **Bun** for standalone executables

## Builds — two different things

| Command | Produces |
| --- | --- |
| `./node_modules/.bin/nx build packmind-cli` (also `pnpm run packmind-cli:build`) | a **CJS bundle** at `dist/apps/cli/main.cjs` — not an executable |
| `./node_modules/.bin/nx build-executable-all packmind-cli` | standalone binaries via Bun; also `-linux`, `-macos`, `-windows`, or `build-executable` for the current platform |

To run the CLI after the first form, use `node ./dist/apps/cli/main.cjs` (see the root `CLAUDE.md`).

`test` and `lint` follow the generic form in the root `CLAUDE.md`.
