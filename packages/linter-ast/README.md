# @packmind/linter-ast

AST Parser Package for Packmind - Provides Abstract Syntax Tree parsing for multiple programming languages using tree-sitter.

## Overview

This package provides a unified interface for parsing source code into Abstract Syntax Trees (ASTs) across multiple programming languages. It uses `web-tree-sitter` together with tree-sitter grammars committed as `.wasm` files in `res/`, so no native module is compiled at install time.

## Architecture

The package follows a modular architecture with three layers:

### 1. Core Layer (`src/core/`)

- **BaseParser**: Abstract class that all language parsers extend
- **ParserRegistry**: Manages parser instances and handles lazy initialization
- **ParserError**: Custom error types for parser-specific failures
- **ASTNode**: Type definitions for the AST structure

### 2. Language Parsers (`src/parsers/`)

One parser class per grammar: `TypeScriptParser` (also used for TSX), `JavaScriptParser` (also used for JSX), `PythonParser`, `JavaParser`, `GoParser`, `KotlinParser`, `SwiftParser`, `RubyParser`, `PHPParser`, `CSharpParser`, `CPPParser`, `CSSParser`, `SCSSParser`, `HTMLParser`, `JSONParser` and `YAMLParser`.

Each parser:

- Extends `BaseParser`
- Implements lazy initialization
- Loads its `tree-sitter-<language>.wasm` grammar from `res/`
- Returns a consistent `ASTNode` structure

### 3. Application Layer (`src/application/`)

- **LinterAstAdapter**: Implements the `ILinterAstPort` port consumed by other packages
- **ConsoleLogRemovalService**: Strips `console.*` statements from source code (JavaScript only)

## Integration with the Linter Execution Package

The `linter-ast` package is consumed by the `@packmind/linter-execution` package through the port-adapter pattern following DDD architecture:

### Port Interface (`@packmind/types`)

```typescript
interface ILinterAstPort {
  parseSourceCode(
    sourceCode: string,
    language: ProgrammingLanguage,
  ): Promise<ASTNode>;
  isLanguageSupported(language: ProgrammingLanguage): boolean;
  getAvailableLanguages(): ProgrammingLanguage[];
  removeConsoleStatements(
    sourceCode: string,
    language: ProgrammingLanguage,
  ): Promise<string>;
}
```

### Adapter Implementation

```typescript
import { LinterAstAdapter } from '@packmind/linter-ast';
import { ProgrammingLanguage } from '@packmind/types';

const adapter = new LinterAstAdapter();
const ts = ProgrammingLanguage.TYPESCRIPT;
const ast = await adapter.parseSourceCode(code, ts);
```

### Injection

`ExecuteLinterProgramsUseCase` in `@packmind/linter-execution` takes an `ILinterAstPort` as its first constructor argument and defaults to `new LinterAstAdapter()`.

## Usage

### Direct API Usage

```typescript
import { ParserRegistry, LinterAstAdapter } from '@packmind/linter-ast';
import { ProgrammingLanguage } from '@packmind/types';

// Using the registry directly
const registry = new ParserRegistry();
const parser = await registry.getParser('typescript');
const ast = await parser.parse('const x: number = 42;');

// Using the adapter (recommended)
const ts = ProgrammingLanguage.TYPESCRIPT;
const adapter = new LinterAstAdapter();
const isSupported = adapter.isLanguageSupported(ts); // true
const adapterAst = await adapter.parseSourceCode('const x = 42;', ts);
```

### Locating the WASM grammars

`BaseParser` searches a list of known directories for the `.wasm` files. When the grammars are extracted somewhere else at runtime (as the CLI does), point the parsers at that directory first:

```typescript
import { BaseParser } from '@packmind/linter-ast';

BaseParser.setWasmDirectory(wasmDir);
```

## Supported Languages

`LinterAstAdapter.getAvailableLanguages()` returns: TypeScript, TypeScript (TSX), JavaScript, JavaScript (JSX), C++, Go, Kotlin, CSS, C#, PHP, Python, Ruby, JSON, HTML, Java, Swift, SCSS and YAML.

TSX and JSX are parsed with the TypeScript and JavaScript grammars respectively; `res/tree-sitter-tsx.wasm` ships but no parser loads it.

## Known Limitations

### Missing CSS grammar

`CSSParser` is registered under the `css` key and `CSS` is reported as available, but `res/` contains no `tree-sitter-css.wasm` (only `tree-sitter-scss.wasm`). Parsing CSS therefore throws a `ParserInitializationError` until the grammar file is added.

### YAMLParser is not re-exported

`YAMLParser` is registered in `ParserRegistry` and reachable through the adapter, but unlike the other 15 parser classes it is not exported from `src/index.ts`.

### Console statement removal is JavaScript-only

`removeConsoleStatements()` throws for any language other than `ProgrammingLanguage.JAVASCRIPT`.

## Production Deployment

### Webpack Configuration

The API's webpack config bundles every `@packmind/*` package, including `linter-ast`, and bundles `web-tree-sitter` rather than externalizing it:

```javascript
// apps/api/webpack.config.js
externals: ({ request }, callback) => {
  // Bundle all @packmind packages (including linter-ast with tree-sitter dependencies)
  if (request?.startsWith('@packmind/')) {
    return callback();
  }
  // ...
};
```

The grammar files themselves are not bundled: in proprietary mode the config copies `packages/linter-ast/res` into `dist/apps/api` with `CopyWebpackPlugin`, so the parsers find the `.wasm` files next to the main script at runtime.

## Testing

The linter-ast package uses tree-sitter parsers which rely on WASM (WebAssembly) files, so its tests need Node.js experimental VM modules enabled. The `test` target in `project.json` already sets `NODE_OPTIONS='--experimental-vm-modules'` (and `--runInBand`), so no extra setup is needed:

```bash
# Run all tests (Jest, via packages/linter-ast/jest.config.ts)
./node_modules/.bin/nx test linter-ast

# Run linting
./node_modules/.bin/nx lint linter-ast
```

**Why is NODE_OPTIONS needed?**

Tree-sitter parsers load WASM files dynamically at runtime. Jest's default configuration doesn't support dynamic WASM loading, so we need to enable Node.js experimental VM modules support with the `--experimental-vm-modules` flag.

If you invoke Jest directly instead of through Nx, set the flag yourself.

The WASM files are automatically included in the built package via the project configuration (`res/**/*.wasm` in the `build` target's assets).

## Future Enhancements

Planned improvements:

1. **Add more languages**: Rust, Dart, SQL, etc.
2. **Performance optimization**: Cache parsed ASTs for repeated calls
3. **Stream parsing**: Support for large files
4. **AST manipulation**: Add utilities to query and modify ASTs
5. **Error recovery**: Better handling of syntax errors in source code

## Contributing

When adding a new language:

1. Drop the `tree-sitter-<language>.wasm` grammar into `res/` (see [res/README.md](./res/README.md) for how to build one)
2. Create the parser class in `src/parsers/NewLanguageParser.ts`, extending `BaseParser` and exported as `default`
3. Add the parser to `ParserRegistry.parserClasses`
4. Update `LinterAstAdapter.getAvailableLanguages()` and mapping
5. Export it from `src/index.ts`
6. Add tests in `src/parsers/NewLanguageParser.spec.ts`
7. Update documentation

## License

Private - Packmind Internal Use Only
