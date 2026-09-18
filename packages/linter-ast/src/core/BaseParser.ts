import { ASTNode } from './types/ast.types';
import { resolve, dirname, join } from 'path';
import { existsSync } from 'fs';

export abstract class BaseParser {
  protected initialized = false;
  private static externalWasmDirectory: string | null = null;

  abstract initialize(): Promise<void>;
  abstract parse(sourceCode: string): Promise<ASTNode>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract parseRaw(sourceCode: string): Promise<any>;
  abstract getLanguage(): string;

  /**
   * Set an external directory where WASM files are located
   * This is useful for CLI executables that extract WASM files at runtime
   */
  public static setWasmDirectory(directory: string): void {
    BaseParser.externalWasmDirectory = directory;
  }

  protected static getTreeSitterWasmPaths(): string[] {
    const paths: string[] = [];

    // If an external WASM directory is set, prioritize it
    if (BaseParser.externalWasmDirectory) {
      paths.push(BaseParser.externalWasmDirectory);
    }

    // For Bun executables, WASM files should be in tree-sitter/ subdirectory
    // next to the executable
    const execDir = process.argv[0] ? dirname(process.argv[0]) : process.cwd();

    // For npm packages, get the directory of the main script
    const scriptDir = require.main?.filename
      ? dirname(require.main.filename)
      : process.cwd();

    paths.push(
      // Next to the main script (for npm packages)
      scriptDir,
      join(scriptDir, 'tree-sitter'),
      // Next to the Bun executable
      join(execDir, 'tree-sitter'),
      join(process.cwd(), 'tree-sitter'),
      join(process.cwd(), 'dist/apps/cli-executables/tree-sitter'),
      resolve(__dirname, 'tree-sitter'),
      resolve(__dirname, '../../res'),
      resolve(__dirname, '../../../packages/linter-ast/res'),
    );

    return paths;
  }

  protected static getTreeSitterLocateFile(): (fileName: string) => string {
    const wasmDirs = BaseParser.getTreeSitterWasmPaths();

    return (fileName: string) => {
      for (const dir of wasmDirs) {
        const fullPath = join(dir, fileName);
        if (existsSync(fullPath)) {
          return fullPath;
        }
      }
      return join(process.cwd(), fileName);
    };
  }

  protected static getLanguageWasmPaths(languageName: string): string[] {
    const wasmDirs = BaseParser.getTreeSitterWasmPaths();
    const wasmFileName = `tree-sitter-${languageName}.wasm`;

    return wasmDirs
      .map((dir) => join(dir, wasmFileName))
      .concat([
        resolve(__dirname, `tree-sitter/${wasmFileName}`),
        resolve(__dirname, wasmFileName),
        resolve(__dirname, `res/${wasmFileName}`),
        resolve(__dirname, `../../res/${wasmFileName}`),
        resolve(__dirname, `../res/${wasmFileName}`),
        resolve(__dirname, `../../../packages/linter-ast/res/${wasmFileName}`),
        join(process.cwd(), `packages/linter-ast/res/${wasmFileName}`),
      ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected nodeToJson(node: any): ASTNode {
    return {
      type: node.type,
      text: node.type === 'program' ? '<skipped>' : node.text,
      line: node.startPosition.row,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: node.children.map((child: any) => this.nodeToJson(child)),
    };
  }
}
