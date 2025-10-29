import { IUseCase, PackmindCommand } from '../../UseCase';
import { Recipe } from '../Recipe';

export type RecipeStep = {
  name: string;
  description: string;
  codeSnippet?: string;
};

export type CaptureRecipeCommand = PackmindCommand & {
  name: string;
  spaceId: string; // Required space ID for space-specific recipes
  // New structured format (preferred)
  summary?: string;
  whenToUse?: string[];
  contextValidationCheckpoints?: string[];
  steps?: RecipeStep[];
  // Legacy format (deprecated, for backward compatibility)
  content?: string;
};

export type CaptureRecipeResponse = Recipe;

export type ICaptureRecipeUseCase = IUseCase<
  CaptureRecipeCommand,
  CaptureRecipeResponse
>;
