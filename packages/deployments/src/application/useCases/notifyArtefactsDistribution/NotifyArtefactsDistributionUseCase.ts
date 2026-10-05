import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  createDistributedPackageId,
  createDistributionId,
  createPackageId,
  createCommandId,
  createSkillId,
  createSpaceId,
  createStandardId,
  Distribution,
  DistributedPackage,
  DistributionRecordedEvent,
  DistributionStatus,
  IAccountsPort,
  INotifyArtefactsDistribution,
  ICommandsPort,
  ISkillsPort,
  IStandardsPort,
  ISpacesPort,
  NotifyArtefactsDistributionCommand,
  NotifyArtefactsDistributionResponse,
  OrganizationId,
  PackageId,
  PackmindLockFileEntry,
  CommandVersionId,
  RenderMode,
  SkillVersionId,
  StandardVersionId,
  SpaceId,
  Target,
  UserId,
  WILDCARD_VERSION_SPEC,
  parsePackageVersionSpec,
} from '@packmind/types';
import { PackageService } from '../../services/PackageService';
import { PackageReleaseService } from '../../services/PackageReleaseService';
import { RenderModeConfigurationService } from '../../services/RenderModeConfigurationService';
import { v4 as uuidv4 } from 'uuid';
import { IDistributedPackageRepository } from '../../../domain/repositories/IDistributedPackageRepository';
import { IDistributionRepository } from '../../../domain/repositories/IDistributionRepository';
import { TargetResolutionService } from '../../services/TargetResolutionService';

const origin = 'NotifyArtefactsDistributionUseCase';

type PackageVersionRecord = Pick<
  DistributedPackage,
  'versionSpec' | 'latestReleaseVersion'
>;

const UNRECORDED: PackageVersionRecord = {
  versionSpec: null,
  latestReleaseVersion: null,
};

type DistributedPackageWithVersionIds = DistributedPackage & {
  _standardVersionIds: StandardVersionId[];
  _recipeVersionIds: CommandVersionId[];
  _skillVersionIds: SkillVersionId[];
};

