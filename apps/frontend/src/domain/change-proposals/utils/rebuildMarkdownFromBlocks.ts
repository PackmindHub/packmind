import { MarkdownBlock } from './markdownBlockDiff';

/**
 * Rebuilds markdown content from structured blocks.
 * Used to generate content for different display modes.
 */
export interface RebuildOptions {
  /** Whether to include deleted blocks */
  includeDeleted: boolean;
  /** Whether to use diffContent (with <ins>/<del> tags) or clean content */
  useDiffContent: boolean;
  /** Display mode: 'unified', 'diff', or 'plain' */
  mode?: 'unified' | 'diff' | 'plain';
}

/**
 * Rebuild markdown from structured blocks for rendering in different modes.
 *
 * @param blocks - Array of MarkdownBlock from parseAndDiffMarkdown
 * @param options - Options controlling what to include
 * @returns Markdown or HTML string ready for rendering
 */
export function rebuildMarkdownFromBlocks(
  blocks: MarkdownBlock[],
  options: RebuildOptions,
): string {
  const parts: string[] = [];

  for (const block of blocks) {
    // Skip deleted blocks unless includeDeleted is true
    if (block.status === 'deleted' && !options.includeDeleted) {
      continue;
    }

    // Use diffContent if available and requested, otherwise use content
    const content =
      options.useDiffContent && block.diffContent
        ? block.diffContent
        : block.content;

    switch (block.type) {
      case 'heading':
        // For headings, check if diffContent already includes level markers
        // (happens when heading level changes, e.g., "#--text--\n##++text++")
        if (options.useDiffContent && content.startsWith('#')) {
          // diffContent already includes heading levels, use as-is
          parts.push(`${content}\n`);
        } else {
          // Normal heading or unified mode, prepend level
          parts.push(`${block.level || '#'} ${content}\n`);
        }
        break;

      case 'paragraph':
        // Always use plain text for paragraphs
        parts.push(`${content}\n`);
        break;

      case 'list':
        if (options.useDiffContent) {
          // For diff mode, use markdown list with diff content
          parts.push(renderListAsMarkdownWithDiff(block));
        } else {
          // For unified/plain mode, use markdown list syntax
          parts.push(renderListAsMarkdown(block, options.includeDeleted));
        }
        break;

      case 'code':
        if (options.useDiffContent) {
          // For diff mode, render as ```diff code block with line-level changes
          const diffLines = block.lineDiff || content;
          parts.push(`\`\`\`diff\n${diffLines}\n\`\`\`\n`);
        } else {
          // For unified/plain mode, use markdown code block
          const lang = block.language || '';
          parts.push(`\`\`\`${lang}\n${content}\n\`\`\`\n`);

          // In unified mode, add a marker for changed code blocks
          if (
            options.mode === 'unified' &&
            block.status === 'updated' &&
            block.lineDiff
          ) {
            // Add plain markdown with diff markers and encoded diff data in link
            const encodedDiff =
              typeof btoa !== 'undefined'
                ? btoa(block.lineDiff)
                : Buffer.from(block.lineDiff).toString('base64');
            parts.push(`[See code change](#CODE_DIFF:${encodedDiff})\n`);
          }
        }
        break;

      default:
        // For other types, just add the raw content
        parts.push(block.raw);
    }

    // Add blank line between blocks (except after headings)
    if (block.type !== 'heading') {
      parts.push('\n');
    }
  }

  return parts.join('');
}

/**
 * Render a list block as markdown
 */
function renderListAsMarkdown(
  block: MarkdownBlock,
  includeDeleted: boolean,
): string {
  if (!block.items || block.items.length === 0) {
    return '';
  }

  const items = block.items
    .filter((item) => includeDeleted || item.status !== 'deleted')
    .map((item) => `- ${item.content}`)
    .join('\n');

  return items + '\n';
}

/**
 * Render a list block as markdown with diff tags
 */
function renderListAsMarkdownWithDiff(block: MarkdownBlock): string {
  if (!block.items || block.items.length === 0) {
    return '';
  }

  const items = block.items
    .map((item) => {
      const content = item.diffContent || item.content;
      return `- ${content}`;
    })
    .join('\n');

  return items + '\n';
}
