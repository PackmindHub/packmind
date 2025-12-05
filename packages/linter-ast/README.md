# @packmind/linter-ast

AST Parser Package for Packmind - Provides Abstract Syntax Tree parsing for multiple programming languages using tree-sitter.

## Overview

This package provides a unified interface for parsing source code into Abstract Syntax Trees (ASTs) across multiple programming languages. It uses language-specific tree-sitter parsers, each isolated in its own sub-package to handle version incompatibilities.

## Architecture

The package follows a modular architecture with three layers:

### 1. Core Layer (`src/core/`)

- **BaseParser**: Abstract class that all language parsers extend
- **ParserRegistry**: Manages parser instances and handles lazy initialization
- **ParserError**: Custom error types for parser-specific failures
- **ASTNode**: Type definitions for the AST structure

### 2. Language Parsers (`src/parsers/`)

- **TypeScriptParser**: Parses TypeScript and TypeScript+JSX
- **JavaScriptParser**: Parses JavaScript and JavaScript+JSX
- **PythonParser**: Parses Python code
- **JavaParser**: Parses Java code

Each parser:

- Extends `BaseParser`
- Implements lazy initialization
- Delegates to language-specific sub-packages
- Returns a consistent `ASTNode` structure

### 3. Sub-Packages (`parsers/*/`)

Each language has its own NPM workspace sub-package:

- `@packmind/linter-ast-typescript` - Uses tree-sitter 0.21.0
- `@packmind/linter-ast-javascript` - Uses tree-sitter 0.25.0
- `@packmind/linter-ast-python` - Uses tree-sitter 0.25.0
- `@packmind/linter-ast-java` - Uses tree-sitter 0.21.1

**Why separate sub-packages?**

- Different languages require different tree-sitter versions
- Tree-sitter parsers are compiled native modules (C/C++)
- Version incompatibilities between tree-sitter core and language parsers
- Isolating dependencies prevents version conflicts

## Integration with Linter Package

The `linter-ast` package is integrated into the `@packmind/linter` package through the port-adapter pattern following DDD architecture:

### Port Interface (`@packmind/shared/types`)

```typescript
interface ILinterAstPort {
  parseSourceCode(
    sourceCode: string,
    language: ProgrammingLanguage,
  ): Promise<ASTNode>;
  isLanguageSupported(language: ProgrammingLanguage): boolean;
  getAvailableLanguages(): ProgrammingLanguage[];
}
```

### Adapter Implementation

```typescript
import { LinterAstAdapter } from '@packmind/linter-ast';

const adapter = new LinterAstAdapter();
const ast = await adapter.parseSourceCode(code, 'TYPESCRIPT');
```

### Injection into Linter Hexa

The adapter is automatically initialized in `LinterHexa.initialize()` and injected into:

- `LinterHexaFactory`
- `GenerateProgramJobFactory`
- AST generation utilities (with fallback to js-playground)

## Usage

### Direct API Usage

```typescript
import { ParserRegistry, LinterAstAdapter } from '@packmind/linter-ast';

// Using the registry directly
const registry = new ParserRegistry();
const parser = await registry.getParser('typescript');
const ast = await parser.parse('const x: number = 42;');

// Using the adapter (recommended)
const adapter = new LinterAstAdapter();
const isSupported = adapter.isLanguageSupported('TYPESCRIPT'); // true
const ast = await adapter.parseSourceCode('const x = 42;', 'TYPESCRIPT');
```

### Integration in Linter Package

The `getFullAstFromASourceCode` utility in `@packmind/linter` automatically uses the adapter when available:

```typescript
import { getFullAstFromASourceCode } from '@packmind/linter';

// This will use linter-ast if available, otherwise falls back to js-playground
const astJson = await getFullAstFromASourceCode(
  sourceCode,
  'TYPESCRIPT',
  linterAstAdapter,
);
```

## Supported Languages

Currently supported languages:

- ✅ **TypeScript** (and TSX) - Working
- ✅ **Java** - Working
- ⚠️ **JavaScript** (and JSX) - Requires Python < 3.12 for build
- ⚠️ **Python** - Requires Python < 3.12 for build

## Known Limitations

### Python 3.12+ Compatibility Issue

JavaScript and Python parsers fail to install on systems with Python 3.13+ due to:

- `node-gyp` (used by tree-sitter for native compilation) depends on `distutils`
- `distutils` was removed from Python 3.12+
- **Workaround**: Use Python 3.11 or earlier for development

To fix this issue on your system:

```bash
# Option 1: Use pyenv to switch Python versions
pyenv install 3.11.0
pyenv global 3.11.0

# Option 2: Use nvm's built-in Python
nvm use 20  # Uses Node 20's bundled Python

# Then reinstall
npm install
```

### Fallback Behavior

When a parser fails to initialize (e.g., due to the Python issue), the system gracefully falls back to the existing `js-playground` parsers, ensuring continued operation.

## Production Deployment

### Webpack Configuration

The API's webpack config externalizes parser sub-packages to ensure native modules work correctly:

```javascript
// apps/api/webpack.config.js
externals: ({ request }, callback) => {
  // Externalize parser sub-packages (they contain native tree-sitter modules)
  if (request?.startsWith('@packmind/linter-ast-')) {
    return callback(null, 'commonjs ' + request);
  }
  // ...
};
```

This ensures:

- Sub-packages are not bundled into the main script
- Native tree-sitter modules load correctly from `node_modules`
- Webpack doesn't try to bundle native `.node` files

## Testing

The linter-ast package uses tree-sitter parsers which rely on WASM (WebAssembly) files. To run tests, you need to enable Node.js experimental VM modules:

```bash
# Run all tests
NODE_OPTIONS="--experimental-vm-modules" npx nx test linter-ast

# Run specific parser tests
NODE_OPTIONS="--experimental-vm-modules" npx nx test linter-ast --testPathPattern="TypeScriptParser"

# Run linting
npx nx lint linter-ast
```

**Why is NODE_OPTIONS needed?**

Tree-sitter parsers load WASM files dynamically at runtime. Jest's default configuration doesn't support dynamic WASM loading, so we need to enable Node.js experimental VM modules support with the `--experimental-vm-modules` flag.

This flag is required for:

- Running tests locally
- CI/CD pipelines
- Any environment where tests are executed

The WASM files are automatically included in the built package via the project configuration (`res/**/*.wasm` in assets).

## Future Enhancements

Planned improvements:

1. **Add more languages**: Go, Ruby, C++, Kotlin, Swift, etc.
2. **Resolve Python 3.12+ issue**: Investigate alternatives to node-gyp or wait for tree-sitter updates
3. **Performance optimization**: Cache parsed ASTs for repeated calls
4. **Stream parsing**: Support for large files
5. **AST manipulation**: Add utilities to query and modify ASTs
6. **Error recovery**: Better handling of syntax errors in source code

## Contributing

When adding a new language:

1. Create a new sub-package in `parsers/new-language/`
2. Add the appropriate tree-sitter parser dependency
3. Create the parser class in `src/parsers/NewLanguageParser.ts`
4. Add the parser to `ParserRegistry.parserClasses`
5. Update `LinterAstAdapter.getAvailableLanguages()` and mapping
6. Add tests in `src/parsers/NewLanguageParser.spec.ts`
7. Update documentation

## License

Private - Packmind Internal Use Only
