import { IUseCase, PackmindCommand } from '../../UseCase';
import { CommandVersionId } from '../../commands';
import { SkillVersionId } from '../../skills';
import { StandardVersionId } from '../../standards';
import { TargetId } from '../TargetId';
import { Distribution } from '../Distribution';
import { PackageId } from '../Package';

export type PublishArtifactsCommand = PackmindCommand & {
  commandVersionIds: CommandVersionId[];
  standardVersionIds: StandardVersionId[];
  skillVersionIds?: SkillVersionId[];
  targetIds: TargetId[];
  packagesSlugs: string[];
  /**
   * What each slug in `packagesSlugs` pins, keyed by that same slug: an exact
   * `X.Y.Z` for a release, `*` for the live package.
   *
   * A slug with no entry is written as `*`, which is truthful — a distribution
   * that named no version pushed the live package.
   */
  packageVersions?: Record<string, string>;
  packageIds: PackageId[];
  artifactSpaceIds?: Record<string, string>;
  artifactPackageIds?: Record<string, string[]>;
};

export type PublishArtifactsResponse = {
  distributions: Distribution[];
};

/** Publishes commands, standards and skills in one unified operation. */
export type IPublishArtifactsUseCase = IUseCase<
  PublishArtifactsCommand,
  PublishArtifactsResponse
>;
