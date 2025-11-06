import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeVersion } from '../../recipes';
import { GitRepo } from '../../git';
import { FileUpdates } from '../../deployments';
import { Target } from '../../deployments';

export type CodingAgent =
  | 'packmind'
  | 'junie'
  | 'claude'
  | 'cursor'
  | 'copilot'
  | 'agents_md'
  | 'gitlab_duo';

export type PrepareRecipesDeploymentCommand = PackmindCommand & {
  recipeVersions: RecipeVersion[];
  gitRepo: GitRepo;
  targets: Target[];
  codingAgents: CodingAgent[];
};

export type PrepareRecipesDeploymentResponse = FileUpdates;

export type IPrepareRecipesDeploymentUseCase = IUseCase<
  PrepareRecipesDeploymentCommand,
  PrepareRecipesDeploymentResponse
>;
