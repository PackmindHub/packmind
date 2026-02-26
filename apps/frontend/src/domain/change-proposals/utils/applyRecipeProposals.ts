import {
  ChangeProposal,
  ChangeProposalId,
  ChangeProposalType,
  Recipe,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { FieldChange } from './applyStandardProposals';

export interface RecipeChangeTracker {
  name?: FieldChange;
  content?: FieldChange;
}

export interface AppliedRecipe {
  name: string;
  content: string;
  changes: RecipeChangeTracker;
}

/**
 * Applies all accepted change proposals sequentially to a recipe,
 * tracking all changes for highlighting in the unified view.
 *
 * This replicates the backend CommandChangeProposalsApplier logic
 * for frontend preview purposes.
 */
export function applyRecipeProposals(
  recipe: Recipe,
  proposals: ChangeProposalWithConflicts[],
  acceptedIds: Set<ChangeProposalId>,
): AppliedRecipe {
  const acceptedProposals = proposals.filter((p) => acceptedIds.has(p.id));

  const sortedProposals = [...acceptedProposals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  let currentName = recipe.name;
  let currentContent = recipe.content;

  const originalName = recipe.name;
  const originalContent = recipe.content;

  const changes: RecipeChangeTracker = {};

  for (const proposal of sortedProposals) {
    switch (proposal.type) {
      case ChangeProposalType.updateCommandName: {
        if (isExpectedType(proposal, ChangeProposalType.updateCommandName)) {
          currentName = proposal.payload.newValue;

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

      case ChangeProposalType.updateCommandDescription: {
        if (
          isExpectedType(proposal, ChangeProposalType.updateCommandDescription)
        ) {
          currentContent = proposal.payload.newValue;

          if (!changes.content) {
            changes.content = {
              originalValue: originalContent,
              finalValue: currentContent,
              proposalIds: [proposal.id],
            };
          } else {
            changes.content.finalValue = currentContent;
            changes.content.proposalIds.push(proposal.id);
          }
        }
        break;
      }

      default:
        break;
    }
  }

  return {
    name: currentName,
    content: currentContent,
    changes,
  };
}

function isExpectedType<T extends ChangeProposalType>(
  changeProposal: ChangeProposal,
  expectedType: T,
): changeProposal is ChangeProposal<T> {
  return changeProposal.type === expectedType;
}
