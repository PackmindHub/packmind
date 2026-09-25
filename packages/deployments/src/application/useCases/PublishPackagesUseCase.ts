import {
  IPublishPackages,
  PublishPackagesCommand,
  PackagesDeployment,
  Package,
  PackageId,
  CommandVersionId,
  StandardVersionId,
  SkillVersionId,
  PublishArtifactsCommand,
  ICommandsPort,
  IStandardsPort,
  ISkillsPort,
  IDeploymentPort,
  ISpacesPort,
  SpaceId,
  createDistributedPackageId,
  createPackagesDeploymentId,
  Distribution,
  OrganizationId,
  PackmindFileConfig,
  TargetId,
  WILDCARD_VERSION_SPEC,
  parsePackageVersionSpec,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { PackageService } from '../services/PackageService';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { PackageNotFoundError } from '../../domain/errors/PackageNotFoundError';
import { PackageSpaceMissingError } from '../../domain/errors/PackageSpaceMissingError';
import { NoTargetsProvidedError } from '../../domain/errors/NoTargetsProvidedError';
import { NoPackagesProvidedError } from '../../domain/errors/NoPackagesProvidedError';
import { InvalidPackageVersionSpecError } from '../../domain/errors/InvalidPackageVersionSpecError';
import { PackageVersionNotAvailableError } from '../../domain/errors/PackageVersionNotAvailableError';
import { PackageReleaseService } from '../services/PackageReleaseService';
import {
  highestVersionOf,
  sortVersionsLatestFirst,
} from '../services/PackageContentResolver';
import { TargetPackmindConfigReader } from '../services/TargetPackmindConfigReader';

const origin = 'PublishPackagesUseCase';

type PackageComponentVersionIds = {
  recipeVersionIds: CommandVersionId[];
  standardVersionIds: StandardVersionId[];
  skillVersionIds: SkillVersionId[];
};

type PackageVersionsMap = Map<PackageId, PackageComponentVersionIds>;

/** One package, at the version this distribution is sending. */
type ResolvedPackagePublish = {
  pkg: Package;
  /** `@space/package`, as the repo's packmind.json will spell it. */
  slug: string;
  /** What packmind.json should record: `*`, or the released version. */
  versionSpec: string;
  recipeIds: string[];
  standardIds: string[];
  skillIds: string[];
  versions: PackageComponentVersionIds;
};

export class PublishPackagesUseCase implements IPublishPackages {
  constructor(
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly deploymentPort: IDeploymentPort,
    public readonly packageService: PackageService,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly spacesPort: ISpacesPort,
    private readonly packageReleaseService: PackageReleaseService,
    private readonly configReader: TargetPackmindConfigReader,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PublishPackagesCommand,
  ): Promise<PackagesDeployment[]> {
    if (!command.targetIds || command.targetIds.length === 0) {
      throw new NoTargetsProvidedError();
    }

    if (!command.packageIds || command.packageIds.length === 0) {
      throw new NoPackagesProvidedError();
    }

    this.logger.info('Publishing packages', {
      targetIdsCount: command.targetIds.length,
      packageIdsCount: command.packageIds.length,
      organizationId: command.organizationId,
    });

    const packagesById = new Map(
      (
        await this.packageService.getPackagesByIdsInOrganization(
          command.packageIds,
          command.organizationId as OrganizationId,
        )
      ).map((pkg) => [pkg.id, pkg]),
    );
    const packages: Package[] = command.packageIds.map((packageId) => {
      const pkg = packagesById.get(packageId);
      if (!pkg) {
        throw new PackageNotFoundError(packageId);
      }
      return pkg;
    });

    // Resolve package slugs in the `@<space-slug>/<package-slug>` form used by
    // the CLI so the deployed packmind.json references match across surfaces.
    // Ahead of the version resolution, because a refusal names the package the
    // way the repo's packmind.json will.
    const spaceSlugCache = new Map<SpaceId, string>();
    const packagesSlugs: string[] = [];
    for (const pkg of packages) {
      const spaceId = pkg.spaceId as SpaceId;
      let spaceSlug = spaceSlugCache.get(spaceId);
      if (spaceSlug === undefined) {
        const space = await this.spacesPort.getSpaceById(spaceId);
        if (!space) {
          throw new PackageSpaceMissingError(pkg.id, spaceId);
        }
        spaceSlug = space.slug;
        spaceSlugCache.set(spaceId, spaceSlug);
      }
      packagesSlugs.push(`@${spaceSlug}/${pkg.slug}`);
    }

    /*
     * Which version of each package this distribution sends, decided per
     * destination.
     *
     * A version the caller named applies everywhere: the package pane's
     * Distribute sends what its version bar reads, to every target it is
     * pointed at. A package the caller named no version for is decided by the
     * destination itself — a repo that pinned it moves to the newest release,
     * and one tracking the live package keeps tracking it.
     *
     * That is what stops `Update` destroying a pin. It used to send the live
     * package and write `*` over whatever the repo had chosen, because it had
     * never asked.
     */
    const explicit = packages.map((pkg, index) => {
      const raw = command.packageVersions?.[pkg.id as string];
      if (raw === undefined) {
        return null;
      }
      if (raw === WILDCARD_VERSION_SPEC) {
        return WILDCARD_VERSION_SPEC;
      }
      const parsed = parsePackageVersionSpec(raw);
      if (!parsed) {
        throw new InvalidPackageVersionSpecError(packagesSlugs[index], raw);
      }
      return parsed.kind === 'exact' ? parsed.version : WILDCARD_VERSION_SPEC;
    });

    const versionsByTarget = new Map<TargetId, string[]>();
    const latestReleaseCache = new Map<PackageId, string | null>();

    for (const targetId of command.targetIds) {
      // Only read the destination when something is left for it to decide.
      const config = explicit.some((version) => version === null)
        ? await this.configReader.read(targetId)
        : null;

      const versions: string[] = [];
      for (let index = 0; index < packages.length; index++) {
        const named = explicit[index];
        if (named !== null) {
          versions.push(named);
          continue;
        }
        versions.push(
          await this.versionForDestination(
            packages[index],
            packagesSlugs[index],
            config,
            latestReleaseCache,
          ),
        );
      }
      versionsByTarget.set(targetId, versions);
    }

    /*
     * Destinations that need the same versions go out together, so the repo
     * gets one commit for them. Two targets of one repository pinned
     * differently are two groups and two commits, which is the honest shape:
     * they are receiving different content.
     */
    const groups = new Map<
      string,
      { versions: string[]; targets: TargetId[] }
    >();
    for (const [targetId, versions] of versionsByTarget) {
      const key = versions.join('\u0000');
      const group = groups.get(key);
      if (group) {
        group.targets.push(targetId);
      } else {
        groups.set(key, { versions, targets: [targetId] });
      }
    }

    const allDeployments: PackagesDeployment[] = [];

    for (const group of groups.values()) {
      const resolved = await this.resolveContent(
        packages,
        packagesSlugs,
        group.versions,
      );

      const packageVersionsMap: PackageVersionsMap = new Map(
        resolved.map((entry) => [entry.pkg.id, entry.versions]),
      );

      // Deduplicated across packages: two packages sharing a component render
      // it once, and two packages pinned to different releases of it render
      // the first one listed.
      const commandVersionIds = [
        ...new Set(resolved.flatMap((e) => e.versions.recipeVersionIds)),
      ];
      const standardVersionIds = [
        ...new Set(resolved.flatMap((e) => e.versions.standardVersionIds)),
      ];
      const skillVersionIds = [
        ...new Set(resolved.flatMap((e) => e.versions.skillVersionIds)),
      ];

      const packageVersions: Record<string, string> = {};
      for (const entry of resolved) {
        packageVersions[entry.slug] = entry.versionSpec;
      }

      this.logger.info('Resolved package contents', {
        packagesCount: packages.length,
        targetsCount: group.targets.length,
        commandVersionsCount: commandVersionIds.length,
        standardVersionsCount: standardVersionIds.length,
        skillVersionsCount: skillVersionIds.length,
        packageVersions,
      });

      // Feeds the lock file that publishArtifacts generates.
      const artifactSpaceIds: Record<string, string> = {};
      const artifactPackageIds: Record<string, string[]> = {};

      for (const entry of resolved) {
        const artifactIds = [
          ...entry.recipeIds,
          ...entry.standardIds,
          ...entry.skillIds,
        ];
        for (const artifactId of artifactIds) {
          artifactSpaceIds[artifactId] = entry.pkg.spaceId as string;
          if (!artifactPackageIds[artifactId]) {
            artifactPackageIds[artifactId] = [];
          }
          artifactPackageIds[artifactId].push(entry.pkg.id as string);
        }
      }

      const { distributions } = await this.deploymentPort.publishArtifacts({
        userId: command.userId,
        organizationId: command.organizationId,
        commandVersionIds,
        standardVersionIds,
        skillVersionIds,
        targetIds: group.targets,
        packagesSlugs,
        packageVersions,
        packageIds: command.packageIds,
        artifactSpaceIds,
        artifactPackageIds,
      } as PublishArtifactsCommand);

      await this.storeDistributedPackages(
        packages,
        packageVersionsMap,
        distributions,
      );

      // PackagesDeployment is this use case's response shape, one per distribution.
      allDeployments.push(
        ...distributions.map((distribution) => ({
          id: createPackagesDeploymentId(uuidv4()),
          packages,
          status: distribution.status,
          gitCommit: distribution.gitCommit,
          target: distribution.target,
          error: distribution.error,
          renderModes: distribution.renderModes,
          createdAt: distribution.createdAt,
          authorId: distribution.authorId,
          organizationId: distribution.organizationId,
        })),
      );
    }

    this.logger.info('Successfully published packages', {
      deploymentsCount: allDeployments.length,
    });

    return allDeployments;
  }

  /**
   * The version one destination should receive of a package the caller named
   * no version for.
   *
   * A destination that pinned the package moves to the newest release, which
   * is the whole of "upgrade from the app": the reader asked for this
   * destination to be brought up to date, and up to date for a pinned repo is
   * the latest release, not the live package it deliberately stepped off.
   *
   * A destination tracking `*` keeps tracking it, and so does one that does
   * not carry the package yet — there is nothing there to honour.
   */
  private async versionForDestination(
    pkg: Package,
    slug: string,
    config: PackmindFileConfig | null,
    latestReleaseCache: Map<PackageId, string | null>,
  ): Promise<string> {
    const pinned = this.configReader.pinnedVersion(config, slug, pkg.slug);
    if (pinned === null) {
      return WILDCARD_VERSION_SPEC;
    }

    if (!latestReleaseCache.has(pkg.id)) {
      const releases = await this.packageReleaseService.listReleases(pkg.id);
      latestReleaseCache.set(pkg.id, highestVersionOf(releases));
    }

    /*
     * The pin itself when nothing can be read back, rather than `*`: a repo
     * that cannot be moved forward must not be silently unpinned instead. The
     * content resolution below then refuses on the version that is missing,
     * which is the honest answer.
     */
    return latestReleaseCache.get(pkg.id) ?? pinned;
  }

  /** The three version-id lists each package contributes, at its version. */
  private async resolveContent(
    packages: Package[],
    packagesSlugs: string[],
    versions: string[],
  ): Promise<ResolvedPackagePublish[]> {
    const liveIndexes = versions.flatMap((version, index) =>
      version === WILDCARD_VERSION_SPEC ? [index] : [],
    );
    const livePackages = liveIndexes.map((index) => packages[index]);

    const [latestCommandVersions, latestStandardVersions, latestSkillVersions] =
      await Promise.all([
        this.commandsPort.getLatestCommandVersions(
          livePackages.flatMap((pkg) => pkg.recipes),
        ),
        this.standardsPort.getLatestStandardVersions(
          livePackages.flatMap((pkg) => pkg.standards),
        ),
        this.skillsPort.getLatestSkillVersions(
          livePackages.flatMap((pkg) => pkg.skills),
        ),
      ]);
    const commandVersionIdByCommandId = new Map(
      latestCommandVersions.map((version) => [version.recipeId, version.id]),
    );
    const standardVersionIdByStandardId = new Map(
      latestStandardVersions.map((version) => [version.standardId, version.id]),
    );
    const skillVersionIdBySkillId = new Map(
      latestSkillVersions.map((version) => [version.skillId, version.id]),
    );

    return Promise.all(
      packages.map(async (pkg, index) => {
        const version = versions[index];
        const slug = packagesSlugs[index];

        if (version === WILDCARD_VERSION_SPEC) {
          // An artifact with no version of its own is skipped.
          return {
            pkg,
            slug,
            versionSpec: WILDCARD_VERSION_SPEC,
            recipeIds: pkg.recipes,
            standardIds: pkg.standards,
            skillIds: pkg.skills,
            versions: {
              recipeVersionIds: pkg.recipes.flatMap(
                (recipeId) => commandVersionIdByCommandId.get(recipeId) ?? [],
              ),
              standardVersionIds: pkg.standards.flatMap(
                (standardId) =>
                  standardVersionIdByStandardId.get(standardId) ?? [],
              ),
              skillVersionIds: pkg.skills.flatMap(
                (skillId) => skillVersionIdBySkillId.get(skillId) ?? [],
              ),
            },
          };
        }

        const release = await this.packageReleaseService.findByVersion(
          pkg.id,
          version,
        );
        if (!release) {
          const releases = await this.packageReleaseService.listReleases(
            pkg.id,
          );
          throw new PackageVersionNotAvailableError(
            slug,
            version,
            sortVersionsLatestFirst(releases),
          );
        }

        /*
         * The release as captured, which is not the package as it stands: a
         * component added since is absent here, and one deleted since is
         * present. The artifact-id lists follow the release for the same
         * reason — they feed the lock file, and a lock file listing a
         * component the release does not carry describes a repo that does not
         * exist.
         */
        return {
          pkg,
          slug,
          versionSpec: release.version,
          recipeIds: release.recipeVersions.map((v) => v.recipeId),
          standardIds: release.standardVersions.map((v) => v.standardId),
          skillIds: release.skillVersions.map((v) => v.skillId),
          versions: {
            recipeVersionIds: release.recipeVersions.map((v) => v.id),
            standardVersionIds: release.standardVersions.map((v) => v.id),
            skillVersionIds: release.skillVersions.map((v) => v.id),
          },
        };
      }),
    );
  }

  private async storeDistributedPackages(
    packages: Package[],
    packageVersionsMap: PackageVersionsMap,
    distributions: Distribution[],
  ): Promise<void> {
    if (distributions.length === 0) {
      this.logger.info('No distributions to store distributed packages for');
      return;
    }

    this.logger.info('Storing distributed packages', {
      distributionsCount: distributions.length,
      packagesCount: packages.length,
    });

    for (const distribution of distributions) {
      for (const pkg of packages) {
        const versions = packageVersionsMap.get(pkg.id);
        if (!versions) continue;

        const distributedPackageId = createDistributedPackageId(uuidv4());
        await this.distributedPackageRepository.add({
          id: distributedPackageId,
          distributionId: distribution.id,
          packageId: pkg.id,
          standardVersions: [],
          recipeVersions: [],
          skillVersions: [],
          operation: 'add',
        });

        if (versions.standardVersionIds.length > 0) {
          await this.distributedPackageRepository.addStandardVersions(
            distributedPackageId,
            versions.standardVersionIds,
          );
        }

        if (versions.recipeVersionIds.length > 0) {
          await this.distributedPackageRepository.addCommandVersions(
            distributedPackageId,
            versions.recipeVersionIds,
          );
        }

        if (versions.skillVersionIds.length > 0) {
          await this.distributedPackageRepository.addSkillVersions(
            distributedPackageId,
            versions.skillVersionIds,
          );
        }
      }

      this.logger.info('Distributed packages stored', {
        distributionId: distribution.id,
        targetId: distribution.target.id,
        packagesCount: packages.length,
      });
    }
  }
}
