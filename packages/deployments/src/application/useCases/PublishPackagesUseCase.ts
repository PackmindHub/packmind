import {
  IPublishPackages,
  PublishPackagesCommand,
  Target,
  PackagesDeployment,
  createPackagesDeploymentId,
  ICodingAgentPort,
  PrepareRecipesDeploymentCommand,
  PrepareStandardsDeploymentCommand,
  IGitPort,
  OrganizationId,
  DistributionStatus,
  UserId,
  Package,
  RecipeVersion,
  StandardVersion,
  IRecipesPort,
  IStandardsPort,
  RecipeId,
  StandardId,
  RenderMode,
} from '@packmind/types';
import { IPackagesDeploymentRepository } from '../../domain/repositories/IPackagesDeploymentRepository';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { PackmindLogger } from '@packmind/logger';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { PackageService } from '../services/PackageService';
import { v4 as uuidv4 } from 'uuid';

const origin = 'PublishPackagesUseCase';

export class PublishPackagesUseCase implements IPublishPackages {
  constructor(
    private readonly packagesDeploymentRepository: IPackagesDeploymentRepository,
    private readonly recipesDeploymentRepository: IRecipesDeploymentRepository,
    private readonly standardsDeploymentRepository: IStandardsDeploymentRepository,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly gitPort: IGitPort,
    private readonly codingAgentPort: ICodingAgentPort,
    public readonly targetService: TargetService,
    public readonly renderModeConfigurationService: RenderModeConfigurationService,
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

    // Fetch organization's active render modes for deployment tracking
    const activeRenderModes =
      await this.renderModeConfigurationService.getActiveRenderModes(
        command.organizationId as OrganizationId,
      );

    const codingAgents =
      this.renderModeConfigurationService.mapRenderModesToCodingAgents(
        activeRenderModes,
      );

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

    this.logger.info('Extracted artefacts from packages', {
      packagesCount: packages.length,
      uniqueRecipesCount: uniqueRecipeIds.size,
      uniqueStandardsCount: uniqueStandardIds.size,
    });

    // Resolve recipe IDs to latest versions
    const recipeVersions: RecipeVersion[] = [];
    for (const recipeId of Array.from(uniqueRecipeIds)) {
      const versions = await this.recipesPort.listRecipeVersions(
        recipeId as RecipeId,
      );
      if (versions.length > 0) {
        // Sort by version number descending and take the latest
        const latestVersion = versions.sort((a, b) => b.version - a.version)[0];
        recipeVersions.push(latestVersion);
        this.logger.info('Resolved latest recipe version', {
          recipeId,
          version: latestVersion.version,
          name: latestVersion.name,
        });
      } else {
        this.logger.warn('No versions found for recipe', { recipeId });
      }
    }

    // Resolve standard IDs to latest versions
    const standardVersions: StandardVersion[] = [];
    for (const standardId of Array.from(uniqueStandardIds)) {
      const latestVersion = await this.standardsPort.getLatestStandardVersion(
        standardId as StandardId,
      );
      if (latestVersion) {
        standardVersions.push(latestVersion);
        this.logger.info('Resolved latest standard version', {
          standardId,
          version: latestVersion.version,
          name: latestVersion.name,
        });
      } else {
        this.logger.warn('No latest version found for standard', {
          standardId,
        });
      }
    }

    // Sort versions alphabetically for deterministic ordering
    recipeVersions.sort((a, b) => a.name.localeCompare(b.name));
    standardVersions.sort((a, b) => a.name.localeCompare(b.name));

    this.logger.info('Resolved package contents to latest versions', {
      recipeVersionsCount: recipeVersions.length,
      standardVersionsCount: standardVersions.length,
    });

    // Group targets by repository
    const repositoryTargetsMap = new Map();
    for (const targetId of command.targetIds) {
      const target = await this.targetService.findById(targetId);
      if (!target) {
        throw new Error(`Target with id ${targetId} not found`);
      }

      const repository = await this.gitPort.getRepositoryById(target.gitRepoId);
      if (!repository) {
        throw new Error(`Repository with id ${target.gitRepoId} not found`);
      }

      if (!repositoryTargetsMap.has(repository.id)) {
        repositoryTargetsMap.set(repository.id, {
          repository,
          targets: [],
        });
      }

      repositoryTargetsMap.get(repository.id).targets.push(target);

      this.logger.info('Target mapped to repository', {
        targetId,
        repositoryId: repository.id,
        owner: repository.owner,
        repo: repository.repo,
        targetName: target.name,
      });
    }

    const deployments: PackagesDeployment[] = [];

    // Process each repository (with all its targets)
    for (const [
      repositoryId,
      { repository: gitRepo, targets },
    ] of repositoryTargetsMap) {
      try {
        this.logger.info('Processing repository with targets', {
          repositoryId,
          gitRepoOwner: gitRepo.owner,
          gitRepoName: gitRepo.repo,
          targetsCount: targets.length,
          targetIds: targets.map((t: Target) => t.id),
        });

        // Combine with previously deployed standards and recipes
        const allStandardVersions =
          await this.combineWithPreviousStandardVersions(
            command.organizationId as OrganizationId,
            targets,
            standardVersions,
          );
        const allRecipeVersions = await this.combineWithPreviousRecipeVersions(
          command.organizationId as OrganizationId,
          targets,
          recipeVersions,
        );

        this.logger.info('Combined with previous versions', {
          totalStandardVersions: allStandardVersions.length,
          newStandardVersions: standardVersions.length,
          totalRecipeVersions: allRecipeVersions.length,
          newRecipeVersions: recipeVersions.length,
        });

        // Prepare standards deployment
        const standardsFileUpdates =
          standardVersions.length > 0
            ? await this.codingAgentPort.prepareStandardsDeployment({
                userId: command.userId,
                organizationId: command.organizationId,
                standardVersions: allStandardVersions,
                gitRepo,
                targets,
                codingAgents,
              } as PrepareStandardsDeploymentCommand)
            : { createOrUpdate: [], delete: [] };

        // Prepare recipes deployment
        const recipesFileUpdates =
          recipeVersions.length > 0
            ? await this.codingAgentPort.prepareRecipesDeployment({
                userId: command.userId,
                organizationId: command.organizationId,
                recipeVersions: allRecipeVersions,
                gitRepo,
                targets,
                codingAgents,
              } as PrepareRecipesDeploymentCommand)
            : { createOrUpdate: [], delete: [] };

        // Combine file updates (standards first, then recipes)
        const allFileUpdates = [
          ...standardsFileUpdates.createOrUpdate,
          ...recipesFileUpdates.createOrUpdate,
        ];

        this.logger.info('Prepared file updates', {
          standardsFilesCount: standardsFileUpdates.createOrUpdate.length,
          recipesFilesCount: recipesFileUpdates.createOrUpdate.length,
          totalFilesCount: allFileUpdates.length,
        });

        // Commit the changes to the git repository (once per repository)
        const commitMessage = `[PACKMIND] Update packages files

- Updated ${packages.length} package(s)
- Standards: ${standardVersions.length} (total: ${allStandardVersions.length})
- Recipes: ${recipeVersions.length} (total: ${allRecipeVersions.length})
- Targets: ${targets.map((t: Target) => t.name).join(', ')}

Packages updated:
${packages.map((p) => `- ${p.name} (${p.slug})`).join('\n')}`;

        let gitCommit;
        let deploymentStatus = DistributionStatus.success;
        try {
          gitCommit = await this.gitPort.commitToGit(
            gitRepo,
            allFileUpdates,
            commitMessage,
          );
          this.logger.info('Committed changes', {
            commitId: gitCommit.id,
            commitSha: gitCommit.sha,
            targetsCount: targets.length,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'NO_CHANGES_DETECTED'
          ) {
            this.logger.info(
              'No changes detected, creating no_changes deployment entries',
              {
                repositoryId,
                gitRepoId: gitRepo.id,
                packagesCount: packages.length,
                targetsCount: targets.length,
              },
            );
            deploymentStatus = DistributionStatus.no_changes;
            gitCommit = undefined;
          } else {
            throw error;
          }
        }

        // Create individual deployment entry for each target
        for (const target of targets) {
          const deployment: PackagesDeployment = {
            id: createPackagesDeploymentId(uuidv4()),
            packages: packages,
            createdAt: new Date().toISOString(),
            authorId: command.userId as UserId,
            organizationId: command.organizationId as OrganizationId,
            gitCommit: gitCommit,
            target: target,
            status: deploymentStatus,
            renderModes: activeRenderModes,
          };

          await this.packagesDeploymentRepository.add(deployment);

          this.logger.info('Created deployment for target', {
            deploymentId: deployment.id,
            targetId: target.id,
            targetName: target.name,
            packagesCount: deployment.packages.length,
            status: deploymentStatus,
            commitSha: gitCommit?.sha,
          });

          deployments.push(deployment);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to publish packages to repository', {
          repositoryId,
          gitRepoId: gitRepo.id,
          error: errorMessage,
          targetsCount: targets.length,
        });

        // Create failure deployment for each target in this repository
        for (const target of targets) {
          await this.savePackageDeploymentInFailure(
            command,
            target,
            deployments,
            packages,
            errorMessage,
            activeRenderModes,
          );
        }
      }
    }

    this.logger.info('Successfully published packages', {
      deploymentsCount: deployments.length,
      repositoriesProcessed: repositoryTargetsMap.size,
      successfulDeployments: deployments.filter(
        (d) => d.status === DistributionStatus.success,
      ).length,
      failedDeployments: deployments.filter(
        (d) => d.status === DistributionStatus.failure,
      ).length,
      noChangesDeployments: deployments.filter(
        (d) => d.status === DistributionStatus.no_changes,
      ).length,
    });

    return deployments;
  }

