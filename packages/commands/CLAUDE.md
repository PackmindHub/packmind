# Commands Package

The "commands" domain — multi-step coding commands, their versions, and their deployment.

## This package was renamed from `recipes`

The rename was never carried through the internals, so the same concept has two names depending on
where you look. Expect this rather than treating it as a bug:

- **Types and public API use `Command*`** — `Command`, `CommandVersion`, `createCommandId`,
  `CommandService`, `CommandVersionService`, `CommandSchema`, `commandsSchemas`, `CommandsHexa`,
  `CommandsAdapter`.
- **Internals still say "recipe"** — local variables, logger origins (e.g.
  `const origin = 'RecipeService'` in `src/application/services/CommandService.ts`), log messages,
  and TypeORM relation names such as `inverseSide: 'recipe'` in
  `src/infra/schemas/CommandSchema.ts`.
- `@packmind/recipes/test` is still aliased to `packages/commands/test/index.ts` in
  `tsconfig.base.json`, alongside `@packmind/commands/test`.

### Rules

- **Do not opportunistically rename the residue.** It reaches into schemas, relation names and other
  packages; a partial rename breaks persistence in ways tests will not catch.
- When editing an existing file, match the names already in it. Use `Command*` for anything new.
- When searching this domain, grep for **both** spellings — `grep -i recipe` finds call sites that
  `grep Command` misses.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
