/**
 * Line classifier for TypeScript / TSX sources.
 *
 * Each line of a file is put in exactly one bucket, following the same
 * convention as `cloc`:
 *   - BLANK   : only whitespace
 *   - COMMENT : every non-whitespace character belongs to a comment
 *   - CODE    : at least one non-whitespace character outside a comment
 *               (so `const a = 1; // why` counts as CODE, not COMMENT)
 *
 * Comment ranges come from the official TypeScript parser rather than a
 * regex, so template literals, regex literals, JSX text and strings that
 * contain `//` are not mistaken for comments.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let ts;
try {
  ts = require('typescript');
} catch {
  throw new Error(
    'The `typescript` package could not be resolved. Run `pnpm install` at the ' +
      'repository root, or point NODE_PATH at a directory that provides it.',
  );
}

export const BLANK = 0;
export const CODE = 1;
export const COMMENT = 2;

function scriptKindFor(fileName) {
  return fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

/**
 * Collect every comment range in the file.
 *
 * Every comment in a TypeScript source is leading trivia of exactly one
 * token (including the end-of-file token), so walking the token leaves of
 * the syntax tree is exhaustive.
 */
function commentRanges(sourceFile, text) {
  const ranges = [];
  const seen = new Set();

  const visit = (node) => {
    const children = node.getChildren(sourceFile);
    if (children.length > 0) {
      for (const child of children) visit(child);
      return;
    }
    // JSX text is raw content, not trivia: `// hello` between two tags is
    // rendered to the user, not a comment. Scanning it for trivia would
    // report it as one.
    if (node.kind === ts.SyntaxKind.JsxText) return;
    // Both halves are needed: `getLeadingCommentRanges` only starts collecting
    // after a line break, so a comment sitting on the same line as the previous
    // token is reported by `getTrailingCommentRanges` instead. Together they
    // cover the whole trivia region in front of the token.
    for (const found of [
      ts.getTrailingCommentRanges(text, node.pos),
      ts.getLeadingCommentRanges(text, node.pos),
    ]) {
      if (!found) continue;
      for (const range of found) {
        if (seen.has(range.pos)) continue;
        seen.add(range.pos);
        ranges.push(range);
      }
    }
  };

  visit(sourceFile);
  return ranges;
}

/**
 * @returns {Uint8Array} one BLANK / CODE / COMMENT entry per line.
 */
export function classifyLines(fileName, text) {
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKindFor(fileName),
  );

  // Character mask: true when the character is inside a comment.
  const isCommentChar = new Uint8Array(text.length);
  for (const range of commentRanges(sourceFile, text)) {
    const end = Math.min(range.end, text.length);
    for (let i = range.pos; i < end; i++) isCommentChar[i] = 1;
  }

  const lines = [];
  let nonWhitespace = 0;
  let inComment = 0;
  let outsideBraces = 0;
  let hasOpenBrace = false;
  let hasCloseBrace = false;

  const flush = () => {
    const outsideComment = nonWhitespace - inComment;
    if (nonWhitespace === 0) lines.push(BLANK);
    else if (outsideComment === 0) lines.push(COMMENT);
    // `{/* ... */}` is the JSX comment idiom: the braces only exist to host
    // the comment, so the line is a comment line rather than a code line.
    else if (
      inComment > 0 &&
      outsideBraces === 0 &&
      hasOpenBrace &&
      hasCloseBrace
    )
      lines.push(COMMENT);
    else lines.push(CODE);

    nonWhitespace = 0;
    inComment = 0;
    outsideBraces = 0;
    hasOpenBrace = false;
    hasCloseBrace = false;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\n') {
      flush();
      continue;
    }
    if (char === ' ' || char === '\t' || char === '\r') continue;
    nonWhitespace++;
    if (isCommentChar[i]) {
      inComment++;
    } else if (char === '{') {
      hasOpenBrace = true;
    } else if (char === '}') {
      hasCloseBrace = true;
    } else {
      outsideBraces++;
    }
  }
  // Trailing line without a final newline.
  if (text.length > 0 && !text.endsWith('\n')) flush();

  return Uint8Array.from(lines);
}

/**
 * @returns {{blank: number, code: number, comment: number}}
 */
export function countLines(fileName, text) {
  const classes = classifyLines(fileName, text);
  const totals = { blank: 0, code: 0, comment: 0 };
  for (const cls of classes) {
    if (cls === BLANK) totals.blank++;
    else if (cls === CODE) totals.code++;
    else totals.comment++;
  }
  return totals;
}