  private async combineWithPreviousStandardVersions(
    organizationId: OrganizationId,
    targets: Target[],
    newStandardVersions: StandardVersion[],
  ): Promise<StandardVersion[]> {
    const allPreviousStandardVersions = new Map<string, StandardVersion>();

    // Get all unique previously deployed standard versions across all targets
    for (const target of targets) {
      const previousStandardVersions =
        await this.standardsDeploymentRepository.findActiveStandardVersionsByTarget(
          organizationId,
          target.id,
        );

      // Merge into the overall map, keeping the latest version of each standard
      for (const standardVersion of previousStandardVersions) {
        const existing = allPreviousStandardVersions.get(
          standardVersion.standardId,
        );
        if (!existing || standardVersion.version > existing.version) {
          allPreviousStandardVersions.set(
            standardVersion.standardId,
            standardVersion,
          );
        }
      }
    }

    const previousStandardVersionsArray = Array.from(
      allPreviousStandardVersions.values(),
    );

    this.logger.info('Found previous standard versions across all targets', {
      count: previousStandardVersionsArray.length,
    });

    // Combine previous and new standard versions
    const standardVersionsMap = new Map<string, StandardVersion>();

    // Add previous versions first
    previousStandardVersionsArray.forEach((sv) => {
      standardVersionsMap.set(sv.standardId, sv);
    });

    // Override with new versions (these are newer)
    newStandardVersions.forEach((sv) => {
      standardVersionsMap.set(sv.standardId, sv);
    });

    return Array.from(standardVersionsMap.values());
  }

