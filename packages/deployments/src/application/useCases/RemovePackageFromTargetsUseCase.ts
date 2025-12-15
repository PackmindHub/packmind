import { PackmindLogger } from '@packmind/logger';
import {
  IRemovePackageFromTargetsUseCase,
  RemovePackageFromTargetsCommand,
  RemovePackageFromTargetsResponse,
  RemovePackageFromTargetsResult,
  TargetArtifactResolution,
  OrganizationId,
  UserId,
  TargetId,
  RecipeVersionId,
  StandardVersionId,
  Package,
  Target,
  GitRepo,
  RecipeVersion,
  StandardVersion,
  Distribution,
  DistributionStatus,
  GitCommit,
  createDistributionId,
  IRecipesPort,
  IStandardsPort,
  IGitPort,
  ICodingAgentPort,
  PackmindFileConfig,
  FileUpdates,
  CodingAgent,
  RenderMode,
} from '@packmind/types';
import { PackageService } from '../services/PackageService';
import { TargetService } from '../services/TargetService';
import { PackageNotFoundError } from '../../domain/errors/PackageNotFoundError';
import { TargetNotFoundError } from '../../domain/errors/TargetNotFoundError';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { PackmindConfigService } from '../services/PackmindConfigService';
import {
  fetchExistingFilesFromGit,
  applyTargetPrefixingToFileUpdates,
} from '../utils/GitFileUtils';
import { v4 as uuidv4 } from 'uuid';

const origin = 'RemovePackageFromTargetsUseCase';

