import {
  ChangeProposalId,
  ChangeProposalType,
  Recipe,
  RecipeVersion,
  CommandChangeProposalApplier,
  DiffService,
} from '@packmind/types';
import { ChangeProposalWithConflicts } from '../types';
import {
  FieldChange,
  PREVIEW_RECIPE_VERSION_ID,
  trackScalarChange,
} from './changeProposalHelpers';

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
    id: PREVIEW_RECIPE_VERSION_ID,
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

  trackScalarChange(
    changes,
    'name',
    recipe.name,
    result.name,
    sortedProposals,
    ChangeProposalType.updateCommandName,
  );
  trackScalarChange(
    changes,
    'content',
    recipe.content,
    result.content,
    sortedProposals,
    ChangeProposalType.updateCommandDescription,
  );

  return { name: result.name, content: result.content, changes };
}
