import { SkillFile } from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { getProposalFilePath } from './groupSkillProposalsByFile';

export function getFilePathsWithChanges(
  proposals: ChangeProposalWithConflicts[],
  files: SkillFile[],
): Set<string> {
  const paths = new Set<string>();
  for (const proposal of proposals) {
    paths.add(getProposalFilePath(proposal, files));
  }
  return paths;
}

export function filterProposalsByFilePath(
  proposals: ChangeProposalWithConflicts[],
  files: SkillFile[],
  filter: string,
): ChangeProposalWithConflicts[] {
  if (!filter) return proposals;

  return proposals.filter((proposal) => {
    const filePath = getProposalFilePath(proposal, files);
    if (filePath === filter) return true;
    return filePath.startsWith(filter + '/');
  });
}

export function hasChangesForFilter(
  filePathsWithChanges: Set<string>,
  filter: string,
): boolean {
  if (!filter) return filePathsWithChanges.size > 0;

  for (const path of filePathsWithChanges) {
    if (path === filter) return true;
    if (path.startsWith(filter + '/')) return true;
  }
  return false;
}
