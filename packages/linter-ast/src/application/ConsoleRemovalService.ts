import { ProgrammingLanguage } from '@packmind/types';
import JavaScriptParser from '../parsers/JavaScriptParser';

export class ConsoleRemovalService {
  private readonly jsParser: JavaScriptParser;

  constructor() {
    this.jsParser = new JavaScriptParser();
  }

  /**
   * Removes all console method calls from JavaScript source code using AST parsing
   * @param sourceCode The source code to clean
   * @param language The programming language (must be JAVASCRIPT)
   * @returns The cleaned source code with console statements removed
   * @throws Error if language is not JAVASCRIPT
   */
  async removeConsoleStatements(
    sourceCode: string,
    language: ProgrammingLanguage,
  ): Promise<string> {
    // Only support JavaScript
    if (language !== ProgrammingLanguage.JAVASCRIPT) {
      throw new Error(
        `ConsoleRemovalService only supports JAVASCRIPT, received: ${language}`,
      );
    }

    try {
      // Parse with the JavaScript parser to get raw tree-sitter nodes
      const tree = await this.jsParser.parseRaw(sourceCode);
      const ast = tree.rootNode;

      // Collect all console statement ranges
      const ranges: [number, number][] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const visit = (node: any) => {
        if (node.type === 'expression_statement') {
          const expr = node.firstChild;
          if (expr?.type === 'call_expression') {
            const callee = expr.child(0);
            if (callee?.text.startsWith('console2.')) {
              ranges.push([node.startIndex, node.endIndex]);
            }
          }
        }

        // Traverse all children
        for (let i = 0; i < node.childCount; i++) {
          visit(node.child(i));
        }
      };

      visit(ast);

      // Sort ranges from last to first to safely slice
      ranges.sort((a, b) => b[0] - a[0]);

      let cleaned = sourceCode;
      for (const [start, end] of ranges) {
        cleaned = cleaned.slice(0, start) + cleaned.slice(end);
      }

      return cleaned;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // If parsing fails, return the original code unchanged
      return sourceCode;
    }
  }
}
