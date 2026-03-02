import { marked, Token, Tokens } from 'marked';
import { diffArrays, diffWords, diffLines } from 'diff';

/**
 * Status of a markdown block after diff computation
 */
export type BlockStatus = 'unchanged' | 'added' | 'deleted' | 'updated';

/**
 * Type of markdown block
 */
export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'code'
  | 'text'
  | 'other';

/**
 * Represents a parsed markdown block with diff information
 */
export interface MarkdownBlock {
  /** Type of the block */
  type: BlockType;
  /** Clean content (for unified/plain views) */
  content: string;
  /** Diff content with ++/-- markers (for tooltips and diff view) */
  diffContent: string;
  /** Line-level diff with +/- prefixes for code blocks (for diff mode rendering) */
  lineDiff?: string;
  /** Status after diff computation */
  status: BlockStatus;
  /** Heading level (e.g., '#', '##') - only for heading blocks */
  level?: string;
  /** Code block language (e.g., 'js', 'typescript') - only for code blocks */
  language?: string;
  /** List items - only for list blocks */
  items?: MarkdownBlock[];
  /** Original markdown raw text */
  raw: string;
}

/**
 * Parse markdown string into structured blocks
 */
function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  marked.setOptions({ breaks: true, gfm: true });
  const tokens = marked.lexer(markdown).filter((t) => t.type !== 'space');

  return tokens.map((token) => {
    const block: MarkdownBlock = {
      type: getBlockType(token),
      content: extractCleanContent(token),
      diffContent: '',
      status: 'unchanged',
      raw: token.raw,
    };

    // Add heading level if it's a heading
    if (token.type === 'heading') {
      const heading = token as Tokens.Heading;
      block.level = '#'.repeat(heading.depth);
    }

    // Add language if it's a code block
    if (token.type === 'code') {
      const code = token as Tokens.Code;
      block.language = code.lang || '';
    }

    // Parse list items if it's a list
    if (token.type === 'list') {
      const list = token as Tokens.List;
      block.items = list.items.map((item) => ({
        type: 'text',
        content: item.text,
        diffContent: '',
        status: 'unchanged',
        raw: item.raw,
      }));
    }

    return block;
  });
}

/**
 * Get block type from marked token
 */
function getBlockType(token: Token): BlockType {
  if (token.type === 'heading') return 'heading';
  if (token.type === 'paragraph') return 'paragraph';
  if (token.type === 'list') return 'list';
  if (token.type === 'code') return 'code';
  if (token.type === 'text') return 'text';
  return 'other';
}

/**
 * Extract clean text content from a token
 */
function extractCleanContent(token: Token): string {
  if (token.type === 'heading') {
    return (token as Tokens.Heading).text;
  }
  if (token.type === 'paragraph') {
    return (token as Tokens.Paragraph).text;
  }
  if (token.type === 'code') {
    return (token as Tokens.Code).text;
  }
  if (token.type === 'text') {
    return (token as Tokens.Text).text;
  }
  if (token.type === 'list') {
    const list = token as Tokens.List;
    return list.items.map((item) => item.text).join('\n');
  }
  return token.raw;
}

/**
 * Build diff markup from two text strings using word-level diffing
 * Uses custom markdown-style syntax: ++ for additions, -- for deletions
 */
function buildWordDiffHtml(oldText: string, newText: string): string {
  const changes = diffWords(oldText, newText);
  return changes
    .map((change) => {
      if (change.added) return `++${change.value}++`;
      if (change.removed) return `--${change.value}--`;
      return change.value;
    })
    .join('');
}

/**
 * Build line-level diff string for code blocks with +/- prefixes
 */
