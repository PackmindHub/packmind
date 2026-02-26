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
        if (options.useDiffContent) {
          // For diff mode, render as HTML heading
          const level = block.level?.length || 1;
          parts.push(`<h${level}>${content}</h${level}>\n`);
        } else {
          // For unified/plain mode, use markdown syntax
          parts.push(`${block.level || '#'} ${content}\n`);
        }
        break;

      case 'paragraph':
        if (options.useDiffContent) {
          // For diff mode, render as HTML paragraph
          parts.push(`<p>${content}</p>\n`);
        } else {
          // For unified/plain mode, use plain text with blank line separator
          parts.push(`${content}\n`);
        }
        break;

      case 'list':
        if (options.useDiffContent) {
          // For diff mode, render as HTML list
          parts.push(renderListAsDiffHtml(block));
        } else {
          // For unified/plain mode, use markdown list syntax
          parts.push(renderListAsMarkdown(block, options.includeDeleted));
        }
        break;

      case 'code':
        if (options.useDiffContent) {
          // For diff mode, render as HTML code block
          parts.push(`<pre><code>${content}</code></pre>\n`);
        } else {
          // For unified/plain mode, use markdown code block
          parts.push(`\`\`\`\n${content}\n\`\`\`\n`);
        }
        break;

      default:
        // For other types, just add the raw content
        parts.push(block.raw);
    }

    // Add blank line between blocks for markdown mode
    if (!options.useDiffContent && block.type !== 'heading') {
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
 * Render a list block as HTML with diff tags
 */
function renderListAsDiffHtml(block: MarkdownBlock): string {
  if (!block.items || block.items.length === 0) {
    return '';
  }

  const items = block.items
    .map((item) => {
      const content = item.diffContent || item.content;
      return `<li>${content}</li>`;
    })
    .join('\n');

  return `<ul>\n${items}\n</ul>\n`;
}