export class NotifyArtefactsDistributionUseCase
  extends AbstractMemberUseCase<
    NotifyArtefactsDistributionCommand,
    NotifyArtefactsDistributionResponse
  >
  implements INotifyArtefactsDistribution
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly targetResolutionService: TargetResolutionService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly packageService: PackageService,
    private readonly spacesPort: ISpacesPort,
    private readonly packageReleaseService: PackageReleaseService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: NotifyArtefactsDistributionCommand & MemberContext,
  ): Promise<NotifyArtefactsDistributionResponse> {
    const { gitRemoteUrl, gitBranch, relativePath, packmindLockFile } = command;

    const userId = command.user.id;
    const organizationId = command.organization.id;

    this.logger.info('Processing artefacts distribution notification', {
      gitRemoteUrl,
      gitBranch,
      relativePath,
      artifactCount: Object.keys(packmindLockFile.artifacts).length,
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

    const renderModes =
      this.renderModeConfigurationService.mapCodingAgentsToRenderModes(
        packmindLockFile.agents,
      );

    const distributionId = createDistributionId(uuidv4());
    const distributedPackages = await this.buildDistributedPackagesFromLockFile(
      {
        distributionId,
        lockFileArtifacts: packmindLockFile.artifacts,
        previouslyActivePackageIds,
        organizationId,
        packageVersions: command.packageVersions,
      },
    );

    await this.saveDistribution({
      distributionId,
      distributedPackages,
      target,
      organizationId,
      authorId: userId,
      renderModes,
    });

    this.eventEmitterService.emit(
      new DistributionRecordedEvent({
        userId,
        organizationId,
        source: 'cli',
        repositoryId: target.gitRepoId,
        branch: gitBranch,
      }),
    );

    this.logger.info(
      'Artefacts distribution notification completed successfully',
      {
        distributionId,
        distributedPackageCount: distributedPackages.length,
      },
    );

    return { deploymentId: distributionId };
  }

  private async getPreviouslyActivePackageIds(
    organizationId: OrganizationId,
    targetId: Target['id'],
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

  private async buildDistributedPackagesFromLockFile(params: {
    distributionId: string;
    lockFileArtifacts: Record<string, PackmindLockFileEntry>;
    previouslyActivePackageIds: PackageId[];
    organizationId: OrganizationId;
    packageVersions?: Record<string, string>;
  }): Promise<DistributedPackageWithVersionIds[]> {
    const { distributionId, lockFileArtifacts, previouslyActivePackageIds } =
      params;
    const distributedPackages: DistributedPackageWithVersionIds[] = [];

    const packageArtifactMap =
      this.groupArtifactsByPackageId(lockFileArtifacts);
    const currentPackageIds = new Set(packageArtifactMap.keys());
    const versionRecords = await this.resolvePackageVersions(
      [...currentPackageIds].map((id) => createPackageId(id)),
      params.organizationId,
      params.packageVersions,
    );

    for (const [packageId, entries] of packageArtifactMap) {
      const standardVersionIds = await this.resolveStandardVersionIds(entries);
      const recipeVersionIds = await this.resolveCommandVersionIds(entries);
      const skillVersionIds = await this.resolveSkillVersionIds(entries);

      distributedPackages.push({
        id: createDistributedPackageId(uuidv4()),
        distributionId: createDistributionId(distributionId),
        packageId: createPackageId(packageId),
        standardVersions: [],
        recipeVersions: [],
        skillVersions: [],
        operation: 'add',
        ...(versionRecords.get(createPackageId(packageId)) ?? UNRECORDED),
        _standardVersionIds: standardVersionIds,
        _recipeVersionIds: recipeVersionIds,
        _skillVersionIds: skillVersionIds,
      });
    }

    for (const prevPackageId of previouslyActivePackageIds) {
      if (!currentPackageIds.has(String(prevPackageId))) {
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
          // The package is leaving the destination; it asks for no version at all.
          versionSpec: null,
          latestReleaseVersion: null,
          _standardVersionIds: [],
          _recipeVersionIds: [],
          _skillVersionIds: [],
        });
      }
    }

    return distributedPackages;
  }

  private async resolvePackageVersions(
    packageIds: PackageId[],
    organizationId: OrganizationId,
    packageVersions: Record<string, string> | undefined,
  ): Promise<Map<PackageId, PackageVersionRecord>> {
    const records = new Map<PackageId, PackageVersionRecord>();
    if (!packageVersions || packageIds.length === 0) return records;

    const packages = await this.packageService.getPackagesByIdsInOrganization(
      packageIds,
      organizationId,
    );

    const spaceSlugs = new Map<SpaceId, string | null>();
    const wildcardPackageIds: PackageId[] = [];
    for (const pkg of packages) {
      const spaceId = pkg.spaceId as SpaceId;
      if (!spaceSlugs.has(spaceId)) {
        const space = await this.spacesPort.getSpaceById(spaceId);
        spaceSlugs.set(spaceId, space?.slug ?? null);
      }
      const spaceSlug = spaceSlugs.get(spaceId);
      const raw =
        (spaceSlug
          ? packageVersions[`@${spaceSlug}/${pkg.slug}`]
          : undefined) ?? packageVersions[pkg.slug];
      const spec = parsePackageVersionSpec(raw);
      if (!spec) continue;

      if (spec.kind === 'exact') {
        records.set(pkg.id, {
          versionSpec: spec.version,
          latestReleaseVersion: null,
        });
      } else {
        records.set(pkg.id, {
          versionSpec: WILDCARD_VERSION_SPEC,
          latestReleaseVersion: null,
        });
        wildcardPackageIds.push(pkg.id);
      }
    }

    if (wildcardPackageIds.length > 0) {
      const latest =
        await this.packageReleaseService.findLatestByPackageIds(
          wildcardPackageIds,
        );
      for (const packageId of wildcardPackageIds) {
        const release = latest.get(packageId);
        if (release) {
          records.set(packageId, {
            versionSpec: WILDCARD_VERSION_SPEC,
            latestReleaseVersion: release.version,
          });
        }
      }
    }

    return records;
  }

  private groupArtifactsByPackageId(
    artifacts: Record<string, PackmindLockFileEntry>,
  ): Map<string, PackmindLockFileEntry[]> {
    const map = new Map<string, PackmindLockFileEntry[]>();
    for (const entry of Object.values(artifacts)) {
      for (const packageId of entry.packageIds) {
        if (!map.has(packageId)) {
          map.set(packageId, []);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- key existence checked by `has` above
        map.get(packageId)!.push(entry);
      }
    }
    return map;
  }

  private async resolveStandardVersionIds(
    entries: PackmindLockFileEntry[],
  ): Promise<StandardVersionId[]> {
    const versionIds: StandardVersionId[] = [];
    for (const entry of entries) {
      if (entry.type !== 'standard') continue;
      const spaceId = createSpaceId(entry.spaceId);
      const version = await this.standardsPort.getStandardVersionByNumber(
        createStandardId(entry.id),
        entry.version,
        [spaceId],
      );
      if (version) {
        versionIds.push(version.id);
      }
    }
    return versionIds;
  }

  private async resolveCommandVersionIds(
    entries: PackmindLockFileEntry[],
  ): Promise<CommandVersionId[]> {
    const versionIds: CommandVersionId[] = [];
    for (const entry of entries) {
      if (entry.type !== 'command') continue;
      const spaceId = createSpaceId(entry.spaceId);
      const version = await this.commandsPort.getCommandVersion(
        createCommandId(entry.id),
        entry.version,
        [spaceId],
      );
      if (version) {
        versionIds.push(version.id);
      }
    }
    return versionIds;
  }

  private async resolveSkillVersionIds(
    entries: PackmindLockFileEntry[],
  ): Promise<SkillVersionId[]> {
    const versionIds: SkillVersionId[] = [];
    for (const entry of entries) {
      if (entry.type !== 'skill') continue;
      const spaceId = createSpaceId(entry.spaceId);
      const version = await this.skillsPort.getSkillVersionByNumber(
        createSkillId(entry.id),
        entry.version,
        [spaceId],
      );
      if (version) {
        versionIds.push(version.id);
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
    this.logger.info('Created artefacts distribution', { distributionId });

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
        await this.distributedPackageRepository.addCommandVersions(
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
