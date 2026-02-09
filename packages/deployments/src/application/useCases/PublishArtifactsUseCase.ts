import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  IPublishArtifactsUseCase,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  Distribution,
  createDistributionId,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  ICodingAgentPort,
  IGitPort,
  IDeployDefaultSkillsUseCase,
  OrganizationId,
  UserId,
  DistributionStatus,
  GitRepo,
  Target,
  TargetId,
  RecipeVersion,
  SkillVersion,
  SkillVersionId,
  StandardVersion,
  StandardVersionId,
  RenderMode,
  FileUpdates,
  CodingAgent,
  DeploymentCompletedEvent,
  PackmindFileConfig,
  normalizeCodingAgents,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import {
  fetchExistingFilesFromGit,
  applyTargetPrefixingToFileUpdates,
  getTargetPrefixedPath,
} from '../utils/GitFileUtils';
import { PackmindConfigService } from '../services/PackmindConfigService';
import { TargetNotFoundError } from '../../domain/errors/TargetNotFoundError';
import { v4 as uuidv4 } from 'uuid';
import { PublishArtifactsDelayedJob } from '../jobs/PublishArtifactsDelayedJob';

const origin = 'PublishArtifactsUseCase';

/**
 * Unified usecase for publishing recipes, standards, and skills together
 * Uses the unified renderArtifacts method for atomic updates
 */
