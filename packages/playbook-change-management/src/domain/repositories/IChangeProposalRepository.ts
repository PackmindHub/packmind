import { ChangeProposal, ChangeProposalType, RecipeId } from '@packmind/types';

export interface IChangeProposalRepository {
  save(
    recipeId: RecipeId,
    proposal: ChangeProposal<ChangeProposalType>,
  ): Promise<void>;
  findByRecipeId(
    recipeId: RecipeId,
  ): Promise<ChangeProposal<ChangeProposalType>[]>;
}
