import { ISystemUseCase, SystemPackmindCommand } from '@packmind/types';
import { Recipe } from '../Recipe';

export type UpdateRecipesFromGitLabCommand = SystemPackmindCommand & {
  payload: unknown;
  headers?: Record<string, string>;
};

export type UpdateRecipesFromGitLabResponse = Recipe[];

export type IUpdateRecipesFromGitLabUseCase = ISystemUseCase<
  UpdateRecipesFromGitLabCommand,
  UpdateRecipesFromGitLabResponse
>;
