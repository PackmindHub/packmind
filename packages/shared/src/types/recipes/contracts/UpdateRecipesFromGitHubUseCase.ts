import { ISystemUseCase, SystemPackmindCommand } from '@packmind/types';
import { Recipe } from '../Recipe';

export type UpdateRecipesFromGitHubCommand = SystemPackmindCommand & {
  payload: unknown;
  headers?: Record<string, string>;
};

export type UpdateRecipesFromGitHubResponse = Recipe[];

export type IUpdateRecipesFromGitHubUseCase = ISystemUseCase<
  UpdateRecipesFromGitHubCommand,
  UpdateRecipesFromGitHubResponse
>;
