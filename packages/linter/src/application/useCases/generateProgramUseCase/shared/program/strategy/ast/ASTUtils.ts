import { PackmindLogger } from '@packmind/logger';
import { getErrorMessage } from '@packmind/node-utils';
import { ILinterAstPort } from '@packmind/types';
import { ProgrammingLanguage } from '@packmind/types';

const logger = new PackmindLogger('ASTUtils');

/**
 * Generate full AST from source code with NO filtering or shortening.
 * This should be used for program execution and validation, NOT for AI prompts.
 * Uses linter-ast adapter for supported languages (TypeScript, JavaScript, Java, Python, Go, etc.), otherwise falls back to js-playground.
 */
export async function getFullAstFromASourceCode(
  sourceCode: string,
  language: ProgrammingLanguage,
  linterAstAdapter?: ILinterAstPort | null,
): Promise<string> {
  if (language === 'GENERIC') {
    throw new Error('Cannot parse generic language');
  }

  // Try linter-ast for supported languages
  if (linterAstAdapter?.isLanguageSupported(language)) {
    logger.info(`Parse source code in ${language} using linter-ast module`);
    try {
      const astNode = await linterAstAdapter.parseSourceCode(
        sourceCode,
        language,
      );
      return JSON.stringify(astNode, null, 2);
    } catch (error) {
      throw new Error(
        `Unable to parse source code in language=${language} using linter-ast module, ${getErrorMessage(error)}`,
      );
    }
  }

  throw new Error(`Unsupported programming language=${language} for AST mode`);
}

/**
 * Generate partial AST from source code with filtering on line areas, pruned nodes, and text reduction.
 * This should be used when passing examples to AI prompts to reduce token usage and focus on relevant areas.
 */
export async function getPartialAstFromASourceCode(
  sourceCode: string,
  startLine: number,
  endLine: number,
  language: ProgrammingLanguage,
  linterAstAdapter?: ILinterAstPort | null,
): Promise<string> {
  const ast = await getFullAstFromASourceCode(
    sourceCode,
    language,
    linterAstAdapter,
  );
  const astJson = JSON.parse(ast);
  const astFiltered = filterNodesWithLine(astJson, startLine, endLine);
  if (!astFiltered) return '';
  const astPrunedWithUselessNodes = pruneAstWithUseLessNodes(astFiltered);
  const astFilteredWithLinesTooLong = shortenLongTextIfLongerThanPredefinedSize(
    astPrunedWithUselessNodes,
  );
  return JSON.stringify(astFilteredWithLinesTooLong);
}

function filterNodesWithLine(
  ast: AstNode,
  startLine: number,
  endLine: number,
): AstNode | null {
  // Check if the current node matches the criteria or if its children do
  const newNode = { ...ast };
  const offset = 2;
  if (Array.isArray(ast.children)) {
    // Recursively filter children
    newNode.children = ast.children
      .map((child) => filterNodesWithLine(child, startLine, endLine)) // Apply filtering to each child
      .filter((child) => child !== null); // Remove null children
  }

  // If this node or any of its children has the line number, return the node
  if (
    (newNode.line >= startLine - offset && newNode.line <= endLine + offset) ||
    (newNode.children && newNode.children.length > 0)
  ) {
    return newNode;
  }

  // If this node and its children don't match, return null
  return null;
}

/**
 * Recursively removes nodes from the AST when:
 * 1. node.type === node.text
 * 2. node.children.length === 0
 */
type AstNode = {
  type: string;
  text: string;
  children: AstNode[];
  line: number;
};
export function pruneAstWithUseLessNodes(ast: AstNode): AstNode {
  const newAst: AstNode = {
    ...ast,
    children: [],
  };

  for (const child of ast.children) {
    // Recursively prune children
    const prunedChild = pruneAstWithUseLessNodes(child);

    // Keep the child only if it does NOT match the prune criteria
    const shouldPrune =
      prunedChild.type === prunedChild.text &&
      prunedChild.children.length === 0;

    if (!shouldPrune) {
      newAst.children.push(prunedChild);
    }
  }

  return newAst;
}

export function shortenLongTextIfLongerThanPredefinedSize(
  ast: AstNode,
  textLimit = 300,
): AstNode {
  //Based on the parser, the text can ben very long (like the whole class for 'class_declaration' type). So we need to shorten it otherwise the prompt might be very long
  const newAst: AstNode = {
    ...ast,
    text:
      ast.text && ast.text.length > textLimit
        ? `${ast.text.substring(0, textLimit)} [...Truncated]`
        : ast.text,
    children: [],
  };

  if (ast.children && ast.children.length > 0) {
    for (const child of ast.children) {
      // Recursively shorten text for children
      newAst.children.push(
        shortenLongTextIfLongerThanPredefinedSize(child, textLimit),
      );
    }
  }

  return newAst;
}