  private async combineWithPreviousRecipeVersions(
    organizationId: OrganizationId,
    targets: Target[],
    newRecipeVersions: RecipeVersion[],
  ): Promise<RecipeVersion[]> {
    const allPreviousRecipeVersions = new Map<string, RecipeVersion>();

    // Get all unique previously deployed recipe versions across all targets
    for (const target of targets) {
      const previousRecipeVersions =
        await this.recipesDeploymentRepository.findActiveRecipeVersionsByTarget(
          organizationId,
          target.id,
        );

      // Merge into the overall map, keeping the latest version of each recipe
      for (const recipeVersion of previousRecipeVersions) {
        const existing = allPreviousRecipeVersions.get(recipeVersion.recipeId);
        if (!existing || recipeVersion.version > existing.version) {
          allPreviousRecipeVersions.set(recipeVersion.recipeId, recipeVersion);
        }
      }
    }

    const previousRecipeVersionsArray = Array.from(
      allPreviousRecipeVersions.values(),
    );

    this.logger.info('Found previous recipe versions across all targets', {
      count: previousRecipeVersionsArray.length,
    });

    // Combine previous and new recipe versions
    const recipeVersionsMap = new Map<string, RecipeVersion>();

    // Add previous versions first
    previousRecipeVersionsArray.forEach((rv) => {
      recipeVersionsMap.set(rv.recipeId, rv);
    });

    // Override with new versions (these are newer)
    newRecipeVersions.forEach((rv) => {
      recipeVersionsMap.set(rv.recipeId, rv);
    });

    return Array.from(recipeVersionsMap.values());
  }

  private async savePackageDeploymentInFailure(
    command: PublishPackagesCommand,
    target: Target,
    deployments: PackagesDeployment[],
    packages: Package[],
    error: string,
    activeRenderModes: RenderMode[],
  ) {
    try {
      const failureDeployment: PackagesDeployment = {
        id: createPackagesDeploymentId(uuidv4()),
        packages: packages,
        createdAt: new Date().toISOString(),
        authorId: command.userId as UserId,
        organizationId: command.organizationId as OrganizationId,
        gitCommit: undefined,
        target,
        status: DistributionStatus.failure,
        error,
        renderModes: activeRenderModes,
      };

      await this.packagesDeploymentRepository.add(failureDeployment);
      deployments.push(failureDeployment);

      this.logger.info('Created failure deployment record', {
        deploymentId: failureDeployment.id,
        targetId: target.id,
        status: DistributionStatus.failure,
        error: error,
      });
    } catch (saveError) {
      this.logger.error('Failed to save failure deployment record', {
        targetId: target.id,
        saveError:
          saveError instanceof Error ? saveError.message : String(saveError),
      });
    }
  }
}
