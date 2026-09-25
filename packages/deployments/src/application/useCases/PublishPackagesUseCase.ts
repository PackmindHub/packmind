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
import { sortVersionsLatestFirst } from '../services/PackageContentResolver';

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
     * Which version of each package is being sent.
     *
     * An absent entry is the live package, not the newest release: every
     * surface that distributes without naming a version — a batch push, a
     * redistribute from the sync surface — means "send what the package holds
     * now", and that is what it has always done.
     */
    const specs = packages.map((pkg, index) => {
      const raw = command.packageVersions?.[pkg.id as string];
      if (raw === undefined || raw === WILDCARD_VERSION_SPEC) {
        return { pkg, slug: packagesSlugs[index], version: null };
      }
      const parsed = parsePackageVersionSpec(raw);
      if (!parsed) {
        throw new InvalidPackageVersionSpecError(packagesSlugs[index], raw);
      }
      return {
        pkg,
        slug: packagesSlugs[index],
        version: parsed.kind === 'exact' ? parsed.version : null,
      };
    });

    const livePackages = specs.filter((spec) => spec.version === null);

    const [latestCommandVersions, latestStandardVersions, latestSkillVersions] =
      await Promise.all([
        this.commandsPort.getLatestCommandVersions(
          livePackages.flatMap((spec) => spec.pkg.recipes),
        ),
        this.standardsPort.getLatestStandardVersions(
          livePackages.flatMap((spec) => spec.pkg.standards),
        ),
        this.skillsPort.getLatestSkillVersions(
          livePackages.flatMap((spec) => spec.pkg.skills),
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

    const resolved: ResolvedPackagePublish[] = await Promise.all(
      specs.map(async ({ pkg, slug, version }) => {
        if (version === null) {
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

    const packageVersionsMap: PackageVersionsMap = new Map(
      resolved.map((entry) => [entry.pkg.id, entry.versions]),
    );

    // Deduplicated across packages: two packages sharing a component render it
    // once, and two packages pinned to different releases of it render the
    // first one listed.
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
      targetIds: command.targetIds,
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
    const allDeployments: PackagesDeployment[] = distributions.map(
      (distribution) => ({
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
      }),
    );

    this.logger.info('Successfully published packages', {
      deploymentsCount: allDeployments.length,
    });

    return allDeployments;
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
