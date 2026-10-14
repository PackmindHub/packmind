import { DistributedPackageId } from './DistributedPackageId';
import { DistributionId } from './DistributionId';
import { Package, PackageId } from './Package';
import { StandardVersion } from '../standards/StandardVersion';
import { CommandVersion } from '../commands/CommandVersion';
import { SkillVersion } from '../skills/SkillVersion';
import type { Distribution } from './Distribution';
import { DistributionOperation } from './DistributionOperation';

export type DistributedPackage = {
  id: DistributedPackageId;
  distributionId: DistributionId;
  packageId: PackageId;
  standardVersions: StandardVersion[];
  recipeVersions: CommandVersion[];
  skillVersions: SkillVersion[];
  operation: DistributionOperation; // Required - 'add' or 'remove'
  /**
   * What the destination's `packmind.json` was left saying about this package:
   * `*` when it tracks the live package, an exact `X.Y.Z` when it is pinned to
   * a release.
   *
   * Null means this row does not record one, which is not the same as `*`. Rows
   * written before the column existed carry null whatever their destination
   * asked for, and so do the write sites that genuinely have no spec to record:
   * a CLI `install` reports a lock file and never the `packmind.json` beside
   * it, and a plugin render answers to a marketplace rather than to a
   * repository. A reader that measures drift against the pin has to decide what
   * null means to it; every such destination behaves today as if it tracked the
   * live package.
   */
  versionSpec: string | null;
  latestReleaseVersion: string | null;
  package?: Package; // Optional - loaded via relation
  distribution?: Distribution; // Optional - inverse side of relation
};
