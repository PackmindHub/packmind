import {
  IPublishPackages,
  PublishPackagesCommand,
  PackagesDeployment,
  Package,
  RecipeId,
  StandardId,
  PublishArtifactsCommand,
  IRecipesPort,
  IStandardsPort,
  IDeploymentPort,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { PackageService } from '../services/PackageService';

const origin = 'PublishPackagesUseCase';

export class PublishPackagesUseCase implements IPublishPackages {
  constructor(
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly deploymentPort: IDeploymentPort,
    public readonly packageService: PackageService,
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

    // Extract unique recipe and standard IDs from all packages
    const uniqueRecipeIds = new Set<string>();
    const uniqueStandardIds = new Set<string>();

    for (const pkg of packages) {
      pkg.recipes.forEach((recipeId) => uniqueRecipeIds.add(recipeId));
      pkg.standards.forEach((standardId) => uniqueStandardIds.add(standardId));
    }

    // Resolve recipe IDs to latest version IDs
    const recipeVersionIds: string[] = [];
    for (const recipeId of Array.from(uniqueRecipeIds)) {
      const versions = await this.recipesPort.listRecipeVersions(
        recipeId as RecipeId,
      );
      if (versions.length > 0) {
        const latestVersion = versions.sort((a, b) => b.version - a.version)[0];
        recipeVersionIds.push(latestVersion.id);
      }
    }

    // Resolve standard IDs to latest version IDs
    const standardVersionIds: string[] = [];
    for (const standardId of Array.from(uniqueStandardIds)) {
      const latestVersion = await this.standardsPort.getLatestStandardVersion(
        standardId as StandardId,
      );
      if (latestVersion) {
        standardVersionIds.push(latestVersion.id);
      }
    }

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

    this.logger.info('Successfully published packages', {
      deploymentsCount: allDeployments.length,
    });

    return allDeployments;
  }
}
