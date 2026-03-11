import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  createDistributedPackageId,
  createDistributionId,
  Distribution,
  DistributedPackage,
  DistributionStatus,
  IAccountsPort,
  INotifyDistributionUseCase,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  NotifyDistributionCommand,
  NotifyDistributionResponse,
  OrganizationId,
  Package,
  PackageId,
  RecipeId,
  RecipeVersion,
  RecipeVersionId,
  RenderMode,
  SkillId,
  SkillVersionId,
  StandardId,
  StandardVersionId,
  Target,
  TargetId,
  UserId,
} from '@packmind/types';
import { RenderModeConfigurationService } from '../../services/RenderModeConfigurationService';
import { v4 as uuidv4 } from 'uuid';
import { IDistributedPackageRepository } from '../../../domain/repositories/IDistributedPackageRepository';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { IPackageRepository } from '../../../domain/repositories/IPackageRepository';
import { TargetResolutionService } from '../../services/TargetResolutionService';

const origin = 'NotifyDistributionUseCase';

type DistributedPackageWithVersionIds = DistributedPackage & {
  _standardVersionIds: StandardVersionId[];
  _recipeVersionIds: RecipeVersionId[];
  _skillVersionIds: SkillVersionId[];
};

export class NotifyDistributionUseCase
  extends AbstractMemberUseCase<
    NotifyDistributionCommand,
    NotifyDistributionResponse
  >
  implements INotifyDistributionUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly packageRepository: IPackageRepository,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly targetResolutionService: TargetResolutionService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: NotifyDistributionCommand & MemberContext,
  ): Promise<NotifyDistributionResponse> {
    const {
      distributedPackages: packageSlugs,
      gitRemoteUrl,
      gitBranch,
      relativePath,
    } = command;

    const userId = command.user.id;
    const organizationId = command.organization.id;

    this.logger.info('Processing distribution notification', {
      packageSlugs,
      gitRemoteUrl,
      gitBranch,
      relativePath,
    });

    const target =
      await this.targetResolutionService.findOrCreateTargetFromGitInfo(
        organizationId,
        userId,
        gitRemoteUrl,
        gitBranch,
        relativePath,
      );

    const previouslyActivePackageIds = await this.getPreviouslyActivePackageIds(
      organizationId,
      target.id,
    );

    const matchingPackages = await this.findMatchingPackages({
      organizationId,
      packageSlugs,
    });

    let renderModes: RenderMode[];
    if (command.agents && command.agents.length > 0) {
      renderModes =
        this.renderModeConfigurationService.mapCodingAgentsToRenderModes(
          command.agents,
        );
    } else {
      renderModes =
        await this.renderModeConfigurationService.getActiveRenderModes(
          organizationId,
        );
    }

    const distributionId = createDistributionId(uuidv4());
    const distributedPackages = await this.buildDistributedPackages({
      distributionId,
      packages: matchingPackages,
      previouslyActivePackageIds,
    });

    await this.saveDistribution({
      distributionId,
      distributedPackages,
      target,
      organizationId,
      authorId: command.user.id,
      renderModes,
    });

    this.logger.info('Distribution notification completed successfully', {
      distributionId,
      distributedPackageCount: distributedPackages.length,
    });

    return { deploymentId: distributionId };
  }

  private async findMatchingPackages(params: {
    organizationId: OrganizationId;
    packageSlugs: string[];
  }): Promise<Package[]> {
    const { organizationId, packageSlugs } = params;

    const orgPackages =
      await this.packageRepository.findByOrganizationId(organizationId);

    const matchingPackages = orgPackages.filter((pkg) =>
      packageSlugs.includes(pkg.slug),
    );

    this.logger.info('Found matching packages', {
      requestedSlugs: packageSlugs,
      matchedCount: matchingPackages.length,
    });

    return matchingPackages;
  }

  private async getPreviouslyActivePackageIds(
    organizationId: OrganizationId,
    targetId: TargetId,
  ): Promise<PackageId[]> {
    const activePackageIds =
      await this.distributionRepository.findActivePackageIdsByTarget(
        organizationId,
        targetId,
      );

    this.logger.info('Found previously active packages for target', {
      organizationId,
      targetId,
      activePackageCount: activePackageIds.length,
    });

    return activePackageIds;
  }

  private async buildDistributedPackages(params: {
    distributionId: string;
    packages: Package[];
    previouslyActivePackageIds: PackageId[];
  }): Promise<DistributedPackageWithVersionIds[]> {
    const { distributionId, packages, previouslyActivePackageIds } = params;
    const distributedPackages: DistributedPackageWithVersionIds[] = [];
    const currentPackageIds = new Set(packages.map((p) => p.id));

    // Create 'add' entries for current packages
    for (const pkg of packages) {
      const standardVersionIds = await this.getLatestStandardVersionIds(
        pkg.standards,
      );
      const recipeVersionIds = await this.getLatestRecipeVersionIds(
        pkg.recipes,
      );
      const skillVersionIds = await this.getLatestSkillVersionIds(pkg.skills);

      distributedPackages.push({
        id: createDistributedPackageId(uuidv4()),
        distributionId: createDistributionId(distributionId),
        packageId: pkg.id,
        standardVersions: [],
        recipeVersions: [],
        skillVersions: [],
        operation: 'add',
        _standardVersionIds: standardVersionIds,
        _recipeVersionIds: recipeVersionIds,
        _skillVersionIds: skillVersionIds,
      });
    }

    // Create 'remove' entries for packages that were previously active but are not in current distribution
    for (const prevPackageId of previouslyActivePackageIds) {
      if (!currentPackageIds.has(prevPackageId)) {
        this.logger.info('Package removed from distribution', {
          packageId: prevPackageId,
        });

        distributedPackages.push({
          id: createDistributedPackageId(uuidv4()),
          distributionId: createDistributionId(distributionId),
          packageId: prevPackageId,
          standardVersions: [],
          recipeVersions: [],
          skillVersions: [],
          operation: 'remove',
          _standardVersionIds: [],
          _recipeVersionIds: [],
          _skillVersionIds: [],
        });
      }
    }

    return distributedPackages;
  }

  private async getLatestStandardVersionIds(
    standardIds: StandardId[],
  ): Promise<StandardVersionId[]> {
    const versionIds: StandardVersionId[] = [];

    for (const standardId of standardIds) {
      const latestVersion =
        await this.standardsPort.getLatestStandardVersion(standardId);
      if (latestVersion) {
        versionIds.push(latestVersion.id);
      }
    }

    return versionIds;
  }

  private async getLatestRecipeVersionIds(
    recipeIds: RecipeId[],
  ): Promise<RecipeVersionId[]> {
    const versionIds: RecipeVersionId[] = [];

    for (const recipeId of recipeIds) {
      const versions = await this.recipesPort.listRecipeVersions(recipeId);
      const latestVersion = versions.reduce<RecipeVersion | undefined>(
        (latest, current) =>
          current.version > (latest?.version ?? 0) ? current : latest,
        undefined,
      );
      if (latestVersion) {
        versionIds.push(latestVersion.id);
      }
    }

    return versionIds;
  }

  private async getLatestSkillVersionIds(
    skillIds: SkillId[],
  ): Promise<SkillVersionId[]> {
    const versionIds: SkillVersionId[] = [];

    for (const skillId of skillIds) {
      const latestVersion =
        await this.skillsPort.getLatestSkillVersion(skillId);
      if (latestVersion) {
        versionIds.push(latestVersion.id);
      }
    }

    return versionIds;
  }

  private async saveDistribution(params: {
    distributionId: string;
    distributedPackages: DistributedPackageWithVersionIds[];
    target: Target;
    organizationId: OrganizationId;
    authorId: UserId;
    renderModes: RenderMode[];
  }): Promise<void> {
    const {
      distributionId,
      distributedPackages,
      target,
      organizationId,
      authorId,
      renderModes,
    } = params;

    const distribution: Distribution = {
      id: createDistributionId(distributionId),
      distributedPackages,
      createdAt: new Date().toISOString(),
      authorId,
      organizationId,
      target,
      status: DistributionStatus.success,
      renderModes,
      source: 'cli',
    };

    await this.distributionRepository.add(distribution);
    this.logger.info('Created distribution', { distributionId });

    await this.saveDistributedPackages(distributedPackages);
  }

  private async saveDistributedPackages(
    distributedPackages: DistributedPackageWithVersionIds[],
  ): Promise<void> {
    for (const distributedPackage of distributedPackages) {
      await this.distributedPackageRepository.add(distributedPackage);

      if (distributedPackage._standardVersionIds.length > 0) {
        await this.distributedPackageRepository.addStandardVersions(
          distributedPackage.id,
          distributedPackage._standardVersionIds,
        );
      }

      if (distributedPackage._recipeVersionIds.length > 0) {
        await this.distributedPackageRepository.addRecipeVersions(
          distributedPackage.id,
          distributedPackage._recipeVersionIds,
        );
      }

      if (distributedPackage._skillVersionIds.length > 0) {
        await this.distributedPackageRepository.addSkillVersions(
          distributedPackage.id,
          distributedPackage._skillVersionIds,
        );
      }
    }
  }
}