export class RemovePackageFromTargetsUseCase
  implements IRemovePackageFromTargetsUseCase
{
  constructor(
    private readonly packageService: PackageService,
    private readonly targetService: TargetService,
    private readonly distributionRepository: IDistributionRepository,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly gitPort: IGitPort,
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly packmindConfigService: PackmindConfigService = new PackmindConfigService(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: RemovePackageFromTargetsCommand,
  ): Promise<RemovePackageFromTargetsResponse> {
    this.logger.info('Removing package from targets', {
      packageId: command.packageId,
      targetIdsCount: command.targetIds.length,
      organizationId: command.organizationId,
    });

    const pkg = await this.packageService.findById(command.packageId);
    if (!pkg) {
      throw new PackageNotFoundError(command.packageId);
    }

    for (const targetId of command.targetIds) {
      const target = await this.targetService.findById(targetId);
      if (!target) {
        throw new TargetNotFoundError(targetId);
      }
    }

    // Resolve artifacts for each target
    const artifactResolutions = await this.resolveArtifactsForTargets(
      command.organizationId as OrganizationId,
      command.targetIds,
      pkg,
    );

    // Get active render modes and coding agents
    const activeRenderModes =
      await this.renderModeConfigurationService.getActiveRenderModes(
        command.organizationId as OrganizationId,
      );
    const codingAgents =
      this.renderModeConfigurationService.mapRenderModesToCodingAgents(
        activeRenderModes,
      );

    // Group targets by repository
    const repositoryTargetsMap = await this.groupTargetsByRepository(
      command.targetIds,
    );

    const results: RemovePackageFromTargetsResult[] = [];

    // Process each repository
    for (const [
      repositoryId,
      { repository: gitRepo, targets },
    ] of repositoryTargetsMap) {
      try {
        this.logger.info('Processing repository for package removal', {
          repositoryId,
          gitRepoOwner: gitRepo.owner,
          gitRepoName: gitRepo.repo,
          targetsCount: targets.length,
          packageSlug: pkg.slug,
        });

        // Prepare removal deployment for all targets
        const fileUpdatesPerTarget = await this.prepareRemovalDeployment(
          command.userId as UserId,
          command.organizationId as OrganizationId,
          artifactResolutions,
          targets,
          gitRepo,
          codingAgents,
          pkg.slug,
        );

        // Build commit message
        const commitMessage = this.buildRemovalCommitMessage(pkg.slug, targets);

        let gitCommit: GitCommit | undefined;
        let distributionStatus = DistributionStatus.success;

        try {
          // Get file updates from first target
          const firstTargetUpdates = fileUpdatesPerTarget.values().next().value;
          if (!firstTargetUpdates) {
            throw new Error('No file updates found for any target');
          }

          gitCommit = await this.gitPort.commitToGit(
            gitRepo,
            firstTargetUpdates.createOrUpdate,
            commitMessage,
          );

          this.logger.info('Committed package removal', {
            commitId: gitCommit.id,
            commitSha: gitCommit.sha,
            packageSlug: pkg.slug,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'NO_CHANGES_DETECTED'
          ) {
            this.logger.info('No changes detected for package removal', {
              repositoryId,
              packageSlug: pkg.slug,
            });
            distributionStatus = DistributionStatus.no_changes;
            gitCommit = undefined;
          } else {
            throw error;
          }
        }

        // Create distribution records and results for each target
        for (const target of targets) {
          await this.createDistribution(
            command,
            target,
            activeRenderModes,
            distributionStatus,
            gitCommit,
          );

          results.push({
            targetId: target.id,
            success: true,
          });

          this.logger.info('Created distribution record for target', {
            targetId: target.id,
            packageSlug: pkg.slug,
            status: distributionStatus,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to remove package from repository', {
          repositoryId,
          packageSlug: pkg.slug,
          error: errorMessage,
        });

        // Create failure results for all targets in this repository
        for (const target of targets) {
          await this.createDistribution(
            command,
            target,
            activeRenderModes,
            DistributionStatus.failure,
            undefined,
            errorMessage,
          );

          results.push({
            targetId: target.id,
            success: false,
            error: errorMessage,
          });
        }
      }
    }

    this.logger.info('Successfully processed package removal', {
      packageSlug: pkg.slug,
      resultsCount: results.length,
      repositoriesProcessed: repositoryTargetsMap.size,
    });

    return {
      results,
      artifactResolutions,
    };
  }

  /**
   * Resolves which artifacts are exclusive to the removed package vs shared with other packages
   * for each target.
   */
  async resolveArtifactsForTargets(
    organizationId: OrganizationId,
    targetIds: TargetId[],
    packageToRemove: Package,
  ): Promise<TargetArtifactResolution[]> {
    const resolutions: TargetArtifactResolution[] = [];

    for (const targetId of targetIds) {
      const resolution = await this.resolveArtifactsForTarget(
        organizationId,
        targetId,
        packageToRemove,
      );
      resolutions.push(resolution);
    }

    return resolutions;
  }

  /**
   * Prepares the removal deployment by rendering artifacts for all targets.
   * Uses remaining artifacts as "installed" and exclusive artifacts as "removed".
   */
  private async prepareRemovalDeployment(
    userId: UserId,
    organizationId: OrganizationId,
    artifactResolutions: TargetArtifactResolution[],
    targets: Target[],
    gitRepo: GitRepo,
    codingAgents: CodingAgent[],
    packageSlugToRemove: string,
  ): Promise<Map<string, FileUpdates>> {
    const fileUpdatesPerTarget = new Map<string, FileUpdates>();

    for (const target of targets) {
      const resolution = artifactResolutions.find(
        (r) => r.targetId === target.id,
      );
      if (!resolution) {
        throw new Error(`No artifact resolution found for target ${target.id}`);
      }

      // Fetch existing files from git
      const existingFiles = await fetchExistingFilesFromGit(
        this.gitPort,
        gitRepo,
        target,
        codingAgents,
        this.logger,
      );

      // Fetch recipe and standard versions for installed (remaining) artifacts
      const installedRecipeVersions = await this.fetchRecipeVersionsByIds(
        resolution.remainingArtifacts.recipeVersionIds,
      );
      const installedStandardVersions = await this.fetchStandardVersionsByIds(
        resolution.remainingArtifacts.standardVersionIds,
      );

      // Fetch recipe and standard versions for removed (exclusive) artifacts
      const removedRecipeVersions = await this.fetchRecipeVersionsByIds(
        resolution.exclusiveArtifacts.recipeVersionIds,
      );
      const removedStandardVersions = await this.fetchStandardVersionsByIds(
        resolution.exclusiveArtifacts.standardVersionIds,
      );

      // Call renderArtifacts with remaining as installed and exclusive as removed
      const baseFileUpdates = await this.codingAgentPort.renderArtifacts({
        userId,
        organizationId,
        installed: {
          recipeVersions: installedRecipeVersions,
          standardVersions: installedStandardVersions,
        },
        removed: {
          recipeVersions: removedRecipeVersions,
          standardVersions: removedStandardVersions,
        },
        codingAgents,
        existingFiles,
      });

      // Fetch existing packmind.json and remove the package
      const existingPackmindJson = await this.fetchExistingPackmindJson(
        gitRepo,
        target,
      );
      const existingPackages = existingPackmindJson?.packages ?? {};

      // Create config file with package removed
      const configFile =
        this.packmindConfigService.createRemovalConfigFileModification(
          packageSlugToRemove,
          existingPackages,
        );
      baseFileUpdates.createOrUpdate.push(configFile);

      // Apply target path prefixing
      const prefixedFileUpdates = applyTargetPrefixingToFileUpdates(
        baseFileUpdates,
        target,
        this.logger,
      );

      fileUpdatesPerTarget.set(target.id, prefixedFileUpdates);

      this.logger.debug('Prepared removal deployment for target', {
        targetId: target.id,
        filesCount: prefixedFileUpdates.createOrUpdate.length,
        removedRecipes: removedRecipeVersions.length,
        removedStandards: removedStandardVersions.length,
      });
    }

    return fileUpdatesPerTarget;
  }

  /**
   * Fetches and parses the existing packmind.json from the git repository
   */
  private async fetchExistingPackmindJson(
    gitRepo: GitRepo,
    target: Target,
  ): Promise<PackmindFileConfig | null> {
    const targetPath = target.path && target.path !== '/' ? target.path : '';
    const packmindJsonPath = targetPath
      ? `${targetPath}/packmind.json`
      : 'packmind.json';

    try {
      const fileData = await this.gitPort.getFileFromRepo(
        gitRepo,
        packmindJsonPath,
      );
      if (!fileData) {
        return null;
      }
      return JSON.parse(fileData.content) as PackmindFileConfig;
    } catch {
      return null;
    }
  }

  /**
   * Groups targets by their repository for batch processing
   */
  private async groupTargetsByRepository(
    targetIds: TargetId[],
  ): Promise<Map<string, { repository: GitRepo; targets: Target[] }>> {
    const map = new Map<string, { repository: GitRepo; targets: Target[] }>();

    for (const targetId of targetIds) {
      const target = await this.targetService.findById(targetId);
      if (!target) {
        throw new Error(`Target with id ${targetId} not found`);
      }

      const repository = await this.gitPort.getRepositoryById(target.gitRepoId);
      if (!repository) {
        throw new Error(`Repository with id ${target.gitRepoId} not found`);
      }

      if (!map.has(repository.id)) {
        map.set(repository.id, { repository, targets: [] });
      }
      const entry = map.get(repository.id);
      if (entry) {
        entry.targets.push(target);
      }
    }

    return map;
  }

  /**
   * Fetches recipe versions by their IDs
   */
  private async fetchRecipeVersionsByIds(
    recipeVersionIds: RecipeVersionId[],
  ): Promise<RecipeVersion[]> {
    const versions: RecipeVersion[] = [];
    for (const id of recipeVersionIds) {
      const version = await this.recipesPort.getRecipeVersionById(id);
      if (version) {
        versions.push(version);
      }
    }
    return versions.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Fetches standard versions by their IDs, including rules
   */
  private async fetchStandardVersionsByIds(
    standardVersionIds: StandardVersionId[],
  ): Promise<StandardVersion[]> {
    const versions: StandardVersion[] = [];
    for (const id of standardVersionIds) {
      const version = await this.standardsPort.getStandardVersionById(id);
      if (version) {
        // Load rules if not populated
        if (version.rules === undefined || version.rules === null) {
          const rules = await this.standardsPort.getRulesByStandardId(
            version.standardId,
          );
          versions.push({ ...version, rules });
        } else {
          versions.push(version);
        }
      }
    }
    return versions.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Builds the commit message for package removal
   */
  private buildRemovalCommitMessage(
    packageSlug: string,
    targets: Target[],
  ): string {
    const parts: string[] = [
      `[PACKMIND] Remove package: ${packageSlug}`,
      '',
      `- Targets: ${targets.map((t) => t.name).join(', ')}`,
    ];
    return parts.join('\n');
  }

  /**
   * Creates a distribution record for the removal operation
   */
  private async createDistribution(
    command: RemovePackageFromTargetsCommand,
    target: Target,
    activeRenderModes: RenderMode[],
    status: DistributionStatus,
    gitCommit?: GitCommit,
    error?: string,
  ): Promise<Distribution> {
    const distributionId = createDistributionId(uuidv4());

    const distribution: Distribution = {
      id: distributionId,
      distributedPackages: [],
      createdAt: new Date().toISOString(),
      authorId: command.userId as UserId,
      organizationId: command.organizationId as OrganizationId,
      gitCommit,
      target,
      status,
      error,
      renderModes: activeRenderModes,
      source: 'app',
    };

    await this.distributionRepository.add(distribution);

    return distribution;
  }

  /**
   * Resolves artifacts for a single target.
   * 1. Gets all distributions for this target
   * 2. Identifies artifacts from the package being removed
   * 3. Identifies artifacts from remaining packages
   * 4. Computes exclusive artifacts (only in removed package)
   */
  private async resolveArtifactsForTarget(
    organizationId: OrganizationId,
    targetId: TargetId,
    packageToRemove: Package,
  ): Promise<TargetArtifactResolution> {
    const distributions = await this.distributionRepository.listByTargetIds(
      organizationId,
      [targetId],
    );

    const removedPackageRecipeVersionIds = new Set<RecipeVersionId>();
    const removedPackageStandardVersionIds = new Set<StandardVersionId>();
    const remainingPackageRecipeVersionIds = new Set<RecipeVersionId>();
    const remainingPackageStandardVersionIds = new Set<StandardVersionId>();

    for (const distribution of distributions) {
      for (const distributedPackage of distribution.distributedPackages) {
        const isRemovedPackage =
          distributedPackage.packageId === packageToRemove.id;

        for (const recipeVersion of distributedPackage.recipeVersions) {
          if (isRemovedPackage) {
            removedPackageRecipeVersionIds.add(recipeVersion.id);
          } else {
            remainingPackageRecipeVersionIds.add(recipeVersion.id);
          }
        }

        for (const standardVersion of distributedPackage.standardVersions) {
          if (isRemovedPackage) {
            removedPackageStandardVersionIds.add(standardVersion.id);
          } else {
            remainingPackageStandardVersionIds.add(standardVersion.id);
          }
        }
      }
    }

    const exclusiveRecipeVersionIds = Array.from(
      removedPackageRecipeVersionIds,
    ).filter((id) => !remainingPackageRecipeVersionIds.has(id));

    const exclusiveStandardVersionIds = Array.from(
      removedPackageStandardVersionIds,
    ).filter((id) => !remainingPackageStandardVersionIds.has(id));

    return {
      targetId,
      exclusiveArtifacts: {
        recipeVersionIds: exclusiveRecipeVersionIds,
        standardVersionIds: exclusiveStandardVersionIds,
      },
      remainingArtifacts: {
        recipeVersionIds: Array.from(remainingPackageRecipeVersionIds),
        standardVersionIds: Array.from(remainingPackageStandardVersionIds),
      },
    };
  }
}
