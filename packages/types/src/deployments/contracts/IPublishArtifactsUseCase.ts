import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeVersionId } from '../../recipes';
import { StandardVersionId } from '../../standards';
import { TargetId } from '../TargetId';
import { Distribution } from '../Distribution';
import { PackageId } from '../Package';

/**
 * Command to publish both recipes and standards artifacts to targets
 */
export type PublishArtifactsCommand = PackmindCommand & {
  recipeVersionIds: RecipeVersionId[];
  standardVersionIds: StandardVersionId[];
  targetIds: TargetId[];
  packagesSlugs: string[];
  packageIds: PackageId[];
};

/**
 * Response contains distributions for each target
 */
export type PublishArtifactsResponse = {
  distributions: Distribution[];
};

/**
 * UseCase for publishing both recipes and standards in a single unified operation
 */
export type IPublishArtifactsUseCase = IUseCase<
  PublishArtifactsCommand,
  PublishArtifactsResponse
>;
