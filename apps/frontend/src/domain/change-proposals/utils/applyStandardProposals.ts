import {
  ChangeProposalId,
  ChangeProposalType,
  createRuleId,
  isExpectedChangeProposalType,
  Rule,
  RuleId,
  Standard,
  StandardVersion,
  StandardChangeProposalApplier,
  DiffService,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import {
  buildProposalNumberMap,
  FieldChange,
  PREVIEW_STANDARD_VERSION_ID,
  trackScalarChange,
} from './changeProposalHelpers';

export type { FieldChange } from './changeProposalHelpers';

export interface RuleChange {
  added: Map<RuleId, ChangeProposalId>;
  updated: Map<RuleId, FieldChange>;
  deleted: Set<RuleId>;
}

export interface ChangeTracker {
  name?: FieldChange;
  scope?: FieldChange;
  description?: FieldChange;
  rules: RuleChange;
}

export interface AppliedStandard {
  name: string;
  scope: string;
  description: string;
  rules: Rule[];
  changes: ChangeTracker;
}

/**
 * Applies all accepted change proposals sequentially to a standard,
 * tracking all changes for highlighting in the unified view.
 *
 * Uses the shared StandardChangeProposalApplier for all field computation
 * (scalars + rules), then builds tracking maps in a pure second pass.
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

  // Take scalar values from the applier
  const finalName = appliedResult.name;
  const finalScope = appliedResult.scope ?? '';
  const finalDescription = appliedResult.description;

  // Build scalar change tracker
  const originalName = standard.name;
  const originalScope = standard.scope ?? '';
  const originalDescription = standard.description;

  const changes: ChangeTracker = {
    rules: {
      added: new Map(),
      updated: new Map(),
      deleted: new Set(),
    },
  };

  trackScalarChange(
    changes,
    'name',
    originalName,
    finalName,
    sortedProposals,
    ChangeProposalType.updateStandardName,
  );
  trackScalarChange(
    changes,
    'scope',
    originalScope,
    finalScope,
    sortedProposals,
    ChangeProposalType.updateStandardScope,
  );
  trackScalarChange(
    changes,
    'description',
    originalDescription,
    finalDescription,
    sortedProposals,
    ChangeProposalType.updateStandardDescription,
  );

  // Build rule change tracking in a second pass over proposals
  // (the shared applier already computed appliedResult.rules)
  for (const proposal of sortedProposals) {
    if (isExpectedChangeProposalType(proposal, ChangeProposalType.addRule)) {
      const ruleId = createRuleId(proposal.id);
      changes.rules.added.set(ruleId, proposal.id);
    }

    if (isExpectedChangeProposalType(proposal, ChangeProposalType.updateRule)) {
      const targetId = proposal.payload.targetId;

      const existing = changes.rules.updated.get(targetId);
      if (!existing) {
        const originalRule = rules.find((r) => r.id === targetId);
        const finalRule = appliedResult.rules.find((r) => r.id === targetId);
        changes.rules.updated.set(targetId, {
          originalValue: originalRule?.content ?? '',
          finalValue: finalRule?.content ?? '',
          proposalIds: [proposal.id],
        });
      } else {
        existing.proposalIds.push(proposal.id);
      }
    }

    if (isExpectedChangeProposalType(proposal, ChangeProposalType.deleteRule)) {
      const targetId = proposal.payload.targetId;
      changes.rules.deleted.add(targetId);

      // If this rule was previously added in this session, cancel both out
      if (changes.rules.added.has(targetId)) {
        changes.rules.added.delete(targetId);
        changes.rules.deleted.delete(targetId);
      }
    }
  }

  return {
    name: finalName,
    scope: finalScope,
    description: finalDescription,
    rules: appliedResult.rules,
    changes,
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
