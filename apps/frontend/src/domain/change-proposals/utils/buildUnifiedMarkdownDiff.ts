import { marked, Token } from 'marked';
import { diffArrays } from 'diff';
import { buildDiffHtml } from './markdownDiff';

export interface MarkdownBlock {
  html: string;
  isChanged: boolean;
  diffHtml?: string; // HTML showing the diff for this block
  type: 'paragraph' | 'heading' | 'list' | 'code' | 'other';
}

/**
 * Builds a list of markdown blocks with change tracking for unified view.
 * Each block knows if it was changed and includes the diff HTML for tooltip display.
 */
export function buildUnifiedMarkdownDiff(
  oldValue: string,
  newValue: string,
): MarkdownBlock[] {
  marked.setOptions({ breaks: true, gfm: true });

  const oldTokens = marked.lexer(oldValue).filter((t) => t.type !== 'space');
  const newTokens = marked.lexer(newValue).filter((t) => t.type !== 'space');

  const oldRaws = oldTokens.map((t) => t.raw);
  const newRaws = newTokens.map((t) => t.raw);
  const changes = diffArrays(oldRaws, newRaws);

  let oldIdx = 0;
  let newIdx = 0;
  const blocks: MarkdownBlock[] = [];

  for (let ci = 0; ci < changes.length; ci++) {
    const change = changes[ci];
    const count = change.count ?? change.value.length;

    if (!change.added && !change.removed) {
      // Unchanged blocks
      for (let i = 0; i < count; i++) {
        const token = newTokens[newIdx++];
        blocks.push({
          html: renderToken(token),
          isChanged: false,
          type: getTokenType(token),
        });
        oldIdx++;
      }
    } else if (change.removed) {
      const next = changes[ci + 1];
      if (next && next.added) {
        // Modified blocks
        const nextCount = next.count ?? next.value.length;
        if (count === 1 && nextCount === 1) {
          // Single token modified
          const oldToken = oldTokens[oldIdx++];
          const newToken = newTokens[newIdx++];
          blocks.push({
            html: renderToken(newToken),
            isChanged: true,
            diffHtml: buildDiffHtml(oldToken.raw, newToken.raw),
            type: getTokenType(newToken),
          });
        } else {
          // Multiple tokens deleted and added
          // Treat all added tokens as changed
          oldIdx += count; // Skip deleted tokens
          for (let i = 0; i < nextCount; i++) {
            const newToken = newTokens[newIdx++];
            blocks.push({
              html: renderToken(newToken),
              isChanged: true,
              diffHtml: buildDiffHtml('', newToken.raw), // Show as pure addition
              type: getTokenType(newToken),
            });
          }
        }
        ci++; // Skip the next (added) change
      } else {
        // Pure deletion - skip in unified view (don't show deleted content)
        for (let i = 0; i < count; i++) {
          oldIdx++;
        }
      }
    } else {
      // Pure additions
      for (let i = 0; i < count; i++) {
        const newToken = newTokens[newIdx++];
        blocks.push({
          html: renderToken(newToken),
          isChanged: true,
          diffHtml: buildDiffHtml('', newToken.raw), // Show as pure addition
          type: getTokenType(newToken),
        });
      }
    }
  }

  return blocks;
}

function renderToken(token: Token): string {
  const list = [token] as Token[] & { links: Record<string, never> };
  list.links = {};
  return marked.parser(list);
}

function getTokenType(
  token: Token,
): 'paragraph' | 'heading' | 'list' | 'code' | 'other' {
  if (token.type === 'paragraph') return 'paragraph';
  if (token.type === 'heading') return 'heading';
  if (token.type === 'list') return 'list';
  if (token.type === 'code') return 'code';
  return 'other';
}
