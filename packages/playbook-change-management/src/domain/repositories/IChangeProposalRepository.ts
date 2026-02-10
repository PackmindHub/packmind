import { ChangeProposal, ChangeProposalType, RecipeId } from '@packmind/types';

export type CommandChangeProposalType =
  | ChangeProposalType.updateCommandName
  | ChangeProposalType.updateCommandDescription;

export interface IChangeProposalRepository {
  save(
    recipeId: RecipeId,
    proposal: ChangeProposal<CommandChangeProposalType>,
  ): Promise<void>;
  findByRecipeId(
    recipeId: RecipeId,
  ): Promise<ChangeProposal<CommandChangeProposalType>[]>;
}
