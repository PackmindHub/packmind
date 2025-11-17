import { IUseCase, PackmindCommand } from '../../UseCase';
import { Recipe } from '../Recipe';
import { RecipeStep } from './CaptureRecipeUseCase';

export type CaptureRecipeWithPackagesCommand = PackmindCommand & {
  name: string;
  spaceId: string;
  summary?: string;
  whenToUse?: string[];
  contextValidationCheckpoints?: string[];
  steps?: RecipeStep[];
  packageSlugs?: string[];
};

export type CaptureRecipeWithPackagesResponse = {
  recipe: Recipe;
};

export type ICaptureRecipeWithPackagesUseCase = IUseCase<
  CaptureRecipeWithPackagesCommand,
  CaptureRecipeWithPackagesResponse
>;
