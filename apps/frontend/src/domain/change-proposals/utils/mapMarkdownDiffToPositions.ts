import { Node as ProseMirrorNode } from '@milkdown/kit/prose/model';
import { MarkdownBlock } from './buildUnifiedMarkdownDiff';
import { DiffRegion } from '../types/diffTypes';

/**
 * Extracts plain text content from HTML, removing all tags.
 * This is used to match HTML block content to ProseMirror text nodes.
 */
function extractTextFromHtml(html: string): string {
  // Remove HTML tags but preserve content
  const text = html
    .replace(/<[^>]+>/g, ' ') // Replace tags with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  return text;
}

/**
 * Finds all text positions in a ProseMirror document that match the given search text.
 * Returns an array of {from, to, text} for each match.
 */
function findTextPositions(
  doc: ProseMirrorNode,
  searchText: string,
): Array<{ from: number; to: number; text: string }> {
  const positions: Array<{ from: number; to: number; text: string }> = [];
  const normalizedSearch = searchText.toLowerCase().replace(/\s+/g, ' ').trim();

  if (!normalizedSearch) return positions;

  // Get the full document text
  const fullText = doc.textContent;
  const normalizedFullText = fullText.toLowerCase();

  // Find all occurrences of the search text
  let startIndex = 0;
  while (true) {
    const index = normalizedFullText.indexOf(normalizedSearch, startIndex);
    if (index === -1) break;

    // Convert text index to ProseMirror positions
    // We need to walk the document to find the actual positions
    const currentPos = 1; // Start at position 1 (after doc node)
    let textIndex = 0;
    let found = false;

    doc.descendants((node, pos) => {
      if (found) return false;

      if (node.isText) {
        const nodeText = node.text || '';
        const nodeLength = nodeText.length;

        if (textIndex <= index && textIndex + nodeLength > index) {
          // This node contains the start of our match
          const offsetInNode = index - textIndex;
          const matchLength = normalizedSearch.length;

          // The actual positions in ProseMirror
          const from = pos + offsetInNode;
          const to = from + matchLength;

          positions.push({
            from,
            to,
            text: fullText.substring(index, index + matchLength),
          });

          found = true;
          return false;
        }

        textIndex += nodeLength;
      }

      return true;
    });

    startIndex = index + 1;
  }

  return positions;
}

/**
 * Maps markdown diff blocks to ProseMirror document positions.
 * Takes the output from buildUnifiedMarkdownDiff and converts it to
 * DiffRegion objects with ProseMirror positions for decoration.
 *
 * @param blocks - Output from buildUnifiedMarkdownDiff
 * @param newValue - The new markdown content (used for context)
 * @param doc - ProseMirror document node
 * @returns Array of DiffRegion objects with positions and diff HTML
 */
export function mapMarkdownDiffToPositions(
  blocks: MarkdownBlock[],
  newValue: string,
  doc: ProseMirrorNode,
): DiffRegion[] {
  const diffRegions: DiffRegion[] = [];
  const usedPositions = new Set<string>(); // Track used positions to avoid duplicates

  for (const block of blocks) {
    if (!block.isChanged || !block.diffHtml) {
      continue; // Skip unchanged blocks
    }

    // Extract text content from the block HTML
    const blockText = extractTextFromHtml(block.html);

    if (!blockText) {
      continue; // Skip empty blocks
    }

    // Find all positions in the document that match this block's text
    const positions = findTextPositions(doc, blockText);

    for (const pos of positions) {
      const posKey = `${pos.from}-${pos.to}`;

      // Avoid duplicate regions
      if (usedPositions.has(posKey)) {
        continue;
      }

      usedPositions.add(posKey);

      // Create a diff region for this position
      diffRegions.push({
        from: pos.from,
        to: pos.to,
        diffHtml: block.diffHtml,
        oldValue: '', // We don't have the old value at this granularity
        newValue: pos.text,
      });
    }
  }

  return diffRegions;
}
