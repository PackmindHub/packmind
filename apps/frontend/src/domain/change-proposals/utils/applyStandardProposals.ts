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
  createStandardVersionId,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { buildProposalNumberMap } from './changeProposalHelpers';

export interface FieldChange {
  originalValue: string;
  finalValue: string;
  proposalIds: ChangeProposalId[];
}

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
 * Uses the shared StandardChangeProposalApplier for scalar field
 * computation (including diff-based description merging), while
 * handling rule operations manually for frontend-specific temp IDs.
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
    id: rules[0]?.standardVersionId || createStandardVersionId(''),
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

  const nameProposalIds = sortedProposals
    .filter((p) => p.type === ChangeProposalType.updateStandardName)
    .map((p) => p.id);
  if (nameProposalIds.length > 0) {
    changes.name = {
      originalValue: originalName,
      finalValue: finalName,
      proposalIds: nameProposalIds,
    };
  }

  const scopeProposalIds = sortedProposals
    .filter((p) => p.type === ChangeProposalType.updateStandardScope)
    .map((p) => p.id);
  if (scopeProposalIds.length > 0) {
    changes.scope = {
      originalValue: originalScope,
      finalValue: finalScope,
      proposalIds: scopeProposalIds,
    };
  }

  const descriptionProposalIds = sortedProposals
    .filter((p) => p.type === ChangeProposalType.updateStandardDescription)
    .map((p) => p.id);
  if (descriptionProposalIds.length > 0) {
    changes.description = {
      originalValue: originalDescription,
      finalValue: finalDescription,
      proposalIds: descriptionProposalIds,
    };
  }

  // Handle rule operations manually for frontend-specific temp IDs
  let currentRules = [...rules];

  for (const proposal of sortedProposals) {
    if (isExpectedChangeProposalType(proposal, ChangeProposalType.addRule)) {
      const newRuleId = createRuleId(`temp-rule-${proposal.id}`);
      const newRule: Rule = {
        id: newRuleId,
        content: proposal.payload.item.content,
        standardVersionId:
          rules[0]?.standardVersionId || createStandardVersionId(''),
      };

      currentRules = [...currentRules, newRule];
      changes.rules.added.set(newRuleId, proposal.id);
    }

    if (isExpectedChangeProposalType(proposal, ChangeProposalType.updateRule)) {
      const targetId = proposal.payload.targetId;
      const ruleIndex = currentRules.findIndex((r) => r.id === targetId);

      if (ruleIndex !== -1) {
        const originalContent = currentRules[ruleIndex].content;
        const newContent = proposal.payload.newValue;

        currentRules = currentRules.map((rule) =>
          rule.id === targetId ? { ...rule, content: newContent } : rule,
        );

        const existingUpdate = changes.rules.updated.get(targetId);
        if (!existingUpdate) {
          changes.rules.updated.set(targetId, {
            originalValue: originalContent,
            finalValue: newContent,
            proposalIds: [proposal.id],
          });
        } else {
          existingUpdate.finalValue = newContent;
          existingUpdate.proposalIds.push(proposal.id);
        }
      }
    }

    if (isExpectedChangeProposalType(proposal, ChangeProposalType.deleteRule)) {
      const targetId = proposal.payload.targetId;
      currentRules = currentRules.filter((r) => r.id !== targetId);
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
    rules: currentRules,
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