export class PublishArtifactsUseCase implements IPublishArtifactsUseCase {
  constructor(
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly gitPort: IGitPort,
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly distributionRepository: IDistributionRepository,
    private readonly targetService: TargetService,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly publishArtifactsDelayedJob: PublishArtifactsDelayedJob,
    private readonly deployDefaultSkillsUseCase: IDeployDefaultSkillsUseCase,
    private readonly packmindConfigService: PackmindConfigService = new PackmindConfigService(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PublishArtifactsCommand,
  ): Promise<PublishArtifactsResponse> {
    const { source = 'ui' } = command;

    this.logger.info(
      'Publishing artifacts (unified recipes + standards + skills)',
      {
        recipeVersionIdsCount: command.recipeVersionIds.length,
        standardVersionIdsCount: command.standardVersionIds.length,
        skillVersionIdsCount: command.skillVersionIds?.length ?? 0,
        targetIdsCount: command.targetIds.length,
        organizationId: command.organizationId,
      },
    );

    if (command.targetIds.length === 0) {
      throw new Error('At least one target must be provided');
    }

    // Validate all targets belong to the requesting organization
    const validTargets = await this.targetService.findByIdsInOrganization(
      command.targetIds,
      command.organizationId as OrganizationId,
    );
    if (validTargets.length !== command.targetIds.length) {
      const validIds = new Set(validTargets.map((t) => t.id));
      const missingId = command.targetIds.find((id) => !validIds.has(id));
      throw new TargetNotFoundError(missingId ?? command.targetIds[0]);
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

    // Fetch recipe, standard, and skill versions
    const recipeVersions = await this.fetchRecipeVersions(
      command.recipeVersionIds,
    );
    const standardVersions = await this.fetchStandardVersions(
      command.standardVersionIds,
    );
    const skillVersions = await this.fetchSkillVersions(
      command.skillVersionIds ?? [],
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
          skillsCount: skillVersions.length,
        });

        // Get previous deployments for all targets in this repo
        const {
          previous: previousRecipeVersions,
          previousFromPackages: previousRecipeVersionsFromPackages,
          combined: allRecipeVersions,
        } = await this.collectAllRecipeVersions(
          command,
          targets,
          recipeVersions,
        );
        const {
          previous: previousStandardVersions,
          previousFromPackages: previousStandardVersionsFromPackages,
          combined: allStandardVersions,
        } = await this.collectAllStandardVersions(
          command,
          targets,
          standardVersions,
        );
        const {
          previous: previousSkillVersions,
          previousFromPackages: previousSkillVersionsFromPackages,
          combined: allSkillVersions,
        } = await this.collectAllSkillVersions(command, targets, skillVersions);

        // Compute removed artifacts (previously deployed from the same packages but not in new deployment command)
        // Only compare against artifacts from the packages being deployed to avoid removing artifacts from other packages
        const removedRecipeVersionsFromDeployedPackages =
          this.computeRemovedRecipeVersions(
            previousRecipeVersionsFromPackages,
            recipeVersions,
          );
        // Artifacts from other packages = in previous (all packages) but NOT from the deployed packages
        const recipeVersionsFromOtherPackages = previousRecipeVersions.filter(
          (pv) =>
            !previousRecipeVersionsFromPackages.some(
              (pfp) => pfp.recipeId === pv.recipeId,
            ),
        );
        // Only truly remove if not still present via other packages
        const removedRecipeVersions =
          removedRecipeVersionsFromDeployedPackages.filter(
            (rrv) =>
              !recipeVersionsFromOtherPackages.some(
                (rv) => rv.recipeId === rrv.recipeId,
              ),
          );

        const removedStandardVersionsFromDeployedPackages =
          this.computeRemovedStandardVersions(
            previousStandardVersionsFromPackages,
            standardVersions,
          );
        // Artifacts from other packages = in previous (all packages) but NOT from the deployed packages
        const standardVersionsFromOtherPackages =
          previousStandardVersions.filter(
            (pv) =>
              !previousStandardVersionsFromPackages.some(
                (pfp) => pfp.standardId === pv.standardId,
              ),
          );
        // Only truly remove if not still present via other packages
        const removedStandardVersions =
          removedStandardVersionsFromDeployedPackages.filter(
            (rsv) =>
              !standardVersionsFromOtherPackages.some(
                (sv) => sv.standardId === rsv.standardId,
              ),
          );

        const removedSkillVersionsFromDeployedPackages =
          this.computeRemovedSkillVersions(
            previousSkillVersionsFromPackages,
            skillVersions,
          );
        // Artifacts from other packages = in previous (all packages) but NOT from the deployed packages
        const skillVersionsFromOtherPackages = previousSkillVersions.filter(
          (pv) =>
            !previousSkillVersionsFromPackages.some(
              (pfp) => pfp.skillId === pv.skillId,
            ),
        );
        // Only truly remove if not still present via other packages
        const removedSkillVersions =
          removedSkillVersionsFromDeployedPackages.filter(
            (rsv) =>
              !skillVersionsFromOtherPackages.some(
                (sv) => sv.skillId === rsv.skillId,
              ),
          );

        const renamedSkillVersions = this.computeRenamedSkillVersions(
          previousSkillVersionsFromPackages,
          skillVersions,
        );

        const skillVersionsToRemove = [
          ...removedSkillVersions,
          ...renamedSkillVersions,
        ];

        // Filter out removed skills from installed list
        const removedSkillIds = new Set(
          removedSkillVersions.map((sv) => sv.skillId),
        );
        const filteredSkillVersions = allSkillVersions.filter(
          (sv) => !removedSkillIds.has(sv.skillId),
        );

        // Filter out removed standards from installed list
        const removedStandardIds = new Set(
          removedStandardVersions.map((sv) => sv.standardId),
        );
        const filteredStandardVersions = allStandardVersions.filter(
          (sv) => !removedStandardIds.has(sv.standardId),
        );

        // Filter out removed recipes from installed list
        const removedRecipeIds = new Set(
          removedRecipeVersions.map((rv) => rv.recipeId),
        );
        const filteredRecipeVersions = allRecipeVersions.filter(
          (rv) => !removedRecipeIds.has(rv.recipeId),
        );

        // Load rules for all standard versions that don't have them populated
        // This is critical for previously deployed standards which come from the database
        // without their rules relation loaded
        const standardVersionsWithRules = await Promise.all(
          filteredStandardVersions.map(async (sv) => {
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

        // Prepare unified deployment using renderArtifacts for ALL targets
        const {
          fileUpdatesPerTarget,
          renderModesPerTarget,
          addedPackmindSkills,
        } = await this.prepareUnifiedDeployment(
          command.userId as UserId,
          command.organizationId as OrganizationId,
          filteredRecipeVersions,
          standardVersionsWithRules,
          filteredSkillVersions,
          removedRecipeVersions,
          removedStandardVersions,
          skillVersionsToRemove,
          gitRepo,
          targets,
          codingAgents,
          command.packagesSlugs,
        );

        // Build commit message for the job
        const commitMessage = this.buildCommitMessage(
          recipeVersions,
          standardVersions,
          skillVersions,
          filteredRecipeVersions,
          standardVersionsWithRules,
          filteredSkillVersions,
          targets,
          addedPackmindSkills,
        );

        // Get file updates from first target (they're all the same for multi-target repos)
        const firstTargetUpdates = fileUpdatesPerTarget.values().next().value;
        if (!firstTargetUpdates) {
          throw new Error('No file updates found for any target');
        }

        // Create distribution records for each target with in_progress status
        const targetDistributions: Distribution[] = [];
        for (const target of targets) {
          // Use per-target render modes from packmind.json, fallback to org-level
          const targetRenderModes =
            renderModesPerTarget.get(target.id) ?? activeRenderModes;
          const distribution = await this.createDistribution(
            command,
            target,
            targetRenderModes,
            DistributionStatus.in_progress,
            undefined,
          );
          targetDistributions.push(distribution);
          distributions.push(distribution);

          this.logger.info('Created distribution record for target', {
            targetId: target.id,
            distributionId: distribution.id,
            status: DistributionStatus.in_progress,
          });
        }

        // Enqueue one job per repository (using the first target's distribution as the reference)
        // The job will update all distributions for this repository on completion
        const firstDistribution = targetDistributions[0];
        await this.publishArtifactsDelayedJob.addJob({
          distributionId: firstDistribution.id,
          organizationId: command.organizationId as OrganizationId,
          userId: command.userId as UserId,
          targetId: targets[0].id,
          gitRepoId: gitRepo.id,
          fileUpdates: firstTargetUpdates,
          commitMessage,
          recipeVersionIds: recipeVersions.map((rv) => rv.id),
          standardVersionIds: standardVersions.map((sv) => sv.id),
          skillVersionIds: skillVersions.map((skv) => skv.id),
          activeRenderModes,
          packagesSlugs: command.packagesSlugs,
          source,
        });

        this.logger.info('Enqueued publish artifacts job for repository', {
          repositoryId,
          distributionId: firstDistribution.id,
          targetsCount: targets.length,
        });
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
        source,
      }),
    );

    return {
      distributions,
    };
  }

  private async createDistribution(
    command: PublishArtifactsCommand,
    target: Target,
    activeRenderModes: RenderMode[],
    status: DistributionStatus,
    gitCommit?: undefined,
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
      source: 'app',
    };

    await this.distributionRepository.add(distribution);

    return distribution;
  }

