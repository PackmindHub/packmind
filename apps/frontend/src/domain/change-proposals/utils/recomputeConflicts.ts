import {
  ChangeProposal,
  ChangeProposalDecision,
  ChangeProposalId,
  ChangeProposalType,
  CollectionItemUpdatePayload,
  DiffService,
  ScalarUpdatePayload,
  SkillFileContentUpdatePayload,
} from '@packmind/types';

/**
 * Types that use single-line conflict detection:
 * two proposals conflict if they target the same field on the same artefact
 * but have different newValue (from decision or payload).
 */
const SINGLE_LINE_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateSkillName,
  ChangeProposalType.updateStandardName,
  ChangeProposalType.updateStandardScope,
  ChangeProposalType.updateSkillCompatibility,
  ChangeProposalType.updateSkillLicense,
  ChangeProposalType.updateSkillAllowedTools,
  ChangeProposalType.updateSkillMetadata,
  ChangeProposalType.updateRule,
  ChangeProposalType.updateSkillFilePermissions,
]);

/**
 * Types that use multi-line conflict detection:
 * two proposals conflict if they target the same field on the same artefact
 * and their diffs overlap (determined by the DiffService).
 */
const MULTI_LINE_TYPES = new Set<ChangeProposalType>([
  ChangeProposalType.updateCommandDescription,
  ChangeProposalType.updateSkillDescription,
  ChangeProposalType.updateStandardDescription,
  ChangeProposalType.updateSkillPrompt,
  ChangeProposalType.updateSkillFileContent,
]);

type ProposalWithDecision = ChangeProposal & {
  localDecision?: ChangeProposalDecision;
};

function getEffectiveNewValue(
  proposal: ProposalWithDecision,
): string | undefined {
  const decision = proposal.localDecision;
  if (decision && 'newValue' in decision) {
    return (
      decision as ScalarUpdatePayload | CollectionItemUpdatePayload<unknown>
    ).newValue;
  }
  const payload = proposal.payload;
  if ('newValue' in payload) {
    return (
      payload as ScalarUpdatePayload | CollectionItemUpdatePayload<unknown>
    ).newValue;
  }
  return undefined;
}

function getOldValue(proposal: ChangeProposal): string | undefined {
  const payload = proposal.payload;
  if ('oldValue' in payload) {
    return (
      payload as ScalarUpdatePayload | CollectionItemUpdatePayload<unknown>
    ).oldValue;
  }
  return undefined;
}

function getSubTargetId(proposal: ChangeProposal): string | undefined {
  const payload = proposal.payload;
  if ('targetId' in payload) {
    return (payload as CollectionItemUpdatePayload<string>).targetId;
  }
  return undefined;
}

function sameArtefact(cp1: ChangeProposal, cp2: ChangeProposal): boolean {
  return cp1.artefactId === cp2.artefactId;
}

function sameType(cp1: ChangeProposal, cp2: ChangeProposal): boolean {
  return cp1.type === cp2.type;
}

function detectSingleLineConflictBetween(
  cp1: ProposalWithDecision,
  cp2: ProposalWithDecision,
): boolean {
  if (!sameType(cp1, cp2) || !sameArtefact(cp1, cp2)) return false;

  // For sub-item types (updateRule, updateSkillFilePermissions), also check same sub-target
  const subTarget1 = getSubTargetId(cp1);
  const subTarget2 = getSubTargetId(cp2);
  if (
    subTarget1 !== undefined &&
    subTarget2 !== undefined &&
    subTarget1 !== subTarget2
  ) {
    return false;
  }

  const newValue1 = getEffectiveNewValue(cp1);
  const newValue2 = getEffectiveNewValue(cp2);

  if (newValue1 === undefined || newValue2 === undefined) return false;

  return newValue1 !== newValue2;
}

