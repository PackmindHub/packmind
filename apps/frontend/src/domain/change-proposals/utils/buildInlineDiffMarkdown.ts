import { buildDiffHtml } from './markdownDiff';

/**
 * Builds inline diff markdown content for the "diff" display mode.
 * Uses buildDiffHtml to generate HTML with <ins> and <del> tags
 * showing additions and deletions inline.
 */
export function buildInlineDiffMarkdown(
  oldValue: string,
  newValue: string,
): string {
  return buildDiffHtml(oldValue, newValue);
}
