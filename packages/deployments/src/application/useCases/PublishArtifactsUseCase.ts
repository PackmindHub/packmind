import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  IPublishArtifactsUseCase,
  PublishArtifactsCommand,
  PublishArtifactsResponse,
  Distribution,
  createDistributionId,
  ICommandsPort,
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
  PackageId,
  CommandVersion,
  SkillVersion,
  StandardVersion,
  RenderMode,
  FileUpdates,
  CodingAgent,
  DeploymentCompletedEvent,
  PackmindFileConfig,
  PackmindLockFile,
  normalizeCodingAgents,
} from '@packmind/types';
import {
  ActiveArtifactVersions,
  ActiveArtifactVersionsByScope,
  IDistributionRepository,
} from '../../domain/repositories/IDistributionRepository';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import {
  fetchExistingFilesFromGit,
  applyTargetPrefixingToFileUpdates,
  getTargetPrefixedPath,
} from '../utils/GitFileUtils';
import { PackmindConfigService } from '../services/PackmindConfigService';
import { PackmindLockFileService } from '../services/PackmindLockFileService';
import { v4 as uuidv4 } from 'uuid';
import { PublishArtifactsDelayedJob } from '../jobs/PublishArtifactsDelayedJob';

const origin = 'PublishArtifactsUseCase';

export class ArtifactVersionNotFoundError extends Error {
  constructor(
    public readonly artifactLabel: 'Command' | 'Standard' | 'Skill',
    public readonly versionId: string,
  ) {
    super(`${artifactLabel} version with ID ${versionId} not found`);
    this.name = 'ArtifactVersionNotFoundError';
  }
}

type ArtifactVersions = ActiveArtifactVersions;

type ArtifactChangeSet = {
  installed: ArtifactVersions;
  removed: ArtifactVersions;
};

type RepositoryPublishContext = {
  command: PublishArtifactsCommand;
  source: NonNullable<PublishArtifactsCommand['source']>;
  repositoryId: string;
  gitRepo: GitRepo;
  targets: Target[];
  requestedVersions: ArtifactVersions;
  activeRenderModes: RenderMode[];
  codingAgents: CodingAgent[];
};

type PrepareUnifiedDeploymentParams = {
  userId: UserId;
  organizationId: OrganizationId;
  gitRepo: GitRepo;
  targets: Target[];
  codingAgents: CodingAgent[];
  changeSet: ArtifactChangeSet;
  packagesSlugs: string[];
  artifactSpaceIds: Record<string, string>;
  artifactPackageIds: Record<string, string[]>;
  accessiblePackageIds: string[];
};

// Key extractors: the only thing that differs between the three artifact kinds.
const commandKey = (version: CommandVersion): string => version.recipeId;
const standardKey = (version: StandardVersion): string => version.standardId;
const skillKey = (version: SkillVersion): string => version.skillId;

/**
 * Unified usecase for publishing commands, standards, and skills together
 * Uses the unified renderArtifacts method for atomic updates
 */
