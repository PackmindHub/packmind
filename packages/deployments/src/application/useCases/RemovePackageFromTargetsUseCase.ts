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
  SkillVersionId,
  Package,
  Target,
  GitRepo,
  RecipeVersion,
  StandardVersion,
  SkillVersion,
  Distribution,
  DistributionStatus,
  DistributionOperation,
  GitCommit,
  createDistributionId,
  createDistributedPackageId,
  IRecipesPort,
  IStandardsPort,
  ISkillsPort,
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
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { PackmindConfigService } from '../services/PackmindConfigService';
import {
  fetchExistingFilesFromGit,
  applyTargetPrefixingToFileUpdates,
  getTargetPrefixedPath,
} from '../utils/GitFileUtils';
import { v4 as uuidv4 } from 'uuid';

const origin = 'RemovePackageFromTargetsUseCase';

type TargetRemovalData = {
  fileUpdates: FileUpdates;
  removedRecipeVersions: RecipeVersion[];
  removedStandardVersions: StandardVersion[];
  removedSkillVersions: SkillVersion[];
};

export class RemovePackageFromTargetsUseCase implements IRemovePackageFromTargetsUseCase {
  constructor(
    private readonly packageService: PackageService,
    private readonly targetService: TargetService,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly gitPort: IGitPort,
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly packmindConfigService: PackmindConfigService = new PackmindConfigService(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: RemovePackageFromTargetsCommand,
  ): Promise<RemovePackageFromTargetsResponse> {
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
        // Prepare removal deployment for all targets
        const removalDataPerTarget = await this.prepareRemovalDeployment(
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
          const firstTargetData = removalDataPerTarget.values().next().value;
          if (!firstTargetData) {
            throw new Error('No file updates found for any target');
          }

          gitCommit = await this.gitPort.commitToGit(
            gitRepo,
            firstTargetData.fileUpdates.createOrUpdate,
            commitMessage,
            firstTargetData.fileUpdates.delete,
          );
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
          const targetData = removalDataPerTarget.get(target.id);
          if (!targetData) {
            throw new Error(`No removal data found for target ${target.id}`);
          }

          await this.createDistribution(
            command,
            target,
            activeRenderModes,
            distributionStatus,
            pkg,
            targetData.removedRecipeVersions,
            targetData.removedStandardVersions,
            targetData.removedSkillVersions,
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
            pkg,
            [],
            [],
            [],
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
   * Returns both the file updates and the removed artifact versions for each target.
   */
  private async prepareRemovalDeployment(
    userId: UserId,
    organizationId: OrganizationId,
    artifactResolutions: TargetArtifactResolution[],
    targets: Target[],
    gitRepo: GitRepo,
    codingAgents: CodingAgent[],
    packageSlugToRemove: string,
  ): Promise<Map<string, TargetRemovalData>> {
    const removalDataPerTarget = new Map<string, TargetRemovalData>();

    for (const target of targets) {
      const resolution = artifactResolutions.find(
        (r) => r.targetId === target.id,
      );
      if (!resolution) {
        throw new Error(`No artifact resolution found for target ${target.id}`);
      }

      // Fetch existing packmind.json to check for per-target agents
      const existingPackmindJson = await this.fetchExistingPackmindJson(
        gitRepo,
        target,
      );
      const existingPackages = existingPackmindJson?.packages ?? {};

      // Use per-target agents if defined in packmind.json, otherwise use org-level agents
      // Note: empty array [] means "no agents" (intentional), undefined means "use org-level"
      const targetCodingAgents =
        existingPackmindJson?.agents !== undefined
          ? existingPackmindJson.agents
          : codingAgents;

      if (existingPackmindJson?.agents !== undefined) {
        this.logger.info('Using per-target agents from packmind.json', {
          targetId: target.id,
          targetName: target.name,
          agents: targetCodingAgents,
        });
      }

      // Fetch existing files from git
      const existingFiles = await fetchExistingFilesFromGit(
        this.gitPort,
        gitRepo,
        target,
        targetCodingAgents,
        this.logger,
      );

      // Fetch recipe, standard, and skill versions for installed (remaining) artifacts
      const installedRecipeVersions = await this.fetchRecipeVersionsByIds(
        resolution.remainingArtifacts.recipeVersionIds,
      );
      const installedStandardVersions = await this.fetchStandardVersionsByIds(
        resolution.remainingArtifacts.standardVersionIds,
      );
      const installedSkillVersions = await this.fetchSkillVersionsByIds(
        resolution.remainingArtifacts.skillVersionIds,
      );

      // Fetch recipe, standard, and skill versions for removed (exclusive) artifacts
      const removedRecipeVersions = await this.fetchRecipeVersionsByIds(
        resolution.exclusiveArtifacts.recipeVersionIds,
      );
      const removedStandardVersions = await this.fetchStandardVersionsByIds(
        resolution.exclusiveArtifacts.standardVersionIds,
      );
      const removedSkillVersions = await this.fetchSkillVersionsByIds(
        resolution.exclusiveArtifacts.skillVersionIds,
      );

      // Call renderArtifacts with remaining as installed and exclusive as removed
      const baseFileUpdates = await this.codingAgentPort.renderArtifacts({
        userId,
        organizationId,
        installed: {
          recipeVersions: installedRecipeVersions,
          standardVersions: installedStandardVersions,
          skillVersions: installedSkillVersions,
        },
        removed: {
          recipeVersions: removedRecipeVersions,
          standardVersions: removedStandardVersions,
          skillVersions: removedSkillVersions,
        },
        codingAgents: targetCodingAgents,
        existingFiles,
      });

      // Create config file with package removed (preserving agents if defined)
      const configFile =
        this.packmindConfigService.createRemovalConfigFileModification(
          packageSlugToRemove,
          existingPackages,
          existingPackmindJson?.agents,
        );
      baseFileUpdates.createOrUpdate.push(configFile);

      // Apply target path prefixing
      const prefixedFileUpdates = applyTargetPrefixingToFileUpdates(
        baseFileUpdates,
        target,
        this.logger,
      );

      removalDataPerTarget.set(target.id, {
        fileUpdates: prefixedFileUpdates,
        removedRecipeVersions,
        removedStandardVersions,
        removedSkillVersions,
      });

      this.logger.debug('Prepared removal deployment for target', {
        targetId: target.id,
        filesCreatedOrUpdatedCount: prefixedFileUpdates.createOrUpdate.length,
        filesDeletedCount: prefixedFileUpdates.delete.length,
        removedRecipes: removedRecipeVersions.length,
        removedStandards: removedStandardVersions.length,
        removedSkills: removedSkillVersions.length,
      });
    }

    return removalDataPerTarget;
  }

  /**
   * Fetches and parses the existing packmind.json from the git repository
   */
  private async fetchExistingPackmindJson(
    gitRepo: GitRepo,
    target: Target,
  ): Promise<PackmindFileConfig | null> {
    const packmindJsonPath = getTargetPrefixedPath('packmind.json', target);

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
   * Fetches skill versions by their IDs
   */
  private async fetchSkillVersionsByIds(
    skillVersionIds: SkillVersionId[],
  ): Promise<SkillVersion[]> {
    const versions: SkillVersion[] = [];
    for (const id of skillVersionIds) {
      const version = await this.skillsPort.getSkillVersion(id);
      if (version) {
        versions.push(version);
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
    pkg: Package,
    removedRecipeVersions: RecipeVersion[],
    removedStandardVersions: StandardVersion[],
    removedSkillVersions: SkillVersion[],
    gitCommit?: GitCommit,
    error?: string,
  ): Promise<Distribution> {
    const distributionId = createDistributionId(uuidv4());

    // Save distribution first (without distributedPackages - will be added separately)
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

    // Save distributed package separately (like PublishPackagesUseCase does)
    const distributedPackageId = createDistributedPackageId(uuidv4());
    await this.distributedPackageRepository.add({
      id: distributedPackageId,
      distributionId,
      packageId: pkg.id,
      standardVersions: [],
      recipeVersions: [],
      skillVersions: [],
      operation: 'remove',
    });

    // Link standard versions
    if (removedStandardVersions.length > 0) {
      await this.distributedPackageRepository.addStandardVersions(
        distributedPackageId,
        removedStandardVersions.map((sv) => sv.id),
      );
    }

    // Link recipe versions
    if (removedRecipeVersions.length > 0) {
      await this.distributedPackageRepository.addRecipeVersions(
        distributedPackageId,
        removedRecipeVersions.map((rv) => rv.id),
      );
    }

    // Link skill versions
    if (removedSkillVersions.length > 0) {
      await this.distributedPackageRepository.addSkillVersions(
        distributedPackageId,
        removedSkillVersions.map((sv) => sv.id),
      );
    }

    return distribution;
  }

  /**
   * Resolves artifacts for a single target.
   * 1. Gets all distributions for this target, sorted by createdAt DESC (newest first)
   * 2. For each package, only considers the LATEST distribution
   * 3. If a package's latest distribution has operation === 'remove', excludes that package
   * 4. Computes exclusive artifacts (only in removed package, not shared with remaining packages)
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

    // Sort distributions by createdAt DESC to process newest first
    const sortedDistributions = [...distributions].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Track the latest distribution for each package
    const latestDistributionPerPackage = new Map<
      string,
      {
        operation: DistributionOperation;
        recipeVersions: RecipeVersion[];
        standardVersions: StandardVersion[];
        skillVersions: SkillVersion[];
      }
    >();

    for (const distribution of sortedDistributions) {
      for (const distributedPackage of distribution.distributedPackages) {
        // Only keep the first (latest) occurrence of each package
        if (!latestDistributionPerPackage.has(distributedPackage.packageId)) {
          latestDistributionPerPackage.set(distributedPackage.packageId, {
            operation: distributedPackage.operation ?? 'add',
            recipeVersions: distributedPackage.recipeVersions,
            standardVersions: distributedPackage.standardVersions,
            skillVersions: distributedPackage.skillVersions,
          });
        }
      }
    }

    // Classify artifacts based on latest state
    const removedPackageRecipeVersionIds = new Set<RecipeVersionId>();
    const removedPackageStandardVersionIds = new Set<StandardVersionId>();
    const removedPackageSkillVersionIds = new Set<SkillVersionId>();
    const remainingPackageRecipeVersionIds = new Set<RecipeVersionId>();
    const remainingPackageStandardVersionIds = new Set<StandardVersionId>();
    const remainingPackageSkillVersionIds = new Set<SkillVersionId>();

    for (const [packageId, data] of latestDistributionPerPackage) {
      // Skip packages whose latest distribution was a removal
      if (data.operation === 'remove') {
        continue;
      }

      const isRemovedPackage = packageId === packageToRemove.id;

      for (const recipeVersion of data.recipeVersions) {
        if (isRemovedPackage) {
          removedPackageRecipeVersionIds.add(recipeVersion.id);
        } else {
          remainingPackageRecipeVersionIds.add(recipeVersion.id);
        }
      }

      for (const standardVersion of data.standardVersions) {
        if (isRemovedPackage) {
          removedPackageStandardVersionIds.add(standardVersion.id);
        } else {
          remainingPackageStandardVersionIds.add(standardVersion.id);
        }
      }

      for (const skillVersion of data.skillVersions) {
        if (isRemovedPackage) {
          removedPackageSkillVersionIds.add(skillVersion.id);
        } else {
          remainingPackageSkillVersionIds.add(skillVersion.id);
        }
      }
    }

    // Compute exclusive artifacts (only in removed package)
    const exclusiveRecipeVersionIds = Array.from(
      removedPackageRecipeVersionIds,
    ).filter((id) => !remainingPackageRecipeVersionIds.has(id));

    const exclusiveStandardVersionIds = Array.from(
      removedPackageStandardVersionIds,
    ).filter((id) => !remainingPackageStandardVersionIds.has(id));

    const exclusiveSkillVersionIds = Array.from(
      removedPackageSkillVersionIds,
    ).filter((id) => !remainingPackageSkillVersionIds.has(id));

    return {
      targetId,
      exclusiveArtifacts: {
        recipeVersionIds: exclusiveRecipeVersionIds,
        standardVersionIds: exclusiveStandardVersionIds,
        skillVersionIds: exclusiveSkillVersionIds,
      },
      remainingArtifacts: {
        recipeVersionIds: Array.from(remainingPackageRecipeVersionIds),
        standardVersionIds: Array.from(remainingPackageStandardVersionIds),
        skillVersionIds: Array.from(remainingPackageSkillVersionIds),
      },
    };
  }
}
