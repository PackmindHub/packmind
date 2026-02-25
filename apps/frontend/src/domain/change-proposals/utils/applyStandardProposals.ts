import {
  ChangeProposalId,
  ChangeProposalType,
  Rule,
  RuleId,
  Standard,
  StandardVersionId,
  createRuleId,
  ChangeProposal,
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
  description?: FieldChange;
  rules: RuleChange;
}

export interface AppliedStandard {
  name: string;
  description: string;
  rules: Rule[];
  changes: ChangeTracker;
}

/**
 * Applies all accepted change proposals sequentially to a standard,
 * tracking all changes for highlighting in the unified view.
 *
 * This replicates the backend StandardChangeProposalsApplier logic
 * for frontend preview purposes.
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

  // Initialize result with current standard state
  let currentName = standard.name;
  let currentDescription = standard.description;
  let currentRules = [...rules];

  // Initialize change tracker
  const changes: ChangeTracker = {
    rules: {
      added: new Map(),
      updated: new Map(),
      deleted: new Set(),
    },
  };

  // Track original values for change detection
  const originalName = standard.name;
  const originalDescription = standard.description;

  // Apply each proposal sequentially
  for (const proposal of sortedProposals) {
    switch (proposal.type) {
      case ChangeProposalType.updateStandardName: {
        if (
          isExpectedChangeProposalType(
            proposal,
            ChangeProposalType.updateStandardName,
          )
        ) {
          currentName = proposal.payload.newValue;

          // Track name change
          if (!changes.name) {
            changes.name = {
              originalValue: originalName,
              finalValue: currentName,
              proposalIds: [proposal.id],
            };
          } else {
            changes.name.finalValue = currentName;
            changes.name.proposalIds.push(proposal.id);
          }
        }
        break;
      }

      case ChangeProposalType.updateStandardDescription: {
        if (
          isExpectedChangeProposalType(
            proposal,
            ChangeProposalType.updateStandardDescription,
          )
        ) {
          currentDescription = proposal.payload.newValue;

          // Track description change
          if (!changes.description) {
            changes.description = {
              originalValue: originalDescription,
              finalValue: currentDescription,
              proposalIds: [proposal.id],
            };
          } else {
            changes.description.finalValue = currentDescription;
            changes.description.proposalIds.push(proposal.id);
          }
        }
        break;
      }

      case ChangeProposalType.addRule: {
        if (
          isExpectedChangeProposalType(proposal, ChangeProposalType.addRule)
        ) {
          // Create a unique temporary rule ID based on the proposal ID for frontend display
          const newRuleId = createRuleId(`temp-rule-${proposal.id}`);
          const newRule: Rule = {
            id: newRuleId,
            content: proposal.payload.item.content,
            standardVersionId:
              rules[0]?.standardVersionId || ('' as StandardVersionId),
          };

          currentRules = [...currentRules, newRule];
          changes.rules.added.set(newRuleId, proposal.id);
        }
        break;
      }

      case ChangeProposalType.updateRule: {
        if (
          isExpectedChangeProposalType(proposal, ChangeProposalType.updateRule)
        ) {
          const targetId = proposal.payload.targetId;
          const ruleIndex = currentRules.findIndex((r) => r.id === targetId);

          if (ruleIndex !== -1) {
            const originalContent = currentRules[ruleIndex].content;
            const newContent = proposal.payload.newValue;

            // Update rule content
            currentRules = currentRules.map((rule) =>
              rule.id === targetId ? { ...rule, content: newContent } : rule,
            );

            // Track rule update
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
        break;
      }

      case ChangeProposalType.deleteRule: {
        if (
          isExpectedChangeProposalType(proposal, ChangeProposalType.deleteRule)
        ) {
          const targetId = proposal.payload.targetId;
          currentRules = currentRules.filter((r) => r.id !== targetId);
          changes.rules.deleted.add(targetId);

          // If this rule was previously added in this session, remove it from added
          // and don't mark as deleted
          if (changes.rules.added.has(targetId)) {
            changes.rules.added.delete(targetId);
            changes.rules.deleted.delete(targetId);
          }

          // If this rule was previously updated, keep the update info for showing
          // in the deleted state
        }
        break;
      }

      default:
        // Ignore non-standard proposal types
        break;
    }
  }

  return {
    name: currentName,
    description: currentDescription,
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

function isExpectedChangeProposalType<T extends ChangeProposalType>(
  changeProposal: ChangeProposal,
  expectedType: T,
): changeProposal is ChangeProposal<T> {
  return changeProposal.type === expectedType;
}
