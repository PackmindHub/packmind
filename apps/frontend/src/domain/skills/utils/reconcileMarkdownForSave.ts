import { marked, Marked, Token, Tokens } from 'marked';
import { diffArrays } from 'diff';

/**
 * Collapses whitespace runs to a single space everywhere EXCEPT inside
 * `<code>` elements: code content (inline spans and fenced blocks alike) is
 * byte-significant — `foo  --bar` and `foo --bar` are different programs.
 */
function collapseWhitespaceOutsideCode(html: string): string {
  return html
    .split(/(<code[^>]*>[\s\S]*?<\/code>)/)
    .map((segment, index) =>
      index % 2 === 1 ? segment : segment.replace(/\s+/g, ' '),
    )
    .join('');
}

/**
 * Normalizes marked-rendered HTML so that WYSIWYG serializer noise (Milkdown)
 * never registers as a content change, while every genuine edit survives:
 * - adjacent identical emphasis runs separated only by whitespace
 *   (`**a** **b**` → `</strong> <strong>`) render the same as one run;
 * - `<p>` boundaries inside list items (tight vs loose lists) are noise;
 * - whitespace amount is presentational — except inside `<code>`.
 *
 * Because keys are built from RENDERED HTML, escaped literals and markup can
 * never be conflated by construction: `\*star\*` renders as the text `*star*`
 * while `*star*` renders as `<em>star</em>`.
 *
 * NOTE: keys are rendered with `breaks: false` (CommonMark semantics): a bare
 * `\n` soft wrap renders as plain whitespace and stays noise (Milkdown may
 * re-wrap or join lines freely), while a `\`+newline hard break renders as
 * `<br>` and is therefore a significant, detectable edit.
 */
function normalizeRenderedHtml(html: string): string {
  let out = html;
  out = out.replace(/<\/strong>(\s+)<strong>/g, '$1');
  out = out.replace(/<\/em>(\s+)<em>/g, '$1');
  out = out.replace(/<\/?p>/g, ' ');
  // Whitespace around block-level tags is render-insignificant (unlike around
  // inline tags such as <strong>, where `a <strong>b` differs from
  // `a<strong>b`). Block tags cannot occur inside <code>: code content is
  // entity-escaped by marked, so this is safe to apply globally.
  out = out.replace(
    /\s*(<\/?(?:ul|ol|li|h[1-6]|pre|blockquote|table|thead|tbody|tr|th|td|hr)(?:\s[^>]*)?\/?>)\s*/g,
    '$1',
  );
  return collapseWhitespaceOutsideCode(out).trim();
}

/**
 * Dedicated renderer for key generation, isolated from the module-global
 * marked options: keys use `breaks: false` so soft wraps stay whitespace
 * noise while `\`+newline hard breaks render as `<br>` and count as edits.
 */
const keyRenderer = new Marked({ gfm: true, breaks: false });

/**
 * Cache for rendered keys, cleared on each reconciliation call: the same raw
 * is keyed both at block level and again inside list reconciliation.
 */
const renderKeyCache = new Map<string, string>();

function renderKey(markdownSource: string): string {
  const cached = renderKeyCache.get(markdownSource);
  if (cached !== undefined) {
    return cached;
  }
  const key = normalizeRenderedHtml(
    keyRenderer.parse(markdownSource) as string,
  );
  renderKeyCache.set(markdownSource, key);
  return key;
}

function listItemContentKey(item: Tokens.ListItem): string {
  return renderKey(item.text);
}

function tokenContentKey(token: Token): string {
  return renderKey(token.raw);
}

function ensureTrailingNewline(raw: string): string {
  return raw.endsWith('\n') ? raw : `${raw}\n`;
}

function listTrailingNewlines(list: Tokens.List): string {
  return /\n*$/.exec(list.raw)?.[0] ?? '';
}

function reconcileList(oldList: Tokens.List, newList: Tokens.List): string {
  // A change of list kind or ordered start renumbers every rendered item:
  // no old item raw can be kept, so take the new list wholesale.
  const startChanged =
    oldList.ordered &&
    Number(oldList.start || 1) !== Number(newList.start || 1);
  if (oldList.ordered !== newList.ordered || startChanged) {
    return newList.raw.replace(/\n*$/, '') + listTrailingNewlines(oldList);
  }

  const oldKeys = oldList.items.map(listItemContentKey);
  const newKeys = newList.items.map(listItemContentKey);
  const changes = diffArrays(oldKeys, newKeys);

  let oldIdx = 0;
  let newIdx = 0;
  const itemRaws: string[] = [];

  for (const change of changes) {
    const count = change.count ?? change.value.length;
    if (!change.added && !change.removed) {
      for (let i = 0; i < count; i++) {
        itemRaws.push(oldList.items[oldIdx].raw);
        oldIdx++;
        newIdx++;
      }
    } else if (change.removed) {
      oldIdx += count;
    } else {
      for (let i = 0; i < count; i++) {
        itemRaws.push(newList.items[newIdx].raw);
        newIdx++;
      }
    }
  }

  // Defensive join: items must be newline-separated, but the last item's raw
  // must keep its original bytes (marked never includes the list's trailing
  // newline in the last item's raw — it lives only in the list token's raw).
  const joined = itemRaws
    .map((raw, index) =>
      index < itemRaws.length - 1 ? ensureTrailingNewline(raw) : raw,
    )
    .join('');

  // The list's trailing newlines must come from the OLD list raw, not from
  // whichever item happens to end up last: non-final item raws carry a '\n'
  // separator, so e.g. removing the last item would otherwise leave a trailing
  // newline the original document never had.
  return joined.replace(/\n*$/, '') + listTrailingNewlines(oldList);
}

