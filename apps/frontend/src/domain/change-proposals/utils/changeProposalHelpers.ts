import {
  CHANGE_PROPOSAL_TYPE_LABELS,
  ChangeProposalId,
  ChangeProposalStatus,
  ChangeProposalType,
  createRecipeVersionId,
  createSkillVersionId,
  createStandardVersionId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';

export interface FieldChange {
  originalValue: string;
  finalValue: string;
  proposalIds: ChangeProposalId[];
}

export const PREVIEW_RECIPE_VERSION_ID = createRecipeVersionId('preview');
export const PREVIEW_SKILL_VERSION_ID = createSkillVersionId('preview');
export const PREVIEW_STANDARD_VERSION_ID = createStandardVersionId('preview');

export function getChangeProposalFieldLabel(type: ChangeProposalType): string {
  return CHANGE_PROPOSAL_TYPE_LABELS[type];
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

export function trackScalarChange(
  changes: Record<string, FieldChange | undefined>,
  field: string,
  originalValue: string,
  finalValue: string,
  proposals: { id: ChangeProposalId; type: ChangeProposalType }[],
  proposalType: ChangeProposalType,
): void {
  const proposalIds = proposals
    .filter((p) => p.type === proposalType)
    .map((p) => p.id);
  if (proposalIds.length > 0) {
    changes[field] = { originalValue, finalValue, proposalIds };
  }
}
