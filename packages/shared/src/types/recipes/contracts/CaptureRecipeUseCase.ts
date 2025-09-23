import { IUseCase, PackmindCommand } from '../../UseCase';
import { Recipe } from '../Recipe';

export type CaptureRecipeCommand = PackmindCommand & {
  name: string;
  content: string;
  summary?: string | null;
};

export type CaptureRecipeResponse = Recipe;

export type ICaptureRecipeUseCase = IUseCase<
  CaptureRecipeCommand,
  CaptureRecipeResponse
>;
