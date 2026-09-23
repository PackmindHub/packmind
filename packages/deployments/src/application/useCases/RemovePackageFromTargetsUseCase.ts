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
  CommandVersionId,
  StandardVersionId,
  SkillVersionId,
  Package,
  Target,
  GitRepo,
  CommandVersion,
  StandardVersion,
  SkillVersion,
  Distribution,
  DistributionStatus,
  DistributionOperation,
  GitCommit,
  createDistributionId,
  createDistributedPackageId,
  ICommandsPort,
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
import { TargetResolutionMissingError } from '../../domain/errors/TargetResolutionMissingError';
import { TargetNotFoundError } from '../../domain/errors/TargetNotFoundError';
import { NoFileUpdatesResolvedError } from '../../domain/errors/NoFileUpdatesResolvedError';
import { GitRepositoryNotFoundError } from '../../domain/errors/GitRepositoryNotFoundError';

const origin = 'RemovePackageFromTargetsUseCase';

type TargetRemovalData = {
  fileUpdates: FileUpdates;
  removedRecipeVersions: CommandVersion[];
  removedStandardVersions: StandardVersion[];
  removedSkillVersions: SkillVersion[];
};

export class RemovePackageFromTargetsUseCase implements IRemovePackageFromTargetsUseCase {
  constructor(
    private readonly packageService: PackageService,
    private readonly targetService: TargetService,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly commandsPort: ICommandsPort,
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
    const pkg = await this.packageService.findByIdInOrganization(
      command.packageId,
      command.organizationId as OrganizationId,
    );
    if (!pkg) {
      throw new PackageNotFoundError(command.packageId);
    }

    await this.targetService.findByIdsInOrganization(
      command.targetIds,
      command.organizationId as OrganizationId,
    );

    const artifactResolutions = await this.resolveArtifactsForTargets(
      command.organizationId as OrganizationId,
      command.targetIds,
      pkg,
    );

    const activeRenderModes =
      await this.renderModeConfigurationService.getActiveRenderModes(
        command.organizationId as OrganizationId,
      );
    const codingAgents =
      this.renderModeConfigurationService.mapRenderModesToCodingAgents(
        activeRenderModes,
      );

    const repositoryTargetsMap = await this.groupTargetsByRepository(
      command.targetIds,
    );

    const results: RemovePackageFromTargetsResult[] = [];
    for (const [
      repositoryId,
      { repository: gitRepo, targets },
    ] of repositoryTargetsMap) {
      try {
        const removalDataPerTarget = await this.prepareRemovalDeployment(
          command.userId as UserId,
          command.organizationId as OrganizationId,
          artifactResolutions,
          targets,
          gitRepo,
          codingAgents,
          pkg.slug,
        );
        const commitMessage = this.buildRemovalCommitMessage(pkg.slug, targets);

        let gitCommit: GitCommit | undefined;
        let distributionStatus = DistributionStatus.success;

        try {
          const firstTargetData = removalDataPerTarget.values().next().value;
          if (!firstTargetData) {
            throw new NoFileUpdatesResolvedError(pkg.id);
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

        for (const target of targets) {
          const targetData = removalDataPerTarget.get(target.id);
          if (!targetData) {
            throw new TargetResolutionMissingError('removal_data', target.id);
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
   * Renders each target with the remaining artifacts as "installed" and the
   * artifacts exclusive to the removed package as "removed".
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
        throw new TargetResolutionMissingError(
          'artifact_resolution',
          target.id,
        );
      }

      const existingPackmindJson = await this.fetchExistingPackmindJson(
        gitRepo,
        target,
      );
      const existingPackages = existingPackmindJson?.packages ?? {};

      // An explicit empty array means "no agents"; undefined falls back to the org-level list.
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

      const existingFiles = await fetchExistingFilesFromGit(
        this.gitPort,
        gitRepo,
        target,
        targetCodingAgents,
        this.logger,
      );

      const installedCommandVersions = await this.fetchCommandVersionsByIds(
        resolution.remainingArtifacts.recipeVersionIds,
      );
      const installedStandardVersions = await this.fetchStandardVersionsByIds(
        resolution.remainingArtifacts.standardVersionIds,
      );
      const installedSkillVersions = await this.fetchSkillVersionsByIds(
        resolution.remainingArtifacts.skillVersionIds,
      );

      const removedCommandVersions = await this.fetchCommandVersionsByIds(
        resolution.exclusiveArtifacts.recipeVersionIds,
      );
      const removedStandardVersions = await this.fetchStandardVersionsByIds(
        resolution.exclusiveArtifacts.standardVersionIds,
      );
      const removedSkillVersions = await this.fetchSkillVersionsByIds(
        resolution.exclusiveArtifacts.skillVersionIds,
      );

      const baseFileUpdates = await this.codingAgentPort.renderArtifacts({
        userId,
        organizationId,
        installed: {
          recipeVersions: installedCommandVersions,
          standardVersions: installedStandardVersions,
          skillVersions: installedSkillVersions,
        },
        removed: {
          recipeVersions: removedCommandVersions,
          standardVersions: removedStandardVersions,
          skillVersions: removedSkillVersions,
        },
        codingAgents: targetCodingAgents,
        existingFiles,
      });

      const configFile =
        this.packmindConfigService.createRemovalConfigFileModification(
          packageSlugToRemove,
          existingPackages,
          existingPackmindJson?.agents,
        );
      baseFileUpdates.createOrUpdate.push(configFile);

      const prefixedFileUpdates = applyTargetPrefixingToFileUpdates(
        baseFileUpdates,
        target,
        this.logger,
      );

      removalDataPerTarget.set(target.id, {
        fileUpdates: prefixedFileUpdates,
        removedRecipeVersions: removedCommandVersions,
        removedStandardVersions,
        removedSkillVersions,
      });

      this.logger.debug('Prepared removal deployment for target', {
        targetId: target.id,
        filesCreatedOrUpdatedCount: prefixedFileUpdates.createOrUpdate.length,
        filesDeletedCount: prefixedFileUpdates.delete.length,
        removedRecipes: removedCommandVersions.length,
        removedStandards: removedStandardVersions.length,
        removedSkills: removedSkillVersions.length,
      });
    }

    return removalDataPerTarget;
  }

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

  private async groupTargetsByRepository(
    targetIds: TargetId[],
  ): Promise<Map<string, { repository: GitRepo; targets: Target[] }>> {
    const map = new Map<string, { repository: GitRepo; targets: Target[] }>();

    for (const targetId of targetIds) {
      const target = await this.targetService.findById(targetId);
      if (!target) {
        throw new TargetNotFoundError(targetId);
      }

      const repository = await this.gitPort.getRepositoryById(target.gitRepoId);
      if (!repository) {
        throw new GitRepositoryNotFoundError(target.gitRepoId);
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

  private async fetchCommandVersionsByIds(
    recipeVersionIds: CommandVersionId[],
  ): Promise<CommandVersion[]> {
    const versions: CommandVersion[] = [];
    for (const id of recipeVersionIds) {
      const version = await this.commandsPort.getCommandVersionById(id);
      if (version) {
        versions.push(version);
      }
    }
    return versions.sort((a, b) => a.name.localeCompare(b.name));
  }

  private async fetchStandardVersionsByIds(
    standardVersionIds: StandardVersionId[],
  ): Promise<StandardVersion[]> {
    const versions: StandardVersion[] = [];
    for (const id of standardVersionIds) {
      const version = await this.standardsPort.getStandardVersionById(id);
      if (version) {
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

  private async createDistribution(
    command: RemovePackageFromTargetsCommand,
    target: Target,
    activeRenderModes: RenderMode[],
    status: DistributionStatus,
    pkg: Package,
    removedCommandVersions: CommandVersion[],
    removedStandardVersions: StandardVersion[],
    removedSkillVersions: SkillVersion[],
    gitCommit?: GitCommit,
    error?: string,
  ): Promise<Distribution> {
    const distributionId = createDistributionId(uuidv4());

    // Insert the distribution first: distributed_packages.distribution_id references it.
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

    if (removedStandardVersions.length > 0) {
      await this.distributedPackageRepository.addStandardVersions(
        distributedPackageId,
        removedStandardVersions.map((sv) => sv.id),
      );
    }

    if (removedCommandVersions.length > 0) {
      await this.distributedPackageRepository.addCommandVersions(
        distributedPackageId,
        removedCommandVersions.map((rv) => rv.id),
      );
    }

    if (removedSkillVersions.length > 0) {
      await this.distributedPackageRepository.addSkillVersions(
        distributedPackageId,
        removedSkillVersions.map((sv) => sv.id),
      );
    }

    return distribution;
  }

  /**
   * Only each package's latest distribution on the target counts: if that one was a
   * removal, the package is treated as absent. Exclusive artifacts are those the
   * removed package does not share with the packages that remain.
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

    const sortedDistributions = [...distributions].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const latestDistributionPerPackage = new Map<
      string,
      {
        operation: DistributionOperation;
        recipeVersions: CommandVersion[];
        standardVersions: StandardVersion[];
        skillVersions: SkillVersion[];
      }
    >();

    for (const distribution of sortedDistributions) {
      for (const distributedPackage of distribution.distributedPackages) {
        // Sorted newest-first, so the first occurrence is the latest.
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

    const removedPackageCommandVersionIds = new Set<CommandVersionId>();
    const removedPackageStandardVersionIds = new Set<StandardVersionId>();
    const removedPackageSkillVersionIds = new Set<SkillVersionId>();
    const remainingPackageCommandVersionIds = new Set<CommandVersionId>();
    const remainingPackageStandardVersionIds = new Set<StandardVersionId>();
    const remainingPackageSkillVersionIds = new Set<SkillVersionId>();

    for (const [packageId, data] of latestDistributionPerPackage) {
      if (data.operation === 'remove') {
        continue;
      }

      const isRemovedPackage = packageId === packageToRemove.id;

      for (const recipeVersion of data.recipeVersions) {
        if (isRemovedPackage) {
          removedPackageCommandVersionIds.add(recipeVersion.id);
        } else {
          remainingPackageCommandVersionIds.add(recipeVersion.id);
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

    const exclusiveCommandVersionIds = Array.from(
      removedPackageCommandVersionIds,
    ).filter((id) => !remainingPackageCommandVersionIds.has(id));

    const exclusiveStandardVersionIds = Array.from(
      removedPackageStandardVersionIds,
    ).filter((id) => !remainingPackageStandardVersionIds.has(id));

    const exclusiveSkillVersionIds = Array.from(
      removedPackageSkillVersionIds,
    ).filter((id) => !remainingPackageSkillVersionIds.has(id));

    return {
      targetId,
      exclusiveArtifacts: {
        recipeVersionIds: exclusiveCommandVersionIds,
        // Same value under the command-named field the contract also requires.
        commandVersionIds: exclusiveCommandVersionIds,
        standardVersionIds: exclusiveStandardVersionIds,
        skillVersionIds: exclusiveSkillVersionIds,
      },
      remainingArtifacts: {
        recipeVersionIds: Array.from(remainingPackageCommandVersionIds),
        // Same value under the command-named field the contract also requires.
        commandVersionIds: Array.from(remainingPackageCommandVersionIds),
        standardVersionIds: Array.from(remainingPackageStandardVersionIds),
        skillVersionIds: Array.from(remainingPackageSkillVersionIds),
      },
    };
  }
}
