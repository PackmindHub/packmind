import { ProgrammingLanguage } from '@packmind/types';
import JavaScriptParser from '../parsers/JavaScriptParser';

export class ConsoleLogRemovalService {
  private readonly jsParser: JavaScriptParser;

  constructor() {
    this.jsParser = new JavaScriptParser();
  }

  /**
   * Removes console method-call statements from JavaScript source code using AST parsing.
   * @throws Error if language is not JAVASCRIPT
   */
  async removeConsoleLogStatements(
    sourceCode: string,
    language: ProgrammingLanguage,
  ): Promise<string> {
    if (language !== ProgrammingLanguage.JAVASCRIPT) {
      throw new Error(
        `ConsoleLogRemovalService only supports JAVASCRIPT, received: ${language}`,
      );
    }

    try {
      // parseRaw (not parse) is needed here: the tree-sitter nodes carry
      // startIndex/endIndex byte offsets, which ASTNode does not expose.
      const tree = await this.jsParser.parseRaw(sourceCode);
      const ast = tree.rootNode;

      const ranges: [number, number][] = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const visit = (node: any) => {
        if (node.type === 'expression_statement') {
          const expr = node.firstChild;
          if (expr?.type === 'call_expression') {
            const callee = expr.child(0);
            if (callee?.text.startsWith('console.')) {
              ranges.push([node.startIndex, node.endIndex]);
            }
          }
        }

        for (let i = 0; i < node.childCount; i++) {
          visit(node.child(i));
        }
      };

      visit(ast);

      const lineRanges: [number, number][] = [];
      for (const [start, end] of ranges) {
        // Find the start of the line (including indentation)
        let lineStart = start;
        while (lineStart > 0 && sourceCode[lineStart - 1] !== '\n') {
          lineStart--;
        }

        // Find the end of the line
        let lineEnd = end;
        while (lineEnd < sourceCode.length && sourceCode[lineEnd] !== '\n') {
          lineEnd++;
        }
        // Include the newline if it exists
        if (lineEnd < sourceCode.length && sourceCode[lineEnd] === '\n') {
          lineEnd++;
        }

        lineRanges.push([lineStart, lineEnd]);
      }

      // Sort line ranges from last to first to safely slice
      lineRanges.sort((a, b) => b[0] - a[0]);

      let cleaned = sourceCode;
      for (const [lineStart, lineEnd] of lineRanges) {
        // Remove the entire line but preserve a newline to maintain blank line structure
        cleaned = cleaned.slice(0, lineStart) + '\n' + cleaned.slice(lineEnd);
      }

      return cleaned;
    } catch (error) {
      throw new Error(`Can not parse JS CODE ${error}`);
    }
  }
}
