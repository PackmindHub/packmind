import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetId } from '../TargetId';
import { PackageId } from '../Package';
import { RecipeVersionId } from '../../recipes/RecipeVersion';
import { StandardVersionId } from '../../standards/StandardVersionId';

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
  };
  /** Artifacts that belong to remaining packages and should be re-rendered */
  remainingArtifacts: {
    recipeVersionIds: RecipeVersionId[];
    standardVersionIds: StandardVersionId[];
  };
};

export type RemovePackageFromTargetsResponse = {
  results: RemovePackageFromTargetsResult[];
  /** Artifact resolutions for each target, computed during removal */
  artifactResolutions?: TargetArtifactResolution[];
};

export type IRemovePackageFromTargetsUseCase = IUseCase<
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse
>;
