import { IUseCase, PackmindCommand } from '../../UseCase';
import { TargetId } from '../TargetId';
import { PackageId } from '../Package';
import { CommandVersionId } from '../../commands/CommandVersion';
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
 * The split that decides a removal: artifacts held only by the package being
 * removed get deleted, while artifacts shared with a remaining package are
 * re-rendered instead.
 */
export type TargetArtifactResolution = {
  targetId: TargetId;
  /** Exclusive to the removed package, so these get deleted. */
  exclusiveArtifacts: {
    recipeVersionIds: CommandVersionId[];
    // Command-named twin of `recipeVersionIds` (superset); same value.
    commandVersionIds: CommandVersionId[];
    standardVersionIds: StandardVersionId[];
    skillVersionIds: SkillVersionId[];
  };
  /** Shared with a remaining package, so these get re-rendered, not deleted. */
  remainingArtifacts: {
    recipeVersionIds: CommandVersionId[];
    // Command-named twin of `recipeVersionIds` (superset); same value.
    commandVersionIds: CommandVersionId[];
    standardVersionIds: StandardVersionId[];
    skillVersionIds: SkillVersionId[];
  };
};

export type RemovePackageFromTargetsResponse = {
  results: RemovePackageFromTargetsResult[];
  artifactResolutions?: TargetArtifactResolution[];
};

export type IRemovePackageFromTargetsUseCase = IUseCase<
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse
>;
