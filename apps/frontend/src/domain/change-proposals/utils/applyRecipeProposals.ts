import {
  ChangeProposalId,
  ChangeProposalType,
  Recipe,
  RecipeVersion,
  CommandChangeProposalApplier,
  DiffService,
  createRecipeVersionId,
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
 * Uses the shared CommandChangeProposalApplier for computing the
 * final state, including diff-based merging for content changes.
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

  if (sortedProposals.length === 0) {
    return { name: recipe.name, content: recipe.content, changes: {} };
  }

  // Build a RecipeVersion for the shared applier
  const sourceVersion: RecipeVersion = {
    id: createRecipeVersionId(''),
    recipeId: recipe.id,
    name: recipe.name,
    slug: recipe.slug,
    content: recipe.content,
    version: recipe.version,
    userId: recipe.userId,
  };

  const applier = new CommandChangeProposalApplier(new DiffService());
  const result = applier.applyChangeProposals(sourceVersion, sortedProposals);

  // Build change tracker from proposal classification
  const changes: RecipeChangeTracker = {};

  const nameProposalIds = sortedProposals
    .filter((p) => p.type === ChangeProposalType.updateCommandName)
    .map((p) => p.id);
  if (nameProposalIds.length > 0) {
    changes.name = {
      originalValue: recipe.name,
      finalValue: result.name,
      proposalIds: nameProposalIds,
    };
  }

  const contentProposalIds = sortedProposals
    .filter((p) => p.type === ChangeProposalType.updateCommandDescription)
    .map((p) => p.id);
  if (contentProposalIds.length > 0) {
    changes.content = {
      originalValue: recipe.content,
      finalValue: result.content,
      proposalIds: contentProposalIds,
    };
  }

  return { name: result.name, content: result.content, changes };
}
