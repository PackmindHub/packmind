import { IUseCase, PackmindCommand } from '@packmind/types';
import { RecipeUsage } from '../entities/RecipeUsage';

export type TrackRecipeUsageCommand = PackmindCommand & {
  recipeSlugs: string[];
  aiAgent: string;
  gitRepo?: string;
  target?: string;
};

export type ITrackRecipeUsageUseCase = IUseCase<
  TrackRecipeUsageCommand,
  RecipeUsage[]
>;
