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

// A byte-order mark, a no-break space or a Unicode line separator carries no
// content; git still counts lines by \n, so none of these open a new line.
const IS_WHITESPACE = /[ \t\r\v\f\u00a0\ufeff\u2028\u2029]/;

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
    // `{/* ... */}` holds no expression: the braces exist only to carry the
    // comment, so they belong to it. Counting them as code would split a
    // multi-line JSX comment, whose `{/*` and `*/}` lines hold nothing else.
    if (
      node.kind === ts.SyntaxKind.JsxExpression &&
      node.expression === undefined
    ) {
      const open = node.getStart(sourceFile);
      ranges.push({ pos: open, end: open + 1 });
      ranges.push({ pos: node.end - 1, end: node.end });
    }

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
  let ranges;
  try {
    ranges = commentRanges(sourceFile, text);
  } catch (cause) {
    // The TypeScript walker asserts on some malformed JSX. Fail loudly and
    // name the file rather than let a bare assertion abort the whole run.
    throw new Error(`Could not classify ${fileName}: ${cause.message}`, {
      cause,
    });
  }
  for (const range of ranges) {
    const end = Math.min(range.end, text.length);
    for (let i = range.pos; i < end; i++) isCommentChar[i] = 1;
  }

  const lines = [];
  let nonWhitespace = 0;
  let inComment = 0;

  const flush = () => {
    if (nonWhitespace === 0) lines.push(BLANK);
    else if (nonWhitespace === inComment) lines.push(COMMENT);
    else lines.push(CODE);
    nonWhitespace = 0;
    inComment = 0;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\n') {
      flush();
      continue;
    }
    if (IS_WHITESPACE.test(char)) continue;
    nonWhitespace++;
    if (isCommentChar[i]) inComment++;
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
