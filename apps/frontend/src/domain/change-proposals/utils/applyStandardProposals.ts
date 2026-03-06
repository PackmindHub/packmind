import {
  ChangeProposalId,
  Rule,
  Standard,
  StandardVersion,
  StandardChangeProposalApplier,
  DiffService,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import {
  buildProposalNumberMap,
  PREVIEW_STANDARD_VERSION_ID,
} from './changeProposalHelpers';

export interface AppliedStandard {
  name: string;
  scope: string;
  description: string;
  rules: Rule[];
}

/**
 * Applies all accepted change proposals sequentially to a standard.
 *
 * Uses the shared StandardChangeProposalApplier for all field computation
 * (scalars + rules).
 */
export function applyStandardProposals(
  standard: Standard,
  rules: Rule[],
  proposals: ChangeProposalWithConflicts[],
  acceptedIds: Set<ChangeProposalId>,
): AppliedStandard {
  // Filter to only accepted proposals
  const acceptedProposals = proposals.filter((p) => acceptedIds.has(p.id));

  // Sort by createdAt (oldest first) to apply in chronological order
  const sortedProposals = [...acceptedProposals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Use shared applier for scalar field computation (name, scope, description)
  const sourceVersion: StandardVersion = {
    id: rules[0]?.standardVersionId ?? PREVIEW_STANDARD_VERSION_ID,
    standardId: standard.id,
    name: standard.name,
    slug: standard.slug,
    description: standard.description,
    version: standard.version,
    scope: standard.scope,
    rules: [...rules],
  };

  const applier = new StandardChangeProposalApplier(new DiffService());
  const appliedResult = applier.applyChangeProposals(
    sourceVersion,
    sortedProposals,
  );

  return {
    name: appliedResult.name,
    scope: appliedResult.scope ?? '',
    description: appliedResult.description,
    rules: appliedResult.rules ?? [],
  };
}

/**
 * Helper to get proposal numbers for display in tooltips
 */
export function getProposalNumbers(
  proposalIds: ChangeProposalId[],
  proposals: ChangeProposalWithConflicts[],
): number[] {
  const numberMap = buildProposalNumberMap(proposals);
  return proposalIds
    .map((id) => numberMap.get(id))
    .filter((num): num is number => num !== undefined);
}