function buildLineDiff(oldText: string, newText: string): string {
  const changes = diffLines(oldText, newText);
  const lines: string[] = [];

  for (const change of changes) {
    const value = change.value;
    // Remove trailing newline to avoid empty lines
    const text = value.endsWith('\n') ? value.slice(0, -1) : value;
    const codeLines = text.split('\n');

    for (const line of codeLines) {
      if (change.added) {
        lines.push(`+${line}`);
      } else if (change.removed) {
        lines.push(`-${line}`);
      } else {
        lines.push(` ${line}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Calculate similarity between two strings (0-1, higher is more similar)
 * Uses a simple word overlap metric
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Try to match deleted and added blocks based on similarity
 * Returns pairs of [oldBlock, newBlock] and unpaired blocks
 */
function matchBlocksBySimilarity(
  oldBlocks: MarkdownBlock[],
  newBlocks: MarkdownBlock[],
): {
  matched: Array<[MarkdownBlock, MarkdownBlock]>;
  unmatchedOld: MarkdownBlock[];
  unmatchedNew: MarkdownBlock[];
} {
  const matched: Array<[MarkdownBlock, MarkdownBlock]> = [];
  const usedOld = new Set<number>();
  const usedNew = new Set<number>();

  // For each old block, find the best matching new block
  for (let i = 0; i < oldBlocks.length; i++) {
    const oldBlock = oldBlocks[i];
    let bestMatch = -1;
    let bestSimilarity = 0.3; // Minimum threshold for matching

    for (let j = 0; j < newBlocks.length; j++) {
      if (usedNew.has(j)) continue;

      const newBlock = newBlocks[j];

      // Only match blocks of the same type
      if (oldBlock.type !== newBlock.type) continue;

      const similarity = calculateSimilarity(
        oldBlock.content,
        newBlock.content,
      );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = j;
      }
    }

    if (bestMatch !== -1) {
      matched.push([oldBlock, newBlocks[bestMatch]]);
      usedOld.add(i);
      usedNew.add(bestMatch);
    }
  }

  const unmatchedOld = oldBlocks.filter((_, i) => !usedOld.has(i));
  const unmatchedNew = newBlocks.filter((_, i) => !usedNew.has(i));

  return { matched, unmatchedOld, unmatchedNew };
}

/**
 * Compare two list blocks and return diff information for items
 */
function diffListItems(
  oldItems: MarkdownBlock[],
  newItems: MarkdownBlock[],
): MarkdownBlock[] {
  const oldTexts = oldItems.map((item) => item.content.trim());
  const newTexts = newItems.map((item) => item.content.trim());
  const changes = diffArrays(oldTexts, newTexts);

  let oldIdx = 0;
  let newIdx = 0;
  const result: MarkdownBlock[] = [];

  for (const change of changes) {
    const count = change.count ?? change.value.length;

    if (!change.added && !change.removed) {
      // Unchanged items
      for (let i = 0; i < count; i++) {
        result.push({
          ...newItems[newIdx++],
          status: 'unchanged',
        });
        oldIdx++;
      }
    } else if (change.removed) {
      // Deleted items - mark for deletion
      for (let i = 0; i < count; i++) {
        const oldItem = oldItems[oldIdx++];
        result.push({
          ...oldItem,
          status: 'deleted',
          diffContent: `--${oldItem.content}--`,
        });
      }
    } else {
      // Added items
      for (let i = 0; i < count; i++) {
        const newItem = newItems[newIdx++];
        result.push({
          ...newItem,
          status: 'added',
          diffContent: `++${newItem.content}++`,
        });
      }
    }
  }

  return result;
}

/**
 * Normalize raw markdown for comparison by trimming whitespace
 */
function normalizeRaw(raw: string): string {
  return raw.trim();
}

/**
 * Create a comparison key for a block (type + content)
 */
function createBlockKey(block: MarkdownBlock): string {
  return `${block.type}:${normalizeRaw(block.raw)}`;
}

/**
 * Parse markdown and compute diffs between old and new versions.
 * Returns structured blocks with both clean content and diff information.
 *
 * @param oldValue - Original markdown content
 * @param newValue - New markdown content
 * @returns Array of MarkdownBlock with diff information
 */
export function parseAndDiffMarkdown(
  oldValue: string,
  newValue: string,
): MarkdownBlock[] {
  const oldBlocks = parseMarkdownBlocks(oldValue);
  const newBlocks = parseMarkdownBlocks(newValue);

  // Use normalized keys for block-level diffing to avoid whitespace issues
  const oldKeys = oldBlocks.map(createBlockKey);
  const newKeys = newBlocks.map(createBlockKey);
  const changes = diffArrays(oldKeys, newKeys);

  let oldIdx = 0;
  let newIdx = 0;
  const result: MarkdownBlock[] = [];

  for (let ci = 0; ci < changes.length; ci++) {
    const change = changes[ci];
    const count = change.count ?? change.value.length;

    if (!change.added && !change.removed) {
      // Unchanged blocks
      for (let i = 0; i < count; i++) {
        result.push({
          ...newBlocks[newIdx++],
          status: 'unchanged',
        });
        oldIdx++;
      }
    } else if (change.removed) {
      const next = changes[ci + 1];

      if (next && next.added) {
        // Modified blocks - check if we can do word-level diff
        const nextCount = next.count ?? next.value.length;

        if (count === 1 && nextCount === 1) {
          // Single block modified - do word-level diff
          const oldBlock = oldBlocks[oldIdx++];
          const newBlock = newBlocks[newIdx++];

          if (oldBlock.type === newBlock.type) {
            // Same block type - compute word-level diff
            if (newBlock.type === 'list' && oldBlock.items && newBlock.items) {
              // Special handling for lists
              result.push({
                ...newBlock,
                status: 'updated',
                items: diffListItems(oldBlock.items, newBlock.items),
              });
            } else {
              // Text blocks (heading, paragraph, code)
              // For headings with different levels, mark as complete replacement
              if (
                oldBlock.type === 'heading' &&
                newBlock.type === 'heading' &&
                oldBlock.level !== newBlock.level
              ) {
                result.push({
                  ...newBlock,
                  status: 'updated',
                  diffContent: `${oldBlock.level || '#'} --${oldBlock.content}--\n${newBlock.level || '#'} ++${newBlock.content}++`,
                });
              } else {
                // For headings with same level, include level markers in diff
                // For other blocks, just use content
                const oldText =
                  oldBlock.type === 'heading'
                    ? `${oldBlock.level || '#'} ${oldBlock.content}`
                    : oldBlock.content;
                const newText =
                  newBlock.type === 'heading'
                    ? `${newBlock.level || '#'} ${newBlock.content}`
                    : newBlock.content;

                const diffHtml = buildWordDiffHtml(oldText, newText);

                // For code blocks, also compute line-level diff
                const updatedBlock: MarkdownBlock = {
                  ...newBlock,
                  status: 'updated',
                  diffContent: diffHtml,
                };

                if (newBlock.type === 'code') {
                  updatedBlock.lineDiff = buildLineDiff(
                    oldBlock.content,
                    newBlock.content,
                  );
                }

                result.push(updatedBlock);
              }
            }
          } else {
            // Different block types - mark as deleted and added
            result.push({
              ...oldBlock,
              status: 'deleted',
              diffContent: `--${oldBlock.content}--`,
            });
            result.push({
              ...newBlock,
              status: 'added',
              diffContent: `++${newBlock.content}++`,
            });
          }
        } else {
          // Multiple blocks changed - try to match them by similarity
          const deletedBlocks = oldBlocks.slice(oldIdx, oldIdx + count);
          const addedBlocks = newBlocks.slice(newIdx, newIdx + nextCount);

          const { matched, unmatchedOld, unmatchedNew } =
            matchBlocksBySimilarity(deletedBlocks, addedBlocks);

          // Process matched pairs with word-level diff
          for (const [oldBlock, newBlock] of matched) {
            if (newBlock.type === 'list' && oldBlock.items && newBlock.items) {
              result.push({
                ...newBlock,
                status: 'updated',
                items: diffListItems(oldBlock.items, newBlock.items),
              });
            } else {
              // For headings with different levels, mark as complete replacement
              if (
                oldBlock.type === 'heading' &&
                newBlock.type === 'heading' &&
                oldBlock.level !== newBlock.level
              ) {
                result.push({
                  ...newBlock,
                  status: 'updated',
                  diffContent: `${oldBlock.level || '#'} --${oldBlock.content}--\n${newBlock.level || '#'} ++${newBlock.content}++`,
                });
              } else {
                // For headings with same level, include level markers in diff
                // For other blocks, just use content
                const oldText =
                  oldBlock.type === 'heading'
                    ? `${oldBlock.level || '#'} ${oldBlock.content}`
                    : oldBlock.content;
                const newText =
                  newBlock.type === 'heading'
                    ? `${newBlock.level || '#'} ${newBlock.content}`
                    : newBlock.content;

                const diffHtml = buildWordDiffHtml(oldText, newText);

                // For code blocks, also compute line-level diff
                const updatedBlock: MarkdownBlock = {
                  ...newBlock,
                  status: 'updated',
                  diffContent: diffHtml,
                };

                if (newBlock.type === 'code') {
                  updatedBlock.lineDiff = buildLineDiff(
                    oldBlock.content,
                    newBlock.content,
                  );
                }

                result.push(updatedBlock);
              }
            }
          }

          // Process unmatched deletions
          for (const oldBlock of unmatchedOld) {
            result.push({
              ...oldBlock,
              status: 'deleted',
              diffContent: `--${oldBlock.content}--`,
            });
          }

          // Process unmatched additions
          for (const newBlock of unmatchedNew) {
            result.push({
              ...newBlock,
              status: 'added',
              diffContent: `++${newBlock.content}++`,
            });
          }

          oldIdx += count;
          newIdx += nextCount;
        }
        ci++; // Skip the next (added) change
      } else {
        // Pure deletion
        for (let i = 0; i < count; i++) {
          const oldBlock = oldBlocks[oldIdx++];
          result.push({
            ...oldBlock,
            status: 'deleted',
            diffContent: `--${oldBlock.content}--`,
          });
        }
      }
    } else {
      // Pure additions
      for (let i = 0; i < count; i++) {
        const newBlock = newBlocks[newIdx++];
        result.push({
          ...newBlock,
          status: 'added',
          diffContent: `++${newBlock.content}++`,
        });
      }
    }
  }

  return result;
}
