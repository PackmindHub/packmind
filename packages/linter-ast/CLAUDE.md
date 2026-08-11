# Linter AST Package

Wraps tree-sitter to parse source files into a language-agnostic AST for the linter.

## Grammars are committed WASM files

Tree-sitter grammars are **not** resolved from `node_modules` at runtime — they are committed
`.wasm` files in `packages/linter-ast/res/`, alongside `tree-sitter.wasm` (the runtime itself). A
`ParserInitializationError` or `ParserNotAvailableError` from `src/core/ParserError.ts` is usually a
missing or misnamed file in `res/`, not a bug in the parser class.

This package also carries its own `package-lock.json` for the grammar toolchain, separate from the
workspace's pnpm lockfile.

## Registry

`src/core/ParserRegistry.ts` holds a `parserClasses` record mapping a lowercase language key to a
`BaseParser` subclass, and lazily instantiates + `initialize()`s each one on first use.

Registered keys: `typescript`, `javascript`, `python`, `java`, `go`, `kotlin`, `swift`, `ruby`,
`php`, `csharp`, `cpp`, `css`, `scss`, `html`, `json`, `yaml`.

> `TypeScriptTSXParser` exists in `src/parsers/` and is exported from `src/index.ts`, but is **not**
> in `parserClasses` — `getParser('tsx')` throws. Use it directly if you need TSX.

Other entry points: `src/core/BaseParser.ts` (the class to extend) and
`src/application/LinterAstAdapter.ts` (what consumers outside the package use).

## Adding a language

1. Drop `tree-sitter-<lang>.wasm` into `res/`.
2. Add `src/parsers/<Lang>Parser.ts` extending `BaseParser`, exported as `default`.
3. Register it in `parserClasses` in `ParserRegistry.ts` — this is the step that makes
   `getParser()` and `getAvailableParsers()` see it.
4. Export it from `src/index.ts` (the convenience exports use
   `export { default as <Lang>Parser }`).
5. Add a spec modelled on `src/parsers/TypeScriptParser.spec.ts`.

Shared package conventions (env tags, layout, `/test` subpath, branded IDs): [../CLAUDE.md](../CLAUDE.md)