function detectMultiLineConflictBetween(
  cp1: ProposalWithDecision,
  cp2: ProposalWithDecision,
  diffService: DiffService,
): boolean {
  if (!sameType(cp1, cp2) || !sameArtefact(cp1, cp2)) return false;

  // For sub-item types (updateSkillFileContent), also check same sub-target
  const subTarget1 = getSubTargetId(cp1);
  const subTarget2 = getSubTargetId(cp2);
  if (
    subTarget1 !== undefined &&
    subTarget2 !== undefined &&
    subTarget1 !== subTarget2
  ) {
    return false;
  }

  // For base64 skill file content, always consider as conflicting
  if (
    cp1.type === ChangeProposalType.updateSkillFileContent &&
    cp2.type === ChangeProposalType.updateSkillFileContent
  ) {
    const payload1 = cp1.payload as SkillFileContentUpdatePayload;
    const payload2 = cp2.payload as SkillFileContentUpdatePayload;
    if (payload1.isBase64 || payload2.isBase64) {
      return true;
    }
  }

  const oldValue1 = getOldValue(cp1);
  const oldValue2 = getOldValue(cp2);

  // Multi-line detection requires same old value (same base)
  if (oldValue1 !== oldValue2) return false;
  if (oldValue1 === undefined) return false;

  const newValue1 = getEffectiveNewValue(cp1);
  const newValue2 = getEffectiveNewValue(cp2);

  if (newValue1 === undefined || newValue2 === undefined) return false;

  return diffService.hasConflict(oldValue1, newValue1, newValue2);
}

/**
 * Checks whether a pair of proposals can be re-evaluated client-side.
 * Only same-type pairs where both belong to single-line or multi-line
 * categories can have their conflict status recalculated based on edited values.
 *
 * Cross-type conflicts (e.g., updateRule vs deleteRule) are structural
 * and not affected by value edits, so they use the original backend data.
 */
function canReEvaluate(cp1: ChangeProposal, cp2: ChangeProposal): boolean {
  if (cp1.type !== cp2.type) return false;
  if (SINGLE_LINE_TYPES.has(cp1.type)) return true;
  if (MULTI_LINE_TYPES.has(cp1.type)) return true;
  return false;
}

/**
 * Determines whether two same-type proposals conflict, considering any
 * local decisions that override the original payload newValue.
 *
 * Mirrors the backend conflict detection logic from
 * packages/playbook-change-management, adapted for client-side use.
 */
function areConflicting(
  cp1: ProposalWithDecision,
  cp2: ProposalWithDecision,
  diffService: DiffService,
): boolean {
  if (cp1.id === cp2.id) return false;

  if (SINGLE_LINE_TYPES.has(cp1.type) && SINGLE_LINE_TYPES.has(cp2.type)) {
    return detectSingleLineConflictBetween(cp1, cp2);
  }

  if (MULTI_LINE_TYPES.has(cp1.type) && MULTI_LINE_TYPES.has(cp2.type)) {
    return detectMultiLineConflictBetween(cp1, cp2, diffService);
  }

  return false;
}

/**
 * Recomputes conflict relationships among the given proposals,
 * taking into account local decisions that may have changed newValues.
 *
 * Returns a Set of proposal IDs that are blocked (i.e., conflict with
 * at least one accepted proposal).
 *
 * The approach:
 * 1. For each accepted proposal, check every other proposal for conflicts
 * 2. If either proposal has a local decision AND the pair can be re-evaluated
 *    (same type, both single-line or both multi-line), run client-side detection
 * 3. Otherwise, fall back to the original backend conflictsWith data
 */
export function recomputeBlockedIds(
  proposals: Array<ChangeProposal & { conflictsWith: ChangeProposalId[] }>,
  acceptedProposalIds: Set<ChangeProposalId>,
  decisions: Record<ChangeProposalId, ChangeProposalDecision>,
): Set<ChangeProposalId> {
  const diffService = new DiffService();
  const blocked = new Set<ChangeProposalId>();

  // Build enriched proposals with local decisions
  const enrichedProposals: Array<
    ProposalWithDecision & { conflictsWith: ChangeProposalId[] }
  > = proposals.map((p) => ({
    ...p,
    localDecision: decisions[p.id],
  }));

  const proposalMap = new Map(enrichedProposals.map((p) => [p.id, p]));

  for (const acceptedId of acceptedProposalIds) {
    const accepted = proposalMap.get(acceptedId);
    if (!accepted) continue;

    for (const proposal of enrichedProposals) {
      if (proposal.id === acceptedId) continue;

      const eitherHasDecision =
        decisions[acceptedId] !== undefined ||
        decisions[proposal.id] !== undefined;
      const wasOriginallyConflicting = accepted.conflictsWith.includes(
        proposal.id,
      );

      if (eitherHasDecision && canReEvaluate(accepted, proposal)) {
        // Both proposals are same-type single-line or multi-line:
        // re-evaluate conflict based on effective newValues
        if (areConflicting(accepted, proposal, diffService)) {
          blocked.add(proposal.id);
        }
      } else if (wasOriginallyConflicting) {
        // Cross-type pair or no decisions: use original backend data
        blocked.add(proposal.id);
      }
    }
  }

  return blocked;
}
