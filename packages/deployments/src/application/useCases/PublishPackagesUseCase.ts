import {
  IPublishPackages,
  PublishPackagesCommand,
  PackagesDeployment,
  Package,
  PackageId,
  CommandId,
  StandardId,
  SkillId,
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
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { PackageService } from '../services/PackageService';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';

const origin = 'PublishPackagesUseCase';

// Track resolved versions per package
type PackageVersionsMap = Map<
  PackageId,
  {
    recipeVersionIds: CommandVersionId[];
    standardVersionIds: StandardVersionId[];
    skillVersionIds: SkillVersionId[];
  }
>;

export class PublishPackagesUseCase implements IPublishPackages {
  constructor(
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly deploymentPort: IDeploymentPort,
    public readonly packageService: PackageService,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly spacesPort: ISpacesPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PublishPackagesCommand,
  ): Promise<PackagesDeployment[]> {
    if (!command.targetIds || command.targetIds.length === 0) {
      throw new Error('targetIds must be provided');
    }

    if (!command.packageIds || command.packageIds.length === 0) {
      throw new Error('packageIds must be provided');
    }

    this.logger.info('Publishing packages', {
      targetIdsCount: command.targetIds.length,
      packageIdsCount: command.packageIds.length,
      organizationId: command.organizationId,
    });

    // Fetch packages by their IDs
    const packages: Package[] = [];
    for (const packageId of command.packageIds) {
      const pkg = await this.packageService.findById(packageId);
      if (!pkg) {
        throw new Error(`Package with ID ${packageId} not found`);
      }
      packages.push(pkg);
    }

    // Build a map of recipeId -> latestVersionId for deduplication
    const commandVersionCache = new Map<string, CommandVersionId>();
    const standardVersionCache = new Map<string, StandardVersionId>();
    const skillVersionCache = new Map<string, SkillVersionId>();

    // Track per-package versions for distribution storage
    const packageVersionsMap: PackageVersionsMap = new Map();

    // Resolve versions per package and cache them
    for (const pkg of packages) {
      const pkgCommandVersionIds: CommandVersionId[] = [];
      const pkgStandardVersionIds: StandardVersionId[] = [];
      const pkgSkillVersionIds: SkillVersionId[] = [];

      // Resolve recipe versions
      for (const recipeId of pkg.recipes) {
        if (!commandVersionCache.has(recipeId)) {
          const versions = await this.commandsPort.listCommandVersions(
            recipeId as CommandId,
          );
          if (versions.length > 0) {
            const latestVersion = versions.sort(
              (a, b) => b.version - a.version,
            )[0];
            commandVersionCache.set(
              recipeId,
              latestVersion.id as CommandVersionId,
            );
          }
        }
        const versionId = commandVersionCache.get(recipeId);
        if (versionId) {
          pkgCommandVersionIds.push(versionId);
        }
      }

      // Resolve standard versions
      for (const standardId of pkg.standards) {
        if (!standardVersionCache.has(standardId)) {
          const latestVersion =
            await this.standardsPort.getLatestStandardVersion(
              standardId as StandardId,
            );
          if (latestVersion) {
            standardVersionCache.set(
              standardId,
              latestVersion.id as StandardVersionId,
            );
          }
        }
        const versionId = standardVersionCache.get(standardId);
        if (versionId) {
          pkgStandardVersionIds.push(versionId);
        }
      }

      // Resolve skill versions
      for (const skillId of pkg.skills) {
        if (!skillVersionCache.has(skillId)) {
          const latestVersion = await this.skillsPort.getLatestSkillVersion(
            skillId as SkillId,
          );
          if (latestVersion) {
            skillVersionCache.set(skillId, latestVersion.id as SkillVersionId);
          }
        }
        const versionId = skillVersionCache.get(skillId);
        if (versionId) {
          pkgSkillVersionIds.push(versionId);
        }
      }

      packageVersionsMap.set(pkg.id, {
        recipeVersionIds: pkgCommandVersionIds,
        standardVersionIds: pkgStandardVersionIds,
        skillVersionIds: pkgSkillVersionIds,
      });
    }

    // Collect unique version IDs for publishing
    const recipeVersionIds = Array.from(commandVersionCache.values());
    const standardVersionIds = Array.from(standardVersionCache.values());
    const skillVersionIds = Array.from(skillVersionCache.values());

    this.logger.info('Resolved package contents', {
      packagesCount: packages.length,
      recipeVersionsCount: recipeVersionIds.length,
      standardVersionsCount: standardVersionIds.length,
      skillVersionsCount: skillVersionIds.length,
    });

    // Resolve package slugs in the `@<space-slug>/<package-slug>` form used by
    // the CLI so the deployed packmind.json references match across surfaces.
    const spaceSlugCache = new Map<SpaceId, string>();
    const packagesSlugs: string[] = [];
    for (const pkg of packages) {
      const spaceId = pkg.spaceId as SpaceId;
      let spaceSlug = spaceSlugCache.get(spaceId);
      if (spaceSlug === undefined) {
        const space = await this.spacesPort.getSpaceById(spaceId);
        if (!space) {
          throw new Error(`Space ${spaceId} not found for package ${pkg.slug}`);
        }
        spaceSlug = space.slug;
        spaceSlugCache.set(spaceId, spaceSlug);
      }
      packagesSlugs.push(`@${spaceSlug}/${pkg.slug}`);
    }

    // Build artifact metadata maps for lock file generation
    const artifactSpaceIds: Record<string, string> = {};
    const artifactPackageIds: Record<string, string[]> = {};

    for (const pkg of packages) {
      for (const recipeId of pkg.recipes) {
        artifactSpaceIds[recipeId] = pkg.spaceId as string;
        if (!artifactPackageIds[recipeId]) {
          artifactPackageIds[recipeId] = [];
        }
        artifactPackageIds[recipeId].push(pkg.id as string);
      }

      for (const standardId of pkg.standards) {
        artifactSpaceIds[standardId] = pkg.spaceId as string;
        if (!artifactPackageIds[standardId]) {
          artifactPackageIds[standardId] = [];
        }
        artifactPackageIds[standardId].push(pkg.id as string);
      }

      for (const skillId of pkg.skills) {
        artifactSpaceIds[skillId] = pkg.spaceId as string;
        if (!artifactPackageIds[skillId]) {
          artifactPackageIds[skillId] = [];
        }
        artifactPackageIds[skillId].push(pkg.id as string);
      }
    }

    // Publish artifacts using the unified publishArtifacts use case
    const { distributions } = await this.deploymentPort.publishArtifacts({
      userId: command.userId,
      organizationId: command.organizationId,
      recipeVersionIds,
      standardVersionIds,
      skillVersionIds,
      targetIds: command.targetIds,
      packagesSlugs,
      packageIds: command.packageIds,
      artifactSpaceIds,
      artifactPackageIds,
    } as PublishArtifactsCommand);

    // Store distributed package records for each distribution
    await this.storeDistributedPackages(
      packages,
      packageVersionsMap,
      distributions,
    );

    // Convert distributions to PackagesDeployment format for backward compatibility
    const allDeployments: PackagesDeployment[] = distributions.map(
      (distribution) => ({
        id: createPackagesDeploymentId(uuidv4()),
        packages, // All packages that were distributed
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

  /**
   * Store distributed package records for tracking package deployments.
   * Creates DistributedPackage entries linking each package to its
   * deployed standard and recipe versions within each distribution.
   */
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
      // Create DistributedPackage records for each package
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

        // Link standard versions
        if (versions.standardVersionIds.length > 0) {
          await this.distributedPackageRepository.addStandardVersions(
            distributedPackageId,
            versions.standardVersionIds,
          );
        }

        // Link recipe versions
        if (versions.recipeVersionIds.length > 0) {
          await this.distributedPackageRepository.addCommandVersions(
            distributedPackageId,
            versions.recipeVersionIds,
          );
        }

        // Link skill versions
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
