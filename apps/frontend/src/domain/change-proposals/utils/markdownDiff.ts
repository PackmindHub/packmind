import { marked, Token, Tokens, TokensList } from 'marked';
import { diffArrays, diffWords } from 'diff';

function toTokensList(tokens: Token[]): TokensList {
  const list = tokens as TokensList;
  list.links = {};
  return list;
}

function renderToken(token: Token): string {
  return marked.parser(toTokensList([token]));
}

function renderInlineContent(text: string): string {
  return marked.parseInline(text) as string;
}

function renderListAllMarked(list: Tokens.List, tag: 'del' | 'ins'): string {
  const listTag = list.ordered ? 'ol' : 'ul';
  const items = list.items
    .map((item) => {
      const content = renderInlineContent(item.text);
      const checkbox = item.task
        ? `<input type="checkbox" disabled ${item.checked ? 'checked' : ''}> `
        : '';
      return `<li><${tag}>${checkbox}${content}</${tag}></li>`;
    })
    .join('\n');
  return `<${listTag}>\n${items}\n</${listTag}>\n`;
}

function renderListWithItemDiff(
  oldList: Tokens.List,
  newList: Tokens.List,
): string {
  const listTag = newList.ordered ? 'ol' : 'ul';
  const oldTexts = oldList.items.map((item) => item.text.trim());
  const newTexts = newList.items.map((item) => item.text.trim());
  const changes = diffArrays(oldTexts, newTexts);

  let oldIdx = 0;
  let newIdx = 0;
  const items: string[] = [];

  for (const change of changes) {
    const count = change.count ?? change.value.length;
    if (!change.added && !change.removed) {
      for (let i = 0; i < count; i++) {
        const item = newList.items[newIdx++];
        const content = renderInlineContent(item.text);
        const checkbox = item.task
          ? `<input type="checkbox" disabled ${item.checked ? 'checked' : ''}> `
          : '';
        items.push(`<li>${checkbox}${content}</li>`);
        oldIdx++;
      }
    } else if (change.removed) {
      for (let i = 0; i < count; i++) {
        const item = oldList.items[oldIdx++];
        const content = renderInlineContent(item.text);
        const checkbox = item.task
          ? `<input type="checkbox" disabled ${item.checked ? 'checked' : ''}> `
          : '';
        items.push(`<li><del>${checkbox}${content}</del></li>`);
      }
    } else {
      for (let i = 0; i < count; i++) {
        const item = newList.items[newIdx++];
        const content = renderInlineContent(item.text);
        const checkbox = item.task
          ? `<input type="checkbox" disabled ${item.checked ? 'checked' : ''}> `
          : '';
        items.push(`<li><ins>${checkbox}${content}</ins></li>`);
      }
    }
  }

  return `<${listTag}>\n${items.join('\n')}\n</${listTag}>\n`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderCodeBlockDiff(
  oldToken: Tokens.Code,
  newToken: Tokens.Code,
): string {
  const langClass = newToken.lang ? ` class="language-${newToken.lang}"` : '';
  const changes = diffWords(oldToken.text, newToken.text);
  const diffHtml = changes
    .map((change) => {
      const escaped = escapeHtml(change.value);
      if (change.added) return `<span class="diff-ins">${escaped}</span>`;
      if (change.removed) return `<span class="diff-del">${escaped}</span>`;
      return escaped;
    })
    .join('');
  return `<pre><code${langClass}>${diffHtml}\n</code></pre>\n`;
}

function renderWordDiffInBlock(
  oldToken: Token & { text: string },
  newToken: Token & { text: string },
  blockTag: string,
): string {
  const changes = diffWords(oldToken.text, newToken.text);
  const inlineHtml = changes
    .map((change) => {
      if (change.added)
        return `<ins>${renderInlineContent(change.value)}</ins>`;
      if (change.removed)
        return `<del>${renderInlineContent(change.value)}</del>`;
      return renderInlineContent(change.value);
    })
    .join('');
  return `<${blockTag}>${inlineHtml}</${blockTag}>\n`;
}

function renderDeletedToken(token: Token): string {
  if (token.type === 'list') {
    return renderListAllMarked(token as Tokens.List, 'del');
  }
  if (token.type === 'paragraph') {
    const content = renderInlineContent((token as Tokens.Paragraph).text);
    return `<p><del>${content}</del></p>\n`;
  }
  if (token.type === 'heading') {
    const heading = token as Tokens.Heading;
    const content = renderInlineContent(heading.text);
    return `<h${heading.depth}><del>${content}</del></h${heading.depth}>\n`;
  }
  if (token.type === 'code') {
    const code = token as Tokens.Code;
    const langClass = code.lang ? ` class="language-${code.lang}"` : '';
    const escaped = escapeHtml(code.text);
    return `<pre><code${langClass}><span class="diff-del">${escaped}</span>\n</code></pre>\n`;
  }
  return `<del>${renderToken(token)}</del>`;
}

function renderAddedToken(token: Token): string {
  if (token.type === 'list') {
    return renderListAllMarked(token as Tokens.List, 'ins');
  }
  if (token.type === 'paragraph') {
    const content = renderInlineContent((token as Tokens.Paragraph).text);
    return `<p><ins>${content}</ins></p>\n`;
  }
  if (token.type === 'heading') {
    const heading = token as Tokens.Heading;
    const content = renderInlineContent(heading.text);
    return `<h${heading.depth}><ins>${content}</ins></h${heading.depth}>\n`;
  }
  if (token.type === 'code') {
    const code = token as Tokens.Code;
    const langClass = code.lang ? ` class="language-${code.lang}"` : '';
    const escaped = escapeHtml(code.text);
    return `<pre><code${langClass}><span class="diff-ins">${escaped}</span>\n</code></pre>\n`;
  }
  return `<ins>${renderToken(token)}</ins>`;
}

function renderModifiedPair(oldToken: Token, newToken: Token): string {
  if (oldToken.type === 'list' && newToken.type === 'list') {
    return renderListWithItemDiff(
      oldToken as Tokens.List,
      newToken as Tokens.List,
    );
  }
  if (oldToken.type === 'paragraph' && newToken.type === 'paragraph') {
    return renderWordDiffInBlock(
      oldToken as Tokens.Paragraph,
      newToken as Tokens.Paragraph,
      'p',
    );
  }
  if (oldToken.type === 'heading' && newToken.type === 'heading') {
    const oldH = oldToken as Tokens.Heading;
    const newH = newToken as Tokens.Heading;
    return renderWordDiffInBlock(oldH, newH, `h${newH.depth}`);
  }
  if (oldToken.type === 'code' && newToken.type === 'code') {
    return renderCodeBlockDiff(
      oldToken as Tokens.Code,
      newToken as Tokens.Code,
    );
  }
  return renderDeletedToken(oldToken) + renderAddedToken(newToken);
}

export const markdownDiffCss = {
  '& ins, & .diff-ins': {
    backgroundColor: 'var(--Palette-Semantic-Green800)',
    padding: '0 2px',
    borderRadius: '2px',
    textDecoration: 'none',
  },
  '& del, & .diff-del': {
    backgroundColor: 'var(--Palette-Semantic-Red800)',
    padding: '0 2px',
    borderRadius: '2px',
  },
};

export function buildDiffHtml(oldValue: string, newValue: string): string {
  marked.setOptions({ breaks: true, gfm: true });

  const oldTokens = marked.lexer(oldValue).filter((t) => t.type !== 'space');
  const newTokens = marked.lexer(newValue).filter((t) => t.type !== 'space');

  const oldRaws = oldTokens.map((t) => t.raw);
  const newRaws = newTokens.map((t) => t.raw);
  const changes = diffArrays(oldRaws, newRaws);

  let oldIdx = 0;
  let newIdx = 0;
  const parts: string[] = [];

  for (let ci = 0; ci < changes.length; ci++) {
    const change = changes[ci];
    const count = change.count ?? change.value.length;

    if (!change.added && !change.removed) {
      for (let i = 0; i < count; i++) {
        parts.push(renderToken(newTokens[newIdx++]));
        oldIdx++;
      }
    } else if (change.removed) {
      const next = changes[ci + 1];
      if (next && next.added) {
        const nextCount = next.count ?? next.value.length;
        if (count === 1 && nextCount === 1) {
          parts.push(
            renderModifiedPair(oldTokens[oldIdx++], newTokens[newIdx++]),
          );
        } else {
          for (let i = 0; i < count; i++) {
            parts.push(renderDeletedToken(oldTokens[oldIdx++]));
          }
          for (let i = 0; i < nextCount; i++) {
            parts.push(renderAddedToken(newTokens[newIdx++]));
          }
        }
        ci++;
      } else {
        for (let i = 0; i < count; i++) {
          parts.push(renderDeletedToken(oldTokens[oldIdx++]));
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        parts.push(renderAddedToken(newTokens[newIdx++]));
      }
    }
  }

  return parts.join('');
}
