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
  /**
   * What individual destinations of the same repository should receive, when
   * they do not all want the same thing — one target pinned to a release and
   * another tracking the live package, say.
   *
   * Keyed by target id; a target with no entry takes the repository-wide
   * fields above. The version ids listed here must also appear in
   * `commandVersionIds` / `standardVersionIds` / `skillVersionIds`, which
   * carry the union: those are what the publish resolves and diffs against
   * what each destination already holds, and this only narrows what is
   * rendered where.
   *
   * It exists so a repository still gets one commit. Splitting the publish
   * per version group would enqueue two jobs against one branch, and they
   * commit from a worker, concurrently.
   */
  perTarget?: Record<string, TargetPublishOverride>;
  artifactSpaceIds?: Record<string, string>;
  artifactPackageIds?: Record<string, string[]>;
};

/** What one destination receives, where it differs from the repository. */
export type TargetPublishOverride = {
  /** Artifact version ids to render here; others in the union are skipped. */
  versionIds: string[];
  /** What each package slug pins here, written into this target's packmind.json. */
  packageVersions?: Record<string, string>;
};

export type PublishArtifactsResponse = {
  distributions: Distribution[];
};

/** Publishes commands, standards and skills in one unified operation. */
export type IPublishArtifactsUseCase = IUseCase<
  PublishArtifactsCommand,
  PublishArtifactsResponse
>;
