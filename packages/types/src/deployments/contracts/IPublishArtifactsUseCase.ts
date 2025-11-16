import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeVersionId } from '../../recipes';
import { StandardVersionId } from '../../standards';
import { TargetId } from '../TargetId';
import { RecipesDeployment } from '../RecipesDeployment';
import { StandardsDeployment } from '../StandardsDeployment';

/**
 * Command to publish both recipes and standards artifacts to targets
 */
export type PublishArtifactsCommand = PackmindCommand & {
  recipeVersionIds: RecipeVersionId[];
  standardVersionIds: StandardVersionId[];
  targetIds: TargetId[];
};

/**
 * Response contains both recipe and standard deployments
 */
export type PublishArtifactsResponse = {
  recipeDeployments: RecipesDeployment[];
  standardDeployments: StandardsDeployment[];
};

/**
 * UseCase for publishing both recipes and standards in a single unified operation
 */
export type IPublishArtifactsUseCase = IUseCase<
  PublishArtifactsCommand,
  PublishArtifactsResponse
>;
