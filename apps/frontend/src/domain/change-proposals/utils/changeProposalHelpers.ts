import {
  ChangeProposalId,
  ChangeProposalStatus,
  ChangeProposalType,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';

const changeProposalFieldLabels: Record<ChangeProposalType, string> = {
  [ChangeProposalType.updateCommandName]: 'Name',
  [ChangeProposalType.updateCommandDescription]: 'Instructions updated',
  [ChangeProposalType.updateStandardName]: 'Name',
  [ChangeProposalType.updateStandardDescription]: 'Description',
  [ChangeProposalType.updateStandardScope]: 'Scope',
  [ChangeProposalType.addRule]: 'Rule (add)',
  [ChangeProposalType.updateRule]: 'Rule (update)',
  [ChangeProposalType.deleteRule]: 'Rule (delete)',
  [ChangeProposalType.updateSkillName]: 'Name',
  [ChangeProposalType.updateSkillDescription]: 'Description',
  [ChangeProposalType.updateSkillPrompt]: 'Prompt',
  [ChangeProposalType.updateSkillMetadata]: 'Metadata',
  [ChangeProposalType.updateSkillLicense]: 'License',
  [ChangeProposalType.updateSkillCompatibility]: 'Compatibility',
  [ChangeProposalType.updateSkillAllowedTools]: 'Allowed Tools',
  [ChangeProposalType.addSkillFile]: 'File (add)',
  [ChangeProposalType.updateSkillFileContent]: 'File content',
  [ChangeProposalType.updateSkillFilePermissions]: 'File permissions',
  [ChangeProposalType.deleteSkillFile]: 'File (delete)',
};

export function getChangeProposalFieldLabel(type: ChangeProposalType): string {
  return changeProposalFieldLabels[type];
}

export function buildProposalNumberMap(
  proposals: { id: ChangeProposalId; createdAt: Date }[],
): Map<ChangeProposalId, number> {
  const sorted = [...proposals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return new Map(sorted.map((p, i) => [p.id, i + 1]));
}

export function buildBlockedByAcceptedMap(
  proposals: ChangeProposalWithConflicts[],
  acceptedProposalIds: Set<ChangeProposalId>,
): Map<ChangeProposalId, ChangeProposalId[]> {
  const map = new Map<ChangeProposalId, ChangeProposalId[]>();
  for (const acceptedId of acceptedProposalIds) {
    const accepted = proposals.find((p) => p.id === acceptedId);
    if (!accepted) continue;
    for (const conflictId of accepted.conflictsWith) {
      const existing = map.get(conflictId) ?? [];
      existing.push(acceptedId);
      map.set(conflictId, existing);
    }
  }
  return map;
}

export function getStatusBadgeProps(status: ChangeProposalStatus): {
  label: string;
  colorPalette: string;
} {
  switch (status) {
    case ChangeProposalStatus.pending:
      return { label: 'Pending', colorPalette: 'green' };
    case ChangeProposalStatus.applied:
      return { label: 'Accepted', colorPalette: 'green' };
    case ChangeProposalStatus.rejected:
      return { label: 'Dismissed', colorPalette: 'red' };
  }
}
