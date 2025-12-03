import {
  IPublishPackages,
  PublishPackagesCommand,
  PackagesDeployment,
  Package,
  PackageId,
  RecipeId,
  StandardId,
  RecipeVersionId,
  StandardVersionId,
  PublishArtifactsCommand,
  IRecipesPort,
  IStandardsPort,
  IDeploymentPort,
  createDistributionId,
  createDistributedPackageId,
  RecipesDeployment,
  StandardsDeployment,
  UserId,
  OrganizationId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { PackageService } from '../services/PackageService';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';

const origin = 'PublishPackagesUseCase';

// Track resolved versions per package
type PackageVersionsMap = Map<
  PackageId,
  {
    recipeVersionIds: RecipeVersionId[];
    standardVersionIds: StandardVersionId[];
  }
>;

export class PublishPackagesUseCase implements IPublishPackages {
  constructor(
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly deploymentPort: IDeploymentPort,
    public readonly packageService: PackageService,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
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
    const recipeVersionCache = new Map<string, RecipeVersionId>();
    const standardVersionCache = new Map<string, StandardVersionId>();

    // Track per-package versions for distribution storage
    const packageVersionsMap: PackageVersionsMap = new Map();

    // Resolve versions per package and cache them
    for (const pkg of packages) {
      const pkgRecipeVersionIds: RecipeVersionId[] = [];
      const pkgStandardVersionIds: StandardVersionId[] = [];

      // Resolve recipe versions
      for (const recipeId of pkg.recipes) {
        if (!recipeVersionCache.has(recipeId)) {
          const versions = await this.recipesPort.listRecipeVersions(
            recipeId as RecipeId,
          );
          if (versions.length > 0) {
            const latestVersion = versions.sort(
              (a, b) => b.version - a.version,
            )[0];
            recipeVersionCache.set(
              recipeId,
              latestVersion.id as RecipeVersionId,
            );
          }
        }
        const versionId = recipeVersionCache.get(recipeId);
        if (versionId) {
          pkgRecipeVersionIds.push(versionId);
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

      packageVersionsMap.set(pkg.id, {
        recipeVersionIds: pkgRecipeVersionIds,
        standardVersionIds: pkgStandardVersionIds,
      });
    }

    // Collect unique version IDs for publishing
    const recipeVersionIds = Array.from(recipeVersionCache.values());
    const standardVersionIds = Array.from(standardVersionCache.values());

    this.logger.info('Resolved package contents', {
      packagesCount: packages.length,
      recipeVersionsCount: recipeVersionIds.length,
      standardVersionsCount: standardVersionIds.length,
    });

    // Publish artifacts using the unified publishArtifacts use case
    const { recipeDeployments, standardDeployments } =
      await this.deploymentPort.publishArtifacts({
        userId: command.userId,
        organizationId: command.organizationId,
        recipeVersionIds,
        standardVersionIds,
        targetIds: command.targetIds,
      } as PublishArtifactsCommand);

    // Combine deployments into a single array
    const allDeployments: PackagesDeployment[] = [
      ...(standardDeployments as unknown as PackagesDeployment[]),
      ...(recipeDeployments as unknown as PackagesDeployment[]),
    ];

    // Store distributions for each target
    await this.storeDistributions(
      command,
      packages,
      packageVersionsMap,
      recipeDeployments,
      standardDeployments,
    );

    this.logger.info('Successfully published packages', {
      deploymentsCount: allDeployments.length,
    });

    return allDeployments;
  }

  /**
   * Store distribution records for tracking package deployments.
   * Creates one Distribution per target, with DistributedPackages linking
   * each package to its deployed standard and recipe versions.
   */
  private async storeDistributions(
    command: PublishPackagesCommand,
    packages: Package[],
    packageVersionsMap: PackageVersionsMap,
    recipeDeployments: RecipesDeployment[],
    standardDeployments: StandardsDeployment[],
  ): Promise<void> {
    // Use recipe deployments as the primary source (one per target)
    // Fall back to standard deployments if no recipes
    const deployments: (RecipesDeployment | StandardsDeployment)[] =
      recipeDeployments.length > 0 ? recipeDeployments : standardDeployments;

    if (deployments.length === 0) {
      this.logger.info('No deployments to store distributions for');
      return;
    }

    this.logger.info('Storing distributions', {
      deploymentsCount: deployments.length,
      packagesCount: packages.length,
    });

    for (const deployment of deployments) {
      // Create Distribution record using data from the deployment
      const distributionId = createDistributionId(uuidv4());
      await this.distributionRepository.add({
        id: distributionId,
        authorId: command.userId as UserId,
        organizationId: command.organizationId as OrganizationId,
        target: deployment.target,
        status: deployment.status,
        gitCommit: deployment.gitCommit,
        error: deployment.error,
        renderModes: deployment.renderModes,
        distributedPackages: [],
        createdAt: new Date().toISOString(),
      });

      // Create DistributedPackage records for each package
      for (const pkg of packages) {
        const versions = packageVersionsMap.get(pkg.id);
        if (!versions) continue;

        const distributedPackageId = createDistributedPackageId(uuidv4());
        await this.distributedPackageRepository.add({
          id: distributedPackageId,
          distributionId,
          packageId: pkg.id,
          standardVersions: [],
          recipeVersions: [],
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
          await this.distributedPackageRepository.addRecipeVersions(
            distributedPackageId,
            versions.recipeVersionIds,
          );
        }
      }

      this.logger.info('Distribution stored', {
        distributionId,
        targetId: deployment.target.id,
        packagesCount: packages.length,
      });
    }
  }
}
