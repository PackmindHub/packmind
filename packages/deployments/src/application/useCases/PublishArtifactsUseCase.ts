import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  IPublishArtifactsUseCase,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  Distribution,
  createDistributionId,
  IRecipesPort,
  IStandardsPort,
  ICodingAgentPort,
  IGitPort,
  OrganizationId,
  UserId,
  DistributionStatus,
  GitCommit,
  GitRepo,
  Target,
  TargetId,
  RecipeVersion,
  StandardVersion,
  StandardVersionId,
  RenderMode,
  FileUpdates,
  CodingAgent,
  DeploymentCompletedEvent,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import {
  fetchExistingFilesFromGit,
  applyTargetPrefixingToFileUpdates,
} from '../utils/GitFileUtils';
import { v4 as uuidv4 } from 'uuid';

const origin = 'PublishArtifactsUseCase';

/**
 * Unified usecase for publishing both recipes and standards together
 * Uses the unified renderArtifacts method for atomic updates
 */
export class PublishArtifactsUseCase implements IPublishArtifactsUseCase {
  constructor(
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly gitPort: IGitPort,
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly distributionRepository: IDistributionRepository,
    private readonly targetService: TargetService,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PublishArtifactsCommand,
  ): Promise<PublishArtifactsResponse> {
    this.logger.info('Publishing artifacts (unified recipes + standards)', {
      recipeVersionIdsCount: command.recipeVersionIds.length,
      standardVersionIdsCount: command.standardVersionIds.length,
      targetIdsCount: command.targetIds.length,
      organizationId: command.organizationId,
    });

    if (command.targetIds.length === 0) {
      throw new Error('At least one target must be provided');
    }

    // Fetch organization's active render modes
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

    // Fetch recipe and standard versions
    const recipeVersions = await this.fetchRecipeVersions(
      command.recipeVersionIds,
    );
    const standardVersions = await this.fetchStandardVersions(
      command.standardVersionIds,
    );

    const distributions: Distribution[] = [];

    // Process each repository with all its targets
    for (const [
      repositoryId,
      { repository: gitRepo, targets },
    ] of repositoryTargetsMap) {
      try {
        this.logger.info('Processing repository with unified artifacts', {
          repositoryId,
          gitRepoOwner: gitRepo.owner,
          gitRepoName: gitRepo.repo,
          targetsCount: targets.length,
          recipesCount: recipeVersions.length,
          standardsCount: standardVersions.length,
        });

        // Get previous deployments for all targets in this repo
        const allRecipeVersions = await this.collectAllRecipeVersions(
          command,
          targets,
          recipeVersions,
        );
        const allStandardVersions = await this.collectAllStandardVersions(
          command,
          targets,
          standardVersions,
        );

        // Load rules for all standard versions that don't have them populated
        // This is critical for previously deployed standards which come from the database
        // without their rules relation loaded
        const standardVersionsWithRules = await Promise.all(
          allStandardVersions.map(async (sv) => {
            if (sv.rules === undefined || sv.rules === null) {
              this.logger.debug('Loading rules for standard version', {
                standardVersionId: sv.id,
                standardId: sv.standardId,
                slug: sv.slug,
              });
              const rules = await this.standardsPort.getRulesByStandardId(
                sv.standardId,
              );
              return { ...sv, rules };
            }
            return sv;
          }),
        );

        this.logger.info('Combined artifact versions', {
          totalRecipes: allRecipeVersions.length,
          totalStandards: standardVersionsWithRules.length,
          newRecipes: recipeVersions.length,
          newStandards: standardVersions.length,
        });

        // Prepare unified deployment using renderArtifacts for ALL targets
        const fileUpdatesPerTarget = await this.prepareUnifiedDeployment(
          command.userId as UserId,
          command.organizationId as OrganizationId,
          allRecipeVersions,
          standardVersionsWithRules,
          gitRepo,
          targets,
          codingAgents,
        );

        // Commit changes (once per repository)
        const commitMessage = this.buildCommitMessage(
          recipeVersions,
          standardVersions,
          allRecipeVersions,
          standardVersionsWithRules,
          targets,
        );

        let gitCommit;
        let distributionStatus = DistributionStatus.success;

        try {
          // Use file updates from first target (they're all the same for multi-target repos)
          const firstTargetUpdates = fileUpdatesPerTarget.values().next().value;
          if (!firstTargetUpdates) {
            throw new Error('No file updates found for any target');
          }
          gitCommit = await this.gitPort.commitToGit(
            gitRepo,
            firstTargetUpdates.createOrUpdate,
            commitMessage,
          );
          this.logger.info('Committed unified artifacts', {
            commitId: gitCommit.id,
            commitSha: gitCommit.sha,
          });
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'NO_CHANGES_DETECTED'
          ) {
            this.logger.info('No changes detected for unified deployment', {
              repositoryId,
            });
            distributionStatus = DistributionStatus.no_changes;
            gitCommit = undefined;
          } else {
            throw error;
          }
        }

        // Create distribution records for each target
        for (const target of targets) {
          const distribution = await this.createDistribution(
            command,
            target,
            recipeVersions,
            standardVersions,
            activeRenderModes,
            distributionStatus,
            gitCommit,
          );
          distributions.push(distribution);

          this.logger.info('Created distribution record for target', {
            targetId: target.id,
            distributionId: distribution.id,
            status: distributionStatus,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('Failed to publish artifacts to repository', {
          repositoryId,
          error: errorMessage,
        });

        // Create failure distributions for all targets
        for (const target of targets) {
          const distribution = await this.createDistribution(
            command,
            target,
            recipeVersions,
            standardVersions,
            activeRenderModes,
            DistributionStatus.failure,
            undefined,
            errorMessage,
          );
          distributions.push(distribution);
        }
      }
    }

    this.logger.info('Successfully published unified artifacts', {
      distributionsCount: distributions.length,
      repositoriesProcessed: repositoryTargetsMap.size,
    });

    this.eventEmitterService.emit(
      new DeploymentCompletedEvent({
        userId: command.userId as UserId,
        organizationId: command.organizationId as OrganizationId,
        targetIds: command.targetIds,
        recipeCount: recipeVersions.length,
        standardCount: standardVersions.length,
      }),
    );

    return {
      distributions,
    };
  }

  private async createDistribution(
    command: PublishArtifactsCommand,
    target: Target,
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    activeRenderModes: RenderMode[],
    status: DistributionStatus,
    gitCommit?: GitCommit,
    error?: string,
  ): Promise<Distribution> {
    const distributionId = createDistributionId(uuidv4());

    const distribution: Distribution = {
      id: distributionId,
      distributedPackages: [], // DistributedPackages are created by PublishPackagesUseCase
      createdAt: new Date().toISOString(),
      authorId: command.userId as UserId,
      organizationId: command.organizationId as OrganizationId,
      gitCommit,
      target,
      status,
      error,
      renderModes: activeRenderModes,
    };

    await this.distributionRepository.add(distribution);

    return distribution;
  }

  /**
   * Prepares unified deployment using renderArtifacts for all targets
   * Returns a map of targetId -> FileUpdates
   */
  private async prepareUnifiedDeployment(
    userId: UserId,
    organizationId: OrganizationId,
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    gitRepo: GitRepo,
    targets: Target[],
    codingAgents: CodingAgent[],
  ): Promise<Map<string, FileUpdates>> {
    const fileUpdatesPerTarget = new Map<string, FileUpdates>();

    for (const target of targets) {
      // Fetch existing files from git
      const existingFiles = await fetchExistingFilesFromGit(
        this.gitPort,
        gitRepo,
        target,
        codingAgents,
        this.logger,
      );

      // Call unified renderArtifacts with both recipes and standards
      const baseFileUpdates = await this.codingAgentPort.renderArtifacts({
        userId,
        organizationId,
        installed: {
          recipeVersions,
          standardVersions,
        },
        removed: {
          recipeVersions: [],
          standardVersions: [],
        },
        codingAgents,
        existingFiles,
      });

      // Apply target path prefixing
      const prefixedFileUpdates = applyTargetPrefixingToFileUpdates(
        baseFileUpdates,
        target,
        this.logger,
      );

      fileUpdatesPerTarget.set(target.id, prefixedFileUpdates);

      this.logger.debug('Prepared unified deployment for target', {
        targetId: target.id,
        filesCount: prefixedFileUpdates.createOrUpdate.length,
      });
    }

    return fileUpdatesPerTarget;
  }

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

  private async fetchRecipeVersions(
    recipeVersionIds: string[],
  ): Promise<RecipeVersion[]> {
    const versions: RecipeVersion[] = [];
    for (const id of recipeVersionIds) {
      const version = await this.recipesPort.getRecipeVersionById(id);
      if (!version) {
        throw new Error(`Recipe version with ID ${id} not found`);
      }
      versions.push(version);
    }
    return versions.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async fetchStandardVersions(
    standardVersionIds: StandardVersionId[],
  ): Promise<StandardVersion[]> {
    const versions: StandardVersion[] = [];
    for (const id of standardVersionIds) {
      const version = await this.standardsPort.getStandardVersionById(id);
      if (!version) {
        throw new Error(`Standard version with ID ${id} not found`);
      }
      versions.push(version);
    }
    return versions.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async collectAllRecipeVersions(
    command: PublishArtifactsCommand,
    targets: Target[],
    newRecipeVersions: RecipeVersion[],
  ): Promise<RecipeVersion[]> {
    const allPreviousRecipeVersions = new Map<string, RecipeVersion>();

    for (const target of targets) {
      const previousRecipeVersions =
        await this.distributionRepository.findActiveRecipeVersionsByTarget(
          command.organizationId as OrganizationId,
          target.id,
        );

      for (const recipeVersion of previousRecipeVersions) {
        const existing = allPreviousRecipeVersions.get(recipeVersion.recipeId);
        if (!existing || recipeVersion.version > existing.version) {
          allPreviousRecipeVersions.set(recipeVersion.recipeId, recipeVersion);
        }
      }
    }

    const previousArray = Array.from(allPreviousRecipeVersions.values());
    return this.combineRecipeVersions(previousArray, newRecipeVersions);
  }

  private async collectAllStandardVersions(
    command: PublishArtifactsCommand,
    targets: Target[],
    newStandardVersions: StandardVersion[],
  ): Promise<StandardVersion[]> {
    const allPreviousStandardVersions = new Map<string, StandardVersion>();

    for (const target of targets) {
      const previousStandardVersions =
        await this.distributionRepository.findActiveStandardVersionsByTarget(
          command.organizationId as OrganizationId,
          target.id,
        );

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

    const previousArray = Array.from(allPreviousStandardVersions.values());
    return this.combineStandardVersions(previousArray, newStandardVersions);
  }

  private combineRecipeVersions(
    previous: RecipeVersion[],
    newVersions: RecipeVersion[],
  ): RecipeVersion[] {
    const map = new Map<string, RecipeVersion>();
    previous.forEach((rv) => map.set(rv.recipeId, rv));
    newVersions.forEach((rv) => map.set(rv.recipeId, rv));
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  private combineStandardVersions(
    previous: StandardVersion[],
    newVersions: StandardVersion[],
  ): StandardVersion[] {
    const map = new Map<string, StandardVersion>();
    previous.forEach((sv) => map.set(sv.standardId, sv));
    newVersions.forEach((sv) => map.set(sv.standardId, sv));
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  private buildCommitMessage(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    allRecipeVersions: RecipeVersion[],
    allStandardVersions: StandardVersion[],
    targets: Target[],
  ): string {
    const parts: string[] = [
      '[PACKMIND] Update artifacts (recipes + standards)',
      '',
    ];

    if (recipeVersions.length > 0) {
      parts.push(`- Updated ${recipeVersions.length} recipe(s)`);
      parts.push(`- Total recipes in repository: ${allRecipeVersions.length}`);
    }

    if (standardVersions.length > 0) {
      parts.push(`- Updated ${standardVersions.length} standard(s)`);
      parts.push(
        `- Total standards in repository: ${allStandardVersions.length}`,
      );
    }

    parts.push(`- Targets: ${targets.map((t) => t.name).join(', ')}`);
    parts.push('');

    if (recipeVersions.length > 0) {
      parts.push('Recipes updated:');
      recipeVersions.forEach((rv) => {
        parts.push(`- ${rv.name} (${rv.slug}) v${rv.version}`);
      });
      parts.push('');
    }

    if (standardVersions.length > 0) {
      parts.push('Standards updated:');
      standardVersions.forEach((sv) => {
        parts.push(`- ${sv.name} (${sv.slug}) v${sv.version}`);
      });
    }

    return parts.join('\n');
  }
}
