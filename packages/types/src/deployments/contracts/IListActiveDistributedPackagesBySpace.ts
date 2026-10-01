import { IUseCase, SpaceMemberCommand } from '../../UseCase';
import { GitRepo } from '../../git/GitRepo';
import { TargetId } from '../TargetId';
import { Package, PackageId } from '../Package';
import { Target } from '../Target';
import { DistributionStatus } from '../DistributionStatus';
import { CommandId } from '../../commands';
import { StandardId } from '../../standards';
import { SkillId } from '../../skills';
import { DeployedStandardTargetInfo } from '../StandardDeploymentOverview';
import { DeployedSkillTargetInfo } from '../SkillDeploymentOverview';
import { DeployedCommandTargetInfo } from './IGetDeploymentOverview';

export type ListActiveDistributedPackagesBySpaceCommand = SpaceMemberCommand;

export type PackageArtifactCounts = {
  recipes: number;
  // Command-named twin of `recipes` (superset for recipes→commands rename); same value.
  commands: number;
  standards: number;
  skills: number;
};

export type PendingCommandInfo = {
  id: CommandId;
  name: string;
  slug: string;
};

export type PendingStandardInfo = {
  id: StandardId;
  name: string;
  slug: string;
};

export type PendingSkillInfo = {
  id: SkillId;
  name: string;
  slug: string;
};

export type ActiveDistributedPackage = {
  packageId: PackageId;
  package: Package;
  lastDistributionStatus: DistributionStatus;
  lastDistributedAt: string;
  /**
   * Why that last distribution failed, and null whenever it did not.
   *
   * The raw message the job caught, unedited. A destination that reads `failed`
   * carries the reason with it, so the reader learns what went wrong where they
   * learned that something did, rather than in the distribution history.
   */
  lastDistributionError: string | null;
  /**
   * Which version of this package the destination asked for: `*` when it tracks
   * the live package, an exact `X.Y.Z` when it is pinned to a release.
   *
   * What tells a *drifted* destination from a *behind* one, and the two are not
   * the same thing. A `*` destination is measured against the live package, so
   * a component edited since its last distribution leaves it drifted and a push
   * puts it right. A pinned one deliberately stepped off the live package:
   * measuring it the same way reports it behind the moment anyone edits a
   * component, and the push it is then offered sends the release the repository
   * already has.
   *
   * Null means the distribution recorded no spec — every row written before the
   * column existed, and every one written by a path that has none to record. A
   * reader that measures drift against the pin treats it as the live package,
   * which is how those destinations already behave.
   */
  versionSpec: string | null;
  /**
   * The newest release this package has, or null when it has never been cut.
   *
   * What a pinned destination is measured against: it is behind when a release
   * newer than its pin exists, and `Update` is then the thing that moves it,
   * because a release is something `Update` can actually send.
   *
   * A fact about the package rather than about this destination, repeated on
   * every destination of it. The alternative is a second map the reader has to
   * join by hand, and every consumer of this payload works a destination at a
   * time.
   */
  latestReleaseVersion: string | null;
  /**
   * Whether the package has moved on from `latestReleaseVersion` — a component
   * edited, added or removed since, or its own name or description changed.
   *
   * The other half of what makes a pinned destination behind, and the half
   * `Update` cannot fix: there is nothing newer to send, so the way out is to
   * cut a release. Reading it as drift and offering `Update` is what let a
   * reader press that button all afternoon against an unchanged repository.
   *
   * True for a package that has never been released and holds components, since
   * all of it is unreleased; false for one holding no component at all, which
   * has nothing to cut.
   */
  hasUnreleasedChanges: boolean;
  deployedRecipes: DeployedCommandTargetInfo[];
  // Command-named twin of `deployedRecipes` (superset); same value.
  deployedCommands: DeployedCommandTargetInfo[];
  deployedStandards: DeployedStandardTargetInfo[];
  deployedSkills: DeployedSkillTargetInfo[];
  pendingRecipes: PendingCommandInfo[];
  // Command-named twin of `pendingRecipes` (superset); same value.
  pendingCommands: PendingCommandInfo[];
  pendingStandards: PendingStandardInfo[];
  pendingSkills: PendingSkillInfo[];
};

export type ActiveDistributedPackagesByTarget = {
  targetId: TargetId;
  target: Target;
  gitRepo: GitRepo | null;
  packages: ActiveDistributedPackage[];
};

export type ListActiveDistributedPackagesBySpaceResponse =
  ActiveDistributedPackagesByTarget[];

export type IListActiveDistributedPackagesBySpaceUseCase = IUseCase<
  ListActiveDistributedPackagesBySpaceCommand,
  ListActiveDistributedPackagesBySpaceResponse
>;