  /**
   * Prepares unified deployment using renderArtifacts for all targets
   * Returns a map of targetId -> FileUpdates and names of newly added Packmind skills
   */
  private async prepareUnifiedDeployment(
    userId: UserId,
    organizationId: OrganizationId,
    installedRecipeVersions: RecipeVersion[],
    installedStandardVersions: StandardVersion[],
    installedSkillVersions: SkillVersion[],
    removedRecipeVersions: RecipeVersion[],
    removedStandardVersions: StandardVersion[],
    removedSkillVersions: SkillVersion[],
    gitRepo: GitRepo,
    targets: Target[],
    codingAgents: CodingAgent[],
    packagesSlugs: string[],
  ): Promise<{
    fileUpdatesPerTarget: Map<string, FileUpdates>;
    renderModesPerTarget: Map<string, RenderMode[]>;
    addedPackmindSkills: string[];
  }> {
    const fileUpdatesPerTarget = new Map<string, FileUpdates>();
    const renderModesPerTarget = new Map<string, RenderMode[]>();
    let addedPackmindSkills: string[] = [];

    for (const target of targets) {
      // Fetch existing packmind.json to check for per-target agents
      const existingPackmindJson = await this.fetchExistingPackmindJson(
        gitRepo,
        target,
      );
      const existingPackages = existingPackmindJson?.packages ?? {};

      // Use per-target agents if defined in packmind.json, otherwise use org-level agents
      // Note: undefined means "use org-level", but any defined array (including []) gets normalized
      // to always include 'packmind' agent
      const targetCodingAgents =
        existingPackmindJson?.agents !== undefined
          ? normalizeCodingAgents(existingPackmindJson.agents)
          : codingAgents;

      if (existingPackmindJson?.agents !== undefined) {
        this.logger.info('Using per-target agents from packmind.json', {
          targetId: target.id,
          targetName: target.name,
          agents: targetCodingAgents,
        });
      }

      // Convert target coding agents to render modes for distribution storage
      const targetRenderModes =
        this.renderModeConfigurationService.mapCodingAgentsToRenderModes(
          targetCodingAgents,
        );
      renderModesPerTarget.set(target.id, targetRenderModes);

      const previousRenderModes =
        await this.distributionRepository.findActiveRenderModesByTarget(
          organizationId,
          target.id,
        );

      const previousAgents =
        this.renderModeConfigurationService.mapRenderModesToCodingAgents(
          previousRenderModes,
        );

      const currentAgentSet = new Set(targetCodingAgents);
      const removedAgents = previousAgents.filter(
        (agent) => !currentAgentSet.has(agent),
      );

      // Fetch existing files from git
      const existingFiles = await fetchExistingFilesFromGit(
        this.gitPort,
        gitRepo,
        target,
        targetCodingAgents,
        this.logger,
      );

      // Call unified renderArtifacts with recipes, standards, and skills
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

      if (removedAgents.length > 0) {
        const [
          activeRecipeVersions,
          activeStandardVersions,
          activeSkillVersions,
        ] = await Promise.all([
          this.distributionRepository.findActiveRecipeVersionsByTarget(
            organizationId,
            target.id,
          ),
          this.distributionRepository.findActiveStandardVersionsByTarget(
            organizationId,
            target.id,
          ),
          this.distributionRepository.findActiveSkillVersionsByTarget(
            organizationId,
            target.id,
          ),
        ]);

        const cleanupFileUpdates =
          await this.codingAgentPort.generateAgentCleanupUpdatesForAgents({
            agents: removedAgents,
            artifacts: {
              recipeVersions: activeRecipeVersions,
              standardVersions: activeStandardVersions,
              skillVersions: activeSkillVersions,
            },
          });

        this.mergeFileUpdates(baseFileUpdates, cleanupFileUpdates);
      }

      // Add packmind.json config file with merged packages (preserving agents if defined)
      const configFile =
        this.packmindConfigService.createConfigFileModification(
          packagesSlugs,
          existingPackages,
          existingPackmindJson?.agents,
        );
      baseFileUpdates.createOrUpdate.push(configFile);

      // Include default skills for root targets
      if (target.path === '/') {
        this.logger.info(
          'Including default skills for root target deployment',
          {
            targetId: target.id,
            targetName: target.name,
          },
        );
        addedPackmindSkills = await this.includeDefaultSkills(
          userId,
          organizationId,
          baseFileUpdates,
          gitRepo,
          targetCodingAgents,
        );
      }

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

    return { fileUpdatesPerTarget, renderModesPerTarget, addedPackmindSkills };
  }

  /**
   * Fetches and parses the existing packmind.json from the git repository
   * Returns null if the file doesn't exist or couldn't be parsed
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
      // File doesn't exist or couldn't be parsed
      return null;
    }
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
        throw new Error(`Command version with ID ${id} not found`);
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

  private async fetchSkillVersions(
    skillVersionIds: SkillVersionId[],
  ): Promise<SkillVersion[]> {
    const versions: SkillVersion[] = [];
    for (const id of skillVersionIds) {
      const version = await this.skillsPort.getSkillVersion(id);
      if (!version) {
        throw new Error(`Skill version with ID ${id} not found`);
      }
      // Fetch skill files for this version
      const files = await this.skillsPort.getSkillFiles(id);
      versions.push({ ...version, files });
    }
    return versions.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async collectAllRecipeVersions(
    command: PublishArtifactsCommand,
    targets: Target[],
    newRecipeVersions: RecipeVersion[],
  ): Promise<{
    previous: RecipeVersion[];
    previousFromPackages: RecipeVersion[];
    combined: RecipeVersion[];
  }> {
    const allPreviousRecipeVersions = new Map<string, RecipeVersion>();
    const previousFromPackagesMap = new Map<string, RecipeVersion>();

    for (const target of targets) {
      // Get all previous recipe versions (for combining)
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

      // Get previous recipe versions filtered by packages being deployed (for removal calculation)
      const previousFromPackagesVersions =
        await this.distributionRepository.findActiveRecipeVersionsByTargetAndPackages(
          command.organizationId as OrganizationId,
          target.id,
          command.packageIds,
        );

      for (const recipeVersion of previousFromPackagesVersions) {
        const existing = previousFromPackagesMap.get(recipeVersion.recipeId);
        if (!existing || recipeVersion.version > existing.version) {
          previousFromPackagesMap.set(recipeVersion.recipeId, recipeVersion);
        }
      }
    }

    const previous = Array.from(allPreviousRecipeVersions.values());
    const previousFromPackages = Array.from(previousFromPackagesMap.values());
    const combined = this.combineRecipeVersions(previous, newRecipeVersions);
    return { previous, previousFromPackages, combined };
  }

  private async collectAllStandardVersions(
    command: PublishArtifactsCommand,
    targets: Target[],
    newStandardVersions: StandardVersion[],
  ): Promise<{
    previous: StandardVersion[];
    previousFromPackages: StandardVersion[];
    combined: StandardVersion[];
  }> {
    const allPreviousStandardVersions = new Map<string, StandardVersion>();
    const previousFromPackagesMap = new Map<string, StandardVersion>();

    for (const target of targets) {
      // Get all previous standard versions (for combining)
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

      // Get previous standard versions filtered by packages being deployed (for removal calculation)
      const previousFromPackagesVersions =
        await this.distributionRepository.findActiveStandardVersionsByTargetAndPackages(
          command.organizationId as OrganizationId,
          target.id,
          command.packageIds,
        );

      for (const standardVersion of previousFromPackagesVersions) {
        const existing = previousFromPackagesMap.get(
          standardVersion.standardId,
        );
        if (!existing || standardVersion.version > existing.version) {
          previousFromPackagesMap.set(
            standardVersion.standardId,
            standardVersion,
          );
        }
      }
    }

    const previous = Array.from(allPreviousStandardVersions.values());
    const previousFromPackages = Array.from(previousFromPackagesMap.values());
    const combined = this.combineStandardVersions(
      previous,
      newStandardVersions,
    );
    return { previous, previousFromPackages, combined };
  }

  private async collectAllSkillVersions(
    command: PublishArtifactsCommand,
    targets: Target[],
    newSkillVersions: SkillVersion[],
  ): Promise<{
    previous: SkillVersion[];
    previousFromPackages: SkillVersion[];
    combined: SkillVersion[];
  }> {
    const allPreviousSkillVersions = new Map<string, SkillVersion>();
    const previousFromPackagesMap = new Map<string, SkillVersion>();

    for (const target of targets) {
      // Get all previous skill versions (for combining)
      const previousSkillVersions =
        await this.distributionRepository.findActiveSkillVersionsByTarget(
          command.organizationId as OrganizationId,
          target.id,
        );

      for (const skillVersion of previousSkillVersions) {
        const existing = allPreviousSkillVersions.get(skillVersion.skillId);
        if (!existing || skillVersion.version > existing.version) {
          allPreviousSkillVersions.set(skillVersion.skillId, skillVersion);
        }
      }

      // Get previous skill versions filtered by packages being deployed (for removal calculation)
      const previousFromPackagesVersions =
        await this.distributionRepository.findActiveSkillVersionsByTargetAndPackages(
          command.organizationId as OrganizationId,
          target.id,
          command.packageIds,
        );

      for (const skillVersion of previousFromPackagesVersions) {
        const existing = previousFromPackagesMap.get(skillVersion.skillId);
        if (!existing || skillVersion.version > existing.version) {
          previousFromPackagesMap.set(skillVersion.skillId, skillVersion);
        }
      }
    }

    const previous = Array.from(allPreviousSkillVersions.values());
    const previousFromPackages = Array.from(previousFromPackagesMap.values());
    const combined = this.combineSkillVersions(previous, newSkillVersions);
    return { previous, previousFromPackages, combined };
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

  private combineSkillVersions(
    previous: SkillVersion[],
    newVersions: SkillVersion[],
  ): SkillVersion[] {
    const map = new Map<string, SkillVersion>();
    previous.forEach((skv) => map.set(skv.skillId, skv));
    newVersions.forEach((skv) => map.set(skv.skillId, skv));
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Computes recipe versions that were previously deployed but are no longer
   * in the current deployment (i.e., they are being removed)
   */
  private computeRemovedRecipeVersions(
    previousVersions: RecipeVersion[],
    currentVersions: RecipeVersion[],
  ): RecipeVersion[] {
    const currentRecipeIds = new Set(currentVersions.map((rv) => rv.recipeId));
    return previousVersions.filter((rv) => !currentRecipeIds.has(rv.recipeId));
  }

  /**
   * Computes standard versions that were previously deployed but are no longer
   * in the current deployment (i.e., they are being removed)
   */
  private computeRemovedStandardVersions(
    previousVersions: StandardVersion[],
    currentVersions: StandardVersion[],
  ): StandardVersion[] {
    const currentStandardIds = new Set(
      currentVersions.map((sv) => sv.standardId),
    );
    return previousVersions.filter(
      (sv) => !currentStandardIds.has(sv.standardId),
    );
  }

  /**
   * Computes skill versions that were previously deployed but are no longer
   * in the current deployment (i.e., they are being removed)
   */
  private computeRemovedSkillVersions(
    previousVersions: SkillVersion[],
    currentVersions: SkillVersion[],
  ): SkillVersion[] {
    const currentSkillIds = new Set(currentVersions.map((skv) => skv.skillId));
    return previousVersions.filter((skv) => !currentSkillIds.has(skv.skillId));
  }

  /**
   * Computes skill versions that were renamed (same skillId but different slug).
   * Returns the PREVIOUS versions (with old slugs) so their directories can be deleted.
   */
  private computeRenamedSkillVersions(
    previousVersions: SkillVersion[],
    currentVersions: SkillVersion[],
  ): SkillVersion[] {
    const currentBySkillId = new Map(
      currentVersions.map((sv) => [sv.skillId, sv]),
    );

    return previousVersions.filter((prevSv) => {
      const currentSv = currentBySkillId.get(prevSv.skillId);
      // Renamed: same skillId exists in current but slug has changed
      return currentSv && currentSv.slug !== prevSv.slug;
    });
  }

  private buildCommitMessage(
    recipeVersions: RecipeVersion[],
    standardVersions: StandardVersion[],
    skillVersions: SkillVersion[],
    allRecipeVersions: RecipeVersion[],
    allStandardVersions: StandardVersion[],
    allSkillVersions: SkillVersion[],
    targets: Target[],
    addedPackmindSkills: string[],
  ): string {
    const parts: string[] = [
      '[PACKMIND] Update artifacts (commands + standards + skills)',
      '',
    ];

    if (recipeVersions.length > 0) {
      parts.push(`- Updated ${recipeVersions.length} command(s)`);
      parts.push(`- Total commands in repository: ${allRecipeVersions.length}`);
    }

    if (standardVersions.length > 0) {
      parts.push(`- Updated ${standardVersions.length} standard(s)`);
      parts.push(
        `- Total standards in repository: ${allStandardVersions.length}`,
      );
    }

    if (skillVersions.length > 0) {
      parts.push(`- Updated ${skillVersions.length} skill(s)`);
      parts.push(`- Total skills in repository: ${allSkillVersions.length}`);
    }

    if (addedPackmindSkills.length > 0) {
      parts.push(
        `- Added ${addedPackmindSkills.length} Packmind skill(s): ${addedPackmindSkills.join(', ')}`,
      );
    }

    parts.push(`- Targets: ${targets.map((t) => t.name).join(', ')}`);
    parts.push('');

    if (recipeVersions.length > 0) {
      parts.push('Commands updated:');
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
      parts.push('');
    }

    if (skillVersions.length > 0) {
      parts.push('Skills updated:');
      skillVersions.forEach((skv) => {
        parts.push(`- ${skv.name} (${skv.slug}) v${skv.version}`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Deploys default skills using the DeployDefaultSkillsUseCase and merges them
   * into the provided file updates.
   * Returns the names of newly added Packmind skills (skills not already in the repository).
   */
  private async includeDefaultSkills(
    userId: UserId,
    organizationId: OrganizationId,
    fileUpdates: FileUpdates,
    gitRepo: GitRepo,
    targetCodingAgents: CodingAgent[],
  ): Promise<string[]> {
    const result = await this.deployDefaultSkillsUseCase.execute({
      userId,
      organizationId,
      agents: targetCodingAgents,
    });

    // Extract skill names from paths and determine which are new
    const addedSkillNames = await this.extractNewlyAddedSkillNames(
      result.fileUpdates,
      gitRepo,
    );

    this.mergeFileUpdates(fileUpdates, result.fileUpdates);

    this.logger.info(
      'Packmind skills included via DeployDefaultSkillsUseCase',
      {
        createOrUpdateCount: result.fileUpdates.createOrUpdate.length,
        deleteCount: result.fileUpdates.delete.length,
        addedSkillNames,
      },
    );

    return addedSkillNames;
  }

  /**
   * Extracts names of skills that are newly added (SKILL.md doesn't exist in repo).
   * Parses skill names from paths like `.claude/skills/{skill-name}/SKILL.md`.
   */
  private async extractNewlyAddedSkillNames(
    defaultSkillsUpdates: FileUpdates,
    gitRepo: GitRepo,
  ): Promise<string[]> {
    const skillPattern = /\.claude\/skills\/([^/]+)\/SKILL\.md$/;
    const addedSkills: string[] = [];

    for (const file of defaultSkillsUpdates.createOrUpdate) {
      const match = skillPattern.exec(file.path);
      if (match) {
        const skillName = match[1];
        // Check if the SKILL.md already exists in the repository
        const existingFile = await this.gitPort.getFileFromRepo(
          gitRepo,
          file.path,
        );
        if (!existingFile) {
          addedSkills.push(skillName);
        }
      }
    }

    return addedSkills.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Merges source file updates into target, avoiding duplicates by path.
   */
  private mergeFileUpdates(target: FileUpdates, source: FileUpdates): void {
    const existingPaths = new Set(target.createOrUpdate.map((f) => f.path));
    for (const file of source.createOrUpdate) {
      if (!existingPaths.has(file.path)) {
        target.createOrUpdate.push(file);
        existingPaths.add(file.path);
      }
    }

    const existingDeletePaths = new Set(target.delete.map((f) => f.path));
    for (const file of source.delete) {
      if (!existingDeletePaths.has(file.path)) {
        target.delete.push(file);
        existingDeletePaths.add(file.path);
      }
    }
  }
}
