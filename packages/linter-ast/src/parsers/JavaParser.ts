import { BaseParser } from '../core/BaseParser';
import { ASTNode } from '../core/types/ast.types';
import { ParserInitializationError } from '../core/ParserError';
import * as TreeSitter from 'web-tree-sitter';
import { existsSync } from 'fs';

export default class JavaParser extends BaseParser {
  private parser?: TreeSitter.Parser;

  async initialize(): Promise<void> {
    try {
      let lang: TreeSitter.Language | null = null;

      await TreeSitter.Parser.init({
        locateFile: BaseParser.getTreeSitterLocateFile(),
      });

      // Try multiple paths to find the WASM file
      const wasmPaths = BaseParser.getLanguageWasmPaths('java');

      for (const wasmPath of wasmPaths) {
        if (existsSync(wasmPath)) {
          try {
            lang = await TreeSitter.Language.load(wasmPath);
            break;
          } catch {
            continue;
          }
        }
      }

      if (!lang) {
        throw new Error(
          `Failed to load tree-sitter-java WASM file. Tried paths: ${wasmPaths.join(', ')}`,
        );
      }

      this.parser = new TreeSitter.Parser();
      this.parser.setLanguage(lang);
      this.initialized = true;
    } catch (error) {
      throw new ParserInitializationError(
        'java',
        'Failed to load Java WASM parser module',
        error as Error,
      );
    }
  }

  async parse(sourceCode: string): Promise<ASTNode> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.parser) {
      throw new ParserInitializationError('java', 'Parser not initialized');
    }

    const tree = this.parser.parse(sourceCode);
    if (!tree) {
      throw new ParserInitializationError(
        'java',
        'Failed to parse source code',
      );
    }
    return this.nodeToJson(tree.rootNode);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async parseRaw(sourceCode: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.parser) {
      throw new ParserInitializationError('java', 'Parser not initialized');
    }

    const tree = this.parser.parse(sourceCode);
    if (!tree) {
      throw new ParserInitializationError(
        'java',
        'Failed to parse source code',
      );
    }
    return tree;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected override nodeToJson(node: any): ASTNode {
    return {
      type: node.type,
      text: node.type === 'program' ? '<skipped>' : node.text,
      line: node.startPosition.row + 1,
      children: Array.from({ length: node.childCount }, (_, i) => {
        const child = node.child(i);
        return child ? this.nodeToJson(child) : null;
      }).filter((c): c is ASTNode => c !== null),
    };
  }

  getLanguage(): string {
    return 'java';
  }
}
