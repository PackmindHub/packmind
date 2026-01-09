import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeVersionId } from '../../recipes';
import { SkillVersionId } from '../../skills';
import { StandardVersionId } from '../../standards';
import { TargetId } from '../TargetId';
import { Distribution } from '../Distribution';
import { PackageId } from '../Package';

/**
 * Command to publish recipes, standards, and skills artifacts to targets
 */
export type PublishArtifactsCommand = PackmindCommand & {
  recipeVersionIds: RecipeVersionId[];
  standardVersionIds: StandardVersionId[];
  skillVersionIds?: SkillVersionId[];
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
 * UseCase for publishing recipes, standards, and skills in a single unified operation
 */
export type IPublishArtifactsUseCase = IUseCase<
  PublishArtifactsCommand,
  PublishArtifactsResponse
>;
