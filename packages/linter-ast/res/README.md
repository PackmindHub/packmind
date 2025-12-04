## Generate a WASM file from a tree sitter project

Short answer: use the Tree-sitter CLI to compile the grammar to WebAssembly.

Build the SCSS grammar to WASM

0. Prereqs
   • Node.js + npm
   • Tree-sitter CLI ≥ 0.25

npm i -g tree-sitter-cli

    •	One of: Emscripten or just use the official Docker image (simpler). Tree-sitter docs confirm you can compile grammars to WASM with tree-sitter build --wasm.  ￼

1. Install deps

git clone https://github.com/tree-sitter-grammars/tree-sitter-scss
cd tree-sitter-scss
npm ci

2. Build (two equivalent ways)

```
mkdir dist
```

A) With the CLI directly (works for any grammar)

# (Re-)generate parser sources from grammar.js

npx tree-sitter generate

# Build the WASM module

npx tree-sitter build --wasm -o dist/tree-sitter-scss.wasm

If you omit -o, Tree-sitter will choose a default filename like parser.wasm in the cwd. ￼

B) Via Docker (no local Emscripten setup)

docker run --rm -v "$PWD":/src ghcr.io/tree-sitter/tree-sitter:latest \
build --wasm -o /src/dist/tree-sitter-scss.wasm

(Using Docker/podman is an officially supported way to compile to Wasm.) ￼

3. Use the WASM in the browser

Load it with web-tree-sitter:

import { Parser } from 'web-tree-sitter';

await Parser.init(); // ensure tree-sitter.wasm is served
const SCSS = await Parser.Language.load('/dist/tree-sitter-scss.wasm');
const parser = new Parser();
parser.setLanguage(SCSS);

Remember to serve tree-sitter.wasm (from web-tree-sitter) alongside your app if bundling (Vite/Webpack notes in the docs). ￼

⸻

Why I didn’t point to an npm script name

I tried to open that exact package.json on GitHub but the page wouldn’t render via this browser. Regardless, Tree-sitter’s canonical method is tree-sitter build --wasm, and many grammars simply expose that behind an npm script like wasm or build:wasm. You can confirm available scripts locally with:

npm run

If you paste that package.json here, I can map its exact script name (e.g., npm run wasm) to the same command.
