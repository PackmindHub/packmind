import { marked, Token, Tokens } from 'marked';
import { diffArrays } from 'diff';

function normalize(text: string): string {
  return text.trim();
}

function tokenContentKey(token: Token): string {
  switch (token.type) {
    case 'space': {
      // Blank-line separators carry no content: give them a constant key so
      // they always align in the diff and keep their original raw bytes.
      return 'space';
    }
    case 'heading': {
      const heading = token as Tokens.Heading;
      return `heading:${heading.depth}:${normalize(heading.text)}`;
    }
    case 'paragraph': {
      const paragraph = token as Tokens.Paragraph;
      return `paragraph:${normalize(paragraph.text)}`;
    }
    case 'code': {
      const code = token as Tokens.Code;
      return `code:${code.lang ?? ''}:${code.text}`;
    }
    case 'list': {
      const list = token as Tokens.List;
      const itemsKey = list.items.map((item) => normalize(item.text)).join(' ');
      return `list:${list.ordered ? 'ordered' : 'unordered'}:${itemsKey}`;
    }
    default: {
      return `${token.type}:${token.raw.replace(/\s+/g, ' ').trim()}`;
    }
  }
}

function listItemContentKey(item: Tokens.ListItem): string {
  return normalize(item.text);
}

function ensureTrailingNewline(raw: string): string {
  return raw.endsWith('\n') ? raw : `${raw}\n`;
}

function reconcileList(oldList: Tokens.List, newList: Tokens.List): string {
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
  const oldTrailingNewlines = /\n*$/.exec(oldList.raw)?.[0] ?? '';

  return joined.replace(/\n*$/, '') + oldTrailingNewlines;
}

export function reconcileMarkdownForSave(
  oldValue: string,
  newValueFromEditor: string,
): string {
  if (oldValue === newValueFromEditor) {
    return oldValue;
  }

  marked.setOptions({ breaks: true, gfm: true });

  // Keep 'space' tokens: they hold the blank-line separators between blocks,
  // which are needed to rebuild the document from token raws.
  const oldTokens = [...marked.lexer(oldValue)];
  const newTokens = [...marked.lexer(newValueFromEditor)];

  // The editor may append trailing whitespace the original never had (e.g. a
  // final blank line). Drop a trailing 'space' token from the editor output
  // when the original document does not end with one, so an unchanged tail
  // stays byte-identical to oldValue.
  const lastNewToken = newTokens[newTokens.length - 1];
  const lastOldToken = oldTokens[oldTokens.length - 1];
  if (
    lastNewToken?.type === 'space' &&
    lastOldToken &&
    lastOldToken.type !== 'space'
  ) {
    newTokens.pop();
  }

  const oldKeys = oldTokens.map(tokenContentKey);
  const newKeys = newTokens.map(tokenContentKey);
  const changes = diffArrays(oldKeys, newKeys);

  if (changes.every((change) => !change.added && !change.removed)) {
    return oldValue;
  }

  let oldIdx = 0;
  let newIdx = 0;
  const parts: string[] = [];

  for (let ci = 0; ci < changes.length; ci++) {
    const change = changes[ci];
    const count = change.count ?? change.value.length;

    if (!change.added && !change.removed) {
      for (let i = 0; i < count; i++) {
        parts.push(oldTokens[oldIdx].raw);
        oldIdx++;
        newIdx++;
      }
      continue;
    }

    if (change.removed) {
      const next = changes[ci + 1];
      const nextCount = next ? (next.count ?? next.value.length) : 0;
      const isListPair =
        next &&
        next.added &&
        count === 1 &&
        nextCount === 1 &&
        oldTokens[oldIdx].type === 'list' &&
        newTokens[newIdx].type === 'list';

      if (isListPair) {
        parts.push(
          reconcileList(
            oldTokens[oldIdx] as Tokens.List,
            newTokens[newIdx] as Tokens.List,
          ),
        );
        oldIdx++;
        newIdx++;
        ci++;
      } else {
        oldIdx += count;
      }
      continue;
    }

    // change.added
    for (let i = 0; i < count; i++) {
      parts.push(newTokens[newIdx].raw);
      newIdx++;
    }
  }

  return parts.join('');
}