/**
 * A content block plus the raw bytes of the blank-line 'space' token(s) that
 * immediately follow it. Keeping spacing attached to its preceding block (and
 * out of the diff) means inter-block spacing is always taken from whichever
 * document the block itself came from — the editor can neither add nor drop
 * blank lines around blocks it did not change.
 */
interface SpacedBlock {
  token: Token;
  spacing: string;
}

interface SpacedDocument {
  /** Blank lines before the first content block. */
  leading: string;
  blocks: SpacedBlock[];
}

function toSpacedBlocks(tokens: Token[]): SpacedDocument {
  let leading = '';
  const blocks: SpacedBlock[] = [];
  for (const token of tokens) {
    if (token.type === 'space') {
      if (blocks.length > 0) {
        blocks[blocks.length - 1].spacing += token.raw;
      } else {
        leading += token.raw;
      }
    } else {
      blocks.push({ token, spacing: '' });
    }
  }
  return { leading, blocks };
}

function blockRaw(block: SpacedBlock): string {
  return block.token.raw + block.spacing;
}

/** Appends separator bytes so a genuinely added block starts on a new line. */
function ensureBlockSeparation(parts: string[]): void {
  const joined = parts.join('');
  if (joined === '' || joined.endsWith('\n\n')) {
    return;
  }
  parts.push(joined.endsWith('\n') ? '\n' : '\n\n');
}

export function reconcileMarkdownForSave(
  oldValue: string,
  newValueFromEditor: string,
): string {
  if (oldValue === newValueFromEditor) {
    return oldValue;
  }

  marked.setOptions({ breaks: true, gfm: true });
  renderKeyCache.clear();

  const { leading: oldLeading, blocks: oldBlocks } = toSpacedBlocks([
    ...marked.lexer(oldValue),
  ]);
  const { blocks: newBlocks } = toSpacedBlocks([
    ...marked.lexer(newValueFromEditor),
  ]);

  const oldKeys = oldBlocks.map((block) => tokenContentKey(block.token));
  const newKeys = newBlocks.map((block) => tokenContentKey(block.token));
  const changes = diffArrays(oldKeys, newKeys);

  if (changes.every((change) => !change.added && !change.removed)) {
    return oldValue;
  }

  let oldIdx = 0;
  let newIdx = 0;
  // The original document's leading blank lines are kept: the editor cannot
  // have edited "before the first block".
  const parts: string[] = [oldLeading];

  for (let ci = 0; ci < changes.length; ci++) {
    const change = changes[ci];
    const count = change.count ?? change.value.length;

    if (!change.added && !change.removed) {
      for (let i = 0; i < count; i++) {
        parts.push(blockRaw(oldBlocks[oldIdx]));
        oldIdx++;
        newIdx++;
      }
      continue;
    }

    if (change.removed) {
      const next = changes[ci + 1];
      const nextCount = next ? (next.count ?? next.value.length) : 0;
      const isReplacePair =
        next !== undefined &&
        next.added === true &&
        count === 1 &&
        nextCount === 1;

      if (
        isReplacePair &&
        oldBlocks[oldIdx].token.type === 'list' &&
        newBlocks[newIdx].token.type === 'list'
      ) {
        // Same-position list: reconcile item by item, keep old spacing.
        parts.push(
          reconcileList(
            oldBlocks[oldIdx].token as Tokens.List,
            newBlocks[newIdx].token as Tokens.List,
          ),
          oldBlocks[oldIdx].spacing,
        );
        oldIdx++;
        newIdx++;
        ci++;
      } else if (isReplacePair) {
        // Block edited in place: take the new content but keep the old
        // document's spacing after it, so the editor's spacing noise around
        // an edit cannot leak into the result.
        parts.push(newBlocks[newIdx].token.raw, oldBlocks[oldIdx].spacing);
        oldIdx++;
        newIdx++;
        ci++;
      } else {
        oldIdx += count;
      }
      continue;
    }

    // change.added: genuinely new blocks — use the editor's bytes and spacing.
    for (let i = 0; i < count; i++) {
      ensureBlockSeparation(parts);
      parts.push(blockRaw(newBlocks[newIdx]));
      newIdx++;
    }
  }

  return parts.join('');
}
