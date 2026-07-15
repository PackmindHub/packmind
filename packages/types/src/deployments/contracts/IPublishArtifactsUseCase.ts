import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandVersionId } from '../../commands';
import { SkillVersionId } from '../../skills';
import { StandardVersionId } from '../../standards';
import { TargetId } from '../TargetId';
import { Distribution } from '../Distribution';
import { PackageId } from '../Package';

/**
 * Command to publish recipes, standards, and skills artifacts to targets
 */
export type PublishArtifactsCommand = PackmindCommand & {
  recipeVersionIds: CommandVersionId[];
  standardVersionIds: StandardVersionId[];
  skillVersionIds?: SkillVersionId[];
  targetIds: TargetId[];
  packagesSlugs: string[];
  packageIds: PackageId[];
  artifactSpaceIds?: Record<string, string>;
  artifactPackageIds?: Record<string, string[]>;
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