export class PublishArtifactsUseCase implements IPublishArtifactsUseCase {
  constructor(
    private readonly commandsPort: ICommandsPort,
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
    private readonly lockFileService: PackmindLockFileService = new PackmindLockFileService(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: PublishArtifactsCommand,
  ): Promise<PublishArtifactsResponse> {
    const { source = 'ui' } = command;

    this.logger.info(
      'Publishing artifacts (unified commands + standards + skills)',
      {
        commandVersionIdsCount: command.commandVersionIds.length,
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
    await this.targetService.findByIdsInOrganization(
      command.targetIds,
      command.organizationId as OrganizationId,
    );

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

    const requestedVersions = await this.fetchRequestedVersions(command);

    // Process each repository with all its targets
    const distributions: Distribution[] = [];
    for (const [
      repositoryId,
      { repository: gitRepo, targets },
    ] of repositoryTargetsMap) {
      distributions.push(
        ...(await this.publishToRepository({
          command,
          source,
          repositoryId,
          gitRepo,
          targets,
          requestedVersions,
          activeRenderModes,
          codingAgents,
        })),
      );
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
        recipeCount: requestedVersions.commandVersions.length,
        standardCount: requestedVersions.standardVersions.length,
        source,
      }),
    );

    return { distributions };
  }

  private async fetchRequestedVersions(
    command: PublishArtifactsCommand,
  ): Promise<ArtifactVersions> {
    const [commandVersionsResult, standardVersionsResult, skillVersionsResult] =
      await Promise.allSettled([
        this.fetchVersions(
          command.commandVersionIds,
          (ids) => this.commandsPort.getCommandVersionsByIds(ids),
          'Command',
        ),
        this.fetchVersions(
          command.standardVersionIds,
          (ids) => this.standardsPort.getStandardVersionsByIds(ids),
          'Standard',
        ),
        this.fetchVersions(
          command.skillVersionIds ?? [],
          (ids) => this.skillsPort.getSkillVersionsByIds(ids),
          'Skill',
        ),
      ]);

    return {
      commandVersions: this.unwrapVersionsResult(commandVersionsResult),
      standardVersions: this.unwrapVersionsResult(standardVersionsResult),
      skillVersions: this.unwrapVersionsResult(skillVersionsResult),
    };
  }

  private async publishToRepository(
    ctx: RepositoryPublishContext,
  ): Promise<Distribution[]> {
    const {
      command,
      repositoryId,
      gitRepo,
      targets,
      requestedVersions,
      activeRenderModes,
      codingAgents,
    } = ctx;
    const organizationId = command.organizationId as OrganizationId;
    const userId = command.userId as UserId;
    const created: Distribution[] = [];

    try {
      this.logger.info('Processing repository with unified artifacts', {
        repositoryId,
        gitRepoOwner: gitRepo.owner,
        gitRepoName: gitRepo.repo,
        targetsCount: targets.length,
        commandsCount: requestedVersions.commandVersions.length,
        standardsCount: requestedVersions.standardVersions.length,
        skillsCount: requestedVersions.skillVersions.length,
      });

      const changeSet = await this.resolveArtifactChangeSet(
        organizationId,
        targets,
        command.packageIds,
        requestedVersions,
      );

      const {
        fileUpdatesPerTarget,
        renderModesPerTarget,
        addedPackmindSkills,
      } = await this.prepareUnifiedDeployment({
        userId,
        organizationId,
        gitRepo,
        targets,
        codingAgents,
        changeSet,
        packagesSlugs: command.packagesSlugs,
        artifactSpaceIds: command.artifactSpaceIds ?? {},
        artifactPackageIds: command.artifactPackageIds ?? {},
        accessiblePackageIds: command.packageIds.map(String),
      });

      const commitMessage = this.buildCommitMessage(
        requestedVersions,
        changeSet.installed,
        targets,
        addedPackmindSkills,
      );

      const firstTargetUpdates = fileUpdatesPerTarget.values().next().value;
      if (!firstTargetUpdates) {
        throw new Error('No file updates found for any target');
      }

      await this.createInProgressDistributions(
        command,
        targets,
        renderModesPerTarget,
        activeRenderModes,
        created,
      );
      await this.enqueuePublishJob(
        ctx,
        created[0],
        firstTargetUpdates,
        commitMessage,
      );

      return created;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to publish artifacts to repository', {
        repositoryId,
        error: errorMessage,
      });

      const failures = await this.createFailureDistributions(
        command,
        targets,
        activeRenderModes,
        errorMessage,
      );

      return [...created, ...failures];
    }
  }

  private async createInProgressDistributions(
    command: PublishArtifactsCommand,
    targets: Target[],
    renderModesPerTarget: Map<string, RenderMode[]>,
    activeRenderModes: RenderMode[],
    created: Distribution[],
  ): Promise<void> {
    for (const target of targets) {
      // Use per-target render modes from packmind.json, fallback to org-level
      const targetRenderModes =
        renderModesPerTarget.get(target.id) ?? activeRenderModes;
      const distribution = await this.createDistribution(
        command,
        target,
        targetRenderModes,
        DistributionStatus.in_progress,
      );
      created.push(distribution);

      this.logger.info('Created distribution record for target', {
        targetId: target.id,
        distributionId: distribution.id,
        status: DistributionStatus.in_progress,
      });
    }
  }

  private async createFailureDistributions(
    command: PublishArtifactsCommand,
    targets: Target[],
    activeRenderModes: RenderMode[],
    errorMessage: string,
  ): Promise<Distribution[]> {
    const distributions: Distribution[] = [];
    for (const target of targets) {
      distributions.push(
        await this.createDistribution(
          command,
          target,
          activeRenderModes,
          DistributionStatus.failure,
          errorMessage,
        ),
      );
    }
    return distributions;
  }

  private async enqueuePublishJob(
    ctx: RepositoryPublishContext,
    firstDistribution: Distribution,
    fileUpdates: FileUpdates,
    commitMessage: string,
  ): Promise<void> {
    const { command, repositoryId, gitRepo, targets, requestedVersions } = ctx;

    await this.publishArtifactsDelayedJob.addJob({
      distributionId: firstDistribution.id,
      organizationId: command.organizationId as OrganizationId,
      userId: command.userId as UserId,
      targetId: targets[0].id,
      gitRepoId: gitRepo.id,
      fileUpdates,
      commitMessage,
      commandVersionIds: requestedVersions.commandVersions.map((cv) => cv.id),
      standardVersionIds: requestedVersions.standardVersions.map((sv) => sv.id),
      skillVersionIds: requestedVersions.skillVersions.map((skv) => skv.id),
      activeRenderModes: ctx.activeRenderModes,
      packagesSlugs: command.packagesSlugs,
      source: ctx.source,
    });

    this.logger.info('Enqueued publish artifacts job for repository', {
      repositoryId,
      distributionId: firstDistribution.id,
      targetsCount: targets.length,
    });
  }

  private async createDistribution(
    command: PublishArtifactsCommand,
    target: Target,
    renderModes: RenderMode[],
    status: DistributionStatus,
    error?: string,
  ): Promise<Distribution> {
    const distribution: Distribution = {
      id: createDistributionId(uuidv4()),
      distributedPackages: [], // DistributedPackages are created by PublishPackagesUseCase
      createdAt: new Date().toISOString(),
      authorId: command.userId as UserId,
      organizationId: command.organizationId as OrganizationId,
      gitCommit: undefined,
      target,
      status,
      error,
      renderModes,
      source: 'app',
    };

    await this.distributionRepository.add(distribution);

    return distribution;
  }

  /**
   * Prepares unified deployment using renderArtifacts for all targets
   * Returns a map of targetId -> FileUpdates and names of newly added Packmind skills
   */
  private async prepareUnifiedDeployment({
    userId,
    organizationId,
    gitRepo,
    targets,
    codingAgents,
    changeSet,
    packagesSlugs,
    artifactSpaceIds,
    artifactPackageIds,
    accessiblePackageIds,
  }: PrepareUnifiedDeploymentParams): Promise<{
    fileUpdatesPerTarget: Map<string, FileUpdates>;
    renderModesPerTarget: Map<string, RenderMode[]>;
    addedPackmindSkills: string[];
  }> {
    const { installed, removed } = changeSet;
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

      // Call unified renderArtifacts with commands, standards, and skills
      const baseFileUpdates = await this.codingAgentPort.renderArtifacts({
        userId,
        organizationId,
        installed: {
          recipeVersions: installed.commandVersions,
          standardVersions: installed.standardVersions,
          skillVersions: installed.skillVersions,
        },
        removed: {
          recipeVersions: removed.commandVersions,
          standardVersions: removed.standardVersions,
          skillVersions: removed.skillVersions,
        },
        codingAgents: targetCodingAgents,
        existingFiles,
      });

      if (removedAgents.length > 0) {
        const {
          commandVersions: activeCommandVersions,
          standardVersions: activeStandardVersions,
          skillVersions: activeSkillVersions,
        } = await this.distributionRepository.findActiveVersionsByTarget(
          organizationId,
          target.id,
        );

        const cleanupFileUpdates =
          await this.codingAgentPort.generateAgentCleanupUpdatesForAgents({
            agents: removedAgents,
            artifacts: {
              recipeVersions: activeCommandVersions,
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

      // Fetched once per target: `cliVersion` tells the default-skills renderer
      // which CLI executable name the installation actually exposes, and the
      // same lock file is merged into the freshly built one below. This is a git
      // read, so it must not be fetched twice.
      const existingLockFile = await this.fetchExistingLockFile(
        gitRepo,
        target,
      );

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
          existingLockFile?.cliVersion,
        );
      }

      // Generate lock file and merge with existing to preserve inaccessible package entries
      const lockFile = this.lockFileService.buildLockFile({
        fileModifications: baseFileUpdates.createOrUpdate.filter(
          (f) => f.artifactType && f.artifactId,
        ),
        recipeVersions: installed.commandVersions,
        standardVersions: installed.standardVersions,
        skillVersions: installed.skillVersions,
        codingAgents: targetCodingAgents,
        packageSlugs: packagesSlugs,
        targetId: target.id,
        artifactSpaceIds,
        artifactPackageIds,
      });
      const mergedLockFile = this.lockFileService.mergeWithExistingLockFile(
        lockFile,
        existingLockFile,
        accessiblePackageIds,
      );
      const lockFileModification =
        this.lockFileService.createLockFileModification(mergedLockFile);
      baseFileUpdates.createOrUpdate.push(lockFileModification);

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

  /**
   * Fetches and parses the existing packmind-lock.json from the git repository
   * Returns null if the file doesn't exist or couldn't be parsed
   */
  private async fetchExistingLockFile(
    gitRepo: GitRepo,
    target: Target,
  ): Promise<PackmindLockFile | null> {
    const lockFilePath = getTargetPrefixedPath('packmind-lock.json', target);

    try {
      const fileData = await this.gitPort.getFileFromRepo(
        gitRepo,
        lockFilePath,
      );
      if (!fileData) {
        return null;
      }
      return JSON.parse(fileData.content) as PackmindLockFile;
    } catch {
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

  private unwrapVersionsResult<V>(result: PromiseSettledResult<V[]>): V[] {
    if (result.status === 'rejected') {
      throw result.reason;
    }
    return result.value;
  }

  private async fetchVersions<
    Id extends string,
    V extends { id: Id; name: string },
  >(
    requestedIds: Id[],
    fetchByIds: (ids: Id[]) => Promise<V[]>,
    artifactLabel: 'Command' | 'Standard' | 'Skill',
  ): Promise<V[]> {
    const fetchedVersions = await fetchByIds(requestedIds);
    const versionsById = new Map(
      fetchedVersions.map((version) => [version.id, version]),
    );

    return requestedIds
      .map((id) => {
        const version = versionsById.get(id);
        if (!version) {
          throw new ArtifactVersionNotFoundError(artifactLabel, id);
        }
        return version;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async resolveArtifactChangeSet(
    organizationId: OrganizationId,
    targets: Target[],
    packageIds: PackageId[],
    requested: ArtifactVersions,
  ): Promise<ArtifactChangeSet> {
    const activeVersionsByTargetId =
      await this.distributionRepository.findActiveVersionsByTargets(
        organizationId,
        targets.map((target) => target.id),
        packageIds,
      );

    const { installed, removed } = this.computeChangeSet(
      requested,
      activeVersionsByTargetId,
      targets,
    );

    return {
      installed: await this.hydrateInstalledArtifacts(installed),
      removed,
    };
  }

  private computeChangeSet(
    requested: ArtifactVersions,
    activeVersionsByTargetId: Map<TargetId, ActiveArtifactVersionsByScope>,
    targets: Target[],
  ): ArtifactChangeSet {
    const scopes = targets.map((target) =>
      activeVersionsByTargetId.get(target.id),
    );

    const commands = this.computeArtifactChanges(
      requested.commandVersions,
      scopes,
      (versions) => versions.commandVersions,
      commandKey,
    );
    const standards = this.computeArtifactChanges(
      requested.standardVersions,
      scopes,
      (versions) => versions.standardVersions,
      standardKey,
    );
    const skills = this.computeArtifactChanges(
      requested.skillVersions,
      scopes,
      (versions) => versions.skillVersions,
      skillKey,
    );

    const renamedSkillVersions = this.computeRenamedSkillVersions(
      skills.previousFromPackages,
      requested.skillVersions,
    );

    return {
      installed: {
        commandVersions: commands.installed,
        standardVersions: standards.installed,
        skillVersions: skills.installed,
      },
      removed: {
        commandVersions: commands.removed,
        standardVersions: standards.removed,
        skillVersions: [...skills.removed, ...renamedSkillVersions],
      },
    };
  }

  private computeArtifactChanges<V extends { version: number; name: string }>(
    requested: V[],
    scopes: (ActiveArtifactVersionsByScope | undefined)[],
    pick: (versions: ActiveArtifactVersions) => V[],
    keyOf: (version: V) => string,
  ): { previousFromPackages: V[]; installed: V[]; removed: V[] } {
    // Previously deployed versions across all packages (for combining)
    const previous = this.latestVersionPerArtifact(
      scopes.flatMap((scope) => (scope ? (pick(scope.all) ?? []) : [])),
      keyOf,
    );
    const previousFromPackages = this.latestVersionPerArtifact(
      scopes.flatMap((scope) =>
        scope ? (pick(scope.fromPackages) ?? []) : [],
      ),
      keyOf,
    );
    const combined = this.combineVersions(previous, requested, keyOf);

    const removedFromDeployedPackages = this.excludeByKey(
      previousFromPackages,
      requested,
      keyOf,
    );
    // Artifacts from other packages = in previous (all packages) but NOT from the deployed packages
    const fromOtherPackages = this.excludeByKey(
      previous,
      previousFromPackages,
      keyOf,
    );
    const removed = this.excludeByKey(
      removedFromDeployedPackages,
      fromOtherPackages,
      keyOf,
    );

    // Filter out removed artifacts from the installed list
    const installed = this.excludeByKey(combined, removed, keyOf);

    return { previousFromPackages, installed, removed };
  }

  private latestVersionPerArtifact<V extends { version: number }>(
    versions: V[],
    keyOf: (version: V) => string,
  ): V[] {
    const latestByKey = new Map<string, V>();
    for (const version of versions) {
      const existing = latestByKey.get(keyOf(version));
      if (!existing || version.version > existing.version) {
        latestByKey.set(keyOf(version), version);
      }
    }
    return Array.from(latestByKey.values());
  }

  private combineVersions<V extends { name: string }>(
    previous: V[],
    requested: V[],
    keyOf: (version: V) => string,
  ): V[] {
    const byKey = new Map<string, V>();
    previous.forEach((version) => byKey.set(keyOf(version), version));
    requested.forEach((version) => byKey.set(keyOf(version), version));
    return Array.from(byKey.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  private excludeByKey<V>(
    versions: V[],
    excluded: V[],
    keyOf: (version: V) => string,
  ): V[] {
    const excludedKeys = new Set(excluded.map(keyOf));
    return versions.filter((version) => !excludedKeys.has(keyOf(version)));
  }

  private async hydrateInstalledArtifacts(
    installed: ArtifactVersions,
  ): Promise<ArtifactVersions> {
    const standardIdsMissingRules = [
      ...new Set(
        installed.standardVersions
          .filter((sv) => sv.rules == null)
          .map((sv) => sv.standardId),
      ),
    ];
    const skillVersionIdsMissingFiles = installed.skillVersions
      .filter((sv) => sv.files === undefined)
      .map((sv) => sv.id);
    const [latestStandardVersionsWithRules, hydratedSkillVersions] =
      await Promise.all([
        standardIdsMissingRules.length > 0
          ? this.standardsPort.getLatestStandardVersionsWithRules(
              standardIdsMissingRules,
            )
          : Promise.resolve<StandardVersion[]>([]),
        skillVersionIdsMissingFiles.length > 0
          ? this.skillsPort.getSkillVersionsByIds(skillVersionIdsMissingFiles)
          : Promise.resolve<SkillVersion[]>([]),
      ]);
    const missingRulesByStandardId = new Map(
      latestStandardVersionsWithRules.map((sv) => [
        sv.standardId,
        sv.rules ?? [],
      ]),
    );
    const missingFilesByVersionId = new Map(
      hydratedSkillVersions.map((sv) => [sv.id, sv.files ?? []]),
    );

    return {
      commandVersions: installed.commandVersions,
      standardVersions: installed.standardVersions.map((sv) =>
        sv.rules != null
          ? sv
          : {
              ...sv,
              rules: missingRulesByStandardId.get(sv.standardId) ?? [],
            },
      ),
      skillVersions: installed.skillVersions.map((sv) =>
        sv.files !== undefined
          ? sv
          : { ...sv, files: missingFilesByVersionId.get(sv.id) ?? [] },
      ),
    };
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
    requested: ArtifactVersions,
    installed: ArtifactVersions,
    targets: Target[],
    addedPackmindSkills: string[],
  ): string {
    const { commandVersions, standardVersions, skillVersions } = requested;
    const parts: string[] = [
      '[PACKMIND] Update artifacts (commands + standards + skills)',
      '',
    ];

    if (commandVersions.length > 0) {
      parts.push(`- Updated ${commandVersions.length} command(s)`);
      parts.push(
        `- Total commands in repository: ${installed.commandVersions.length}`,
      );
    }

    if (standardVersions.length > 0) {
      parts.push(`- Updated ${standardVersions.length} standard(s)`);
      parts.push(
        `- Total standards in repository: ${installed.standardVersions.length}`,
      );
    }

    if (skillVersions.length > 0) {
      parts.push(`- Updated ${skillVersions.length} skill(s)`);
      parts.push(
        `- Total skills in repository: ${installed.skillVersions.length}`,
      );
    }

    if (addedPackmindSkills.length > 0) {
      parts.push(
        `- Added ${addedPackmindSkills.length} Packmind skill(s): ${addedPackmindSkills.join(', ')}`,
      );
    }

    parts.push(`- Targets: ${targets.map((t) => t.name).join(', ')}`);
    parts.push('');

    if (commandVersions.length > 0) {
      parts.push('Commands updated:');
      commandVersions.forEach((cv) => {
        parts.push(`- ${cv.name} (${cv.slug}) v${cv.version}`);
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
   *
   * `cliVersion` comes from the target repository's existing lock file so the
   * rendered skill content names the CLI executable that installation actually
   * has (`packmind-cli` before 0.24.0, `packmind` from then on). It stays
   * undefined for a repository with no lock file - that repository has never
   * been installed by a CLI, so there is no legacy expectation to honour and
   * the canonical name is correct.
   * Returns the names of newly added Packmind skills (skills not already in the repository).
   */
  private async includeDefaultSkills(
    userId: UserId,
    organizationId: OrganizationId,
    fileUpdates: FileUpdates,
    gitRepo: GitRepo,
    targetCodingAgents: CodingAgent[],
    cliVersion: string | undefined,
  ): Promise<string[]> {
    const result = await this.deployDefaultSkillsUseCase.execute({
      userId,
      organizationId,
      agents: targetCodingAgents,
      excludeDeprecated: true,
      cliVersion,
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
