import {
  ChangeProposalConflictError,
  ChangeProposalId,
  Recipe,
  RecipeVersion,
  CommandChangeProposalApplier,
  DiffService,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import { PREVIEW_RECIPE_VERSION_ID } from './changeProposalHelpers';

export interface AppliedRecipe {
  name: string;
  content: string;
}

/**
 * Applies all accepted change proposals sequentially to a recipe.
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
    return { name: recipe.name, content: recipe.content };
  }

  // Build a RecipeVersion for the shared applier
  const sourceVersion: RecipeVersion = {
    id: PREVIEW_RECIPE_VERSION_ID,
    recipeId: recipe.id,
    name: recipe.name,
    slug: recipe.slug,
    content: recipe.content,
    version: recipe.version,
    userId: recipe.userId,
  };

  const applier = new CommandChangeProposalApplier(new DiffService());

  try {
    const result = applier.applyChangeProposals(sourceVersion, sortedProposals);
    return result.version;
  } catch (error) {
    if (error instanceof ChangeProposalConflictError) {
      return { name: recipe.name, content: recipe.content };
    }
    throw error;
  }
}
