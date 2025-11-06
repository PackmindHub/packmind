import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeUsage } from '../RecipeUsage';

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
