import Parser from 'web-tree-sitter';

export type AstExecutionResult = {
  line: number;
  character: number;
}[];

export class AstExecutorService {
  private parser: Parser | null = null;
  private initialized = false;

  public async executeProgram(
    program: string,
    fileContent: string,
  ): Promise<AstExecutionResult> {
    await this.initialize();

    if (!this.parser) {
      throw new Error('Parser not initialized');
    }

    const tree = this.parser.parse(fileContent);
    const ast = this.convertToSimpleAST(tree.rootNode);
    const checkSourceCode = this.createProgramFunction(program);
    const violationLines = checkSourceCode(ast);

    return violationLines.map((line: number) => ({
      line,
      character: 0,
    }));
  }

  private async initialize() {
    if (this.initialized) return;

    await Parser.init();

    // Try different paths for the WASM file
    const possiblePaths = [
      `${__dirname}/wasm/tree-sitter-typescript.wasm`, // Bundled path
      `${__dirname}/../wasm/tree-sitter-typescript.wasm`, // Alternative dist path
      `${__dirname}/../../wasm/tree-sitter-typescript.wasm`, // Up two levels
      `${__dirname}/../../../../../../../node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm`, // 7 levels up from dist/apps/cli/apps/cli/src/application/useCases
      `${process.cwd()}/node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm`, // Using cwd as fallback
    ];

    let Lang: Parser.Language | null;
    let loaded = false;

    for (const wasmPath of possiblePaths) {
      try {
        Lang = await Parser.Language.load(wasmPath);
        loaded = true;
        break;
      } catch {
        // Try next path
      }
    }

    if (!loaded) {
      throw new Error(
        'Failed to load tree-sitter-typescript WASM file from any known path',
      );
    }

    this.parser = new Parser();
    this.parser.setLanguage(Lang);
    this.initialized = true;
  }

  private convertToSimpleAST(node: Parser.SyntaxNode): unknown {
    const simpleNode: Record<string, unknown> = {
      type: node.type,
      text: node.text,
      line: node.startPosition.row + 1,
      children: [],
    };

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        (simpleNode.children as unknown[]).push(this.convertToSimpleAST(child));
      }
    }

    return simpleNode;
  }

  private createProgramFunction(program: string): (ast: unknown) => number[] {
    try {
      const func = new Function(
        'ast',
        `
        ${program}
        return checkSourceCode(ast);
      `,
      );
      return func as (ast: unknown) => number[];
    } catch (error) {
      throw new Error(`Failed to parse program: ${error}`);
    }
  }
}
