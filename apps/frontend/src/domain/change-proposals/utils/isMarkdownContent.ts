import { ChangeProposalType } from '@packmind/types';

const markdownContentTypes = new Set<ChangeProposalType>([
  ChangeProposalType.updateCommandDescription,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateSkillDescription,
]);

/**
 * Returns true when the proposal type carries markdown content
 * that should be rendered with a markdown viewer in diffs.
 */
export function isMarkdownContent(type: ChangeProposalType): boolean {
  return markdownContentTypes.has(type);
}
