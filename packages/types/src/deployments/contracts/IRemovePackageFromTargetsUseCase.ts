import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetId } from '../TargetId';
import { PackageId } from '../Package';
import { RecipeVersionId } from '../../recipes/RecipeVersion';
import { StandardVersionId } from '../../standards/StandardVersionId';
import { SkillVersionId } from '../../skills/SkillVersionId';

export type RemovePackageFromTargetsCommand = PackmindCommand & {
  packageId: PackageId;
  targetIds: TargetId[];
};

export type RemovePackageFromTargetsResult = {
  targetId: TargetId;
  success: boolean;
  error?: string;
};

/**
 * Represents the resolved artifacts for a target when removing a package.
 * Contains information about which artifacts are exclusive to the removed package
 * and which artifacts remain from other packages.
 */
export type TargetArtifactResolution = {
  targetId: TargetId;
  /** Artifacts that only belong to the removed package and should be deleted */
  exclusiveArtifacts: {
    recipeVersionIds: RecipeVersionId[];
    standardVersionIds: StandardVersionId[];
    skillVersionIds: SkillVersionId[];
  };
  /** Artifacts that belong to remaining packages and should be re-rendered */
  remainingArtifacts: {
    recipeVersionIds: RecipeVersionId[];
    standardVersionIds: StandardVersionId[];
    skillVersionIds: SkillVersionId[];
  };
};

export type RemovePackageFromTargetsResponse = {
  results: RemovePackageFromTargetsResult[];
  /** Optional artifact resolutions for each target showing which artifacts were exclusive vs shared */
  artifactResolutions?: TargetArtifactResolution[];
};

export type IRemovePackageFromTargetsUseCase = IUseCase<
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse
>;
