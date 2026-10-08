import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import {
  CommandVersionId,
  createCommandId,
  createDistributedPackageId,
  createDistributionId,
  createPackageId,
  createSkillId,
  createSpaceId,
  createStandardId,
  DistributedPackage,
  Distribution,
  DistributionId,
  DistributionOperation,
  DistributionRecordedEvent,
  DistributionSource,
  DistributionStatus,
  hasRecordedPackageVersions,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  LockFileSyncWarning,
  NotifyArtefactsDistributionResponse,
  OrganizationId,
  Package,
  PackageId,
  PackmindLockFile,
  PackmindLockFileEntry,
  parsePackageVersionSpec,
  SkillVersionId,
  SpaceId,
  StandardVersionId,
  Target,
  UserId,
  WILDCARD_VERSION_SPEC,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { IDistributedPackageRepository } from '../../domain/repositories/IDistributedPackageRepository';
import { PackageReleaseService } from './PackageReleaseService';
import { PackageService } from './PackageService';
import { RenderModeConfigurationService } from './RenderModeConfigurationService';
import { parsePackageSlug } from './packageSlugHelpers';

const origin = 'LockFileDistributionRecorder';

type DistributedPackageWithVersionIds = DistributedPackage & {
  _standardVersionIds: StandardVersionId[];
  _recipeVersionIds: CommandVersionId[];
  _skillVersionIds: SkillVersionId[];
};

export type RecordLockFileCommand = {
  target: Target;
  lockFile: PackmindLockFile;
  organizationId: OrganizationId;
  userId: UserId;
  source: DistributionSource;
  branch: string;
  packageVersions?: Record<string, string>;
};

export class LockFileDistributionRecorder {
  constructor(
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly distributionRepository: IDistributionRepository,
    private readonly distributedPackageRepository: IDistributedPackageRepository,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    private readonly packageService: PackageService,
    private readonly packageReleaseService: PackageReleaseService,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async record(
    command: RecordLockFileCommand,
  ): Promise<NotifyArtefactsDistributionResponse> {
    const { target, organizationId } = command;
    const warnings: LockFileSyncWarning[] = [];

    const lockedPackages = await this.readLockedPackages(command, warnings);
    const declaredPackageIds = await this.readDeclaredPackageIds(command);
    const activePackages =
      await this.distributionRepository.findActiveDistributedPackagesByTarget(
        organizationId,
        target.id,
      );

    const distributionId = createDistributionId(uuidv4());
    const additions = await this.buildAdditions(
      distributionId,
      command.lockFile,
      lockedPackages,
    );
    const removals = activePackages
      .filter(
        (active) =>
          !lockedPackages.has(active.packageId) &&
          !declaredPackageIds.has(active.packageId),
      )
      .map((active) =>
        newDistributedPackage(distributionId, active.packageId, 'remove'),
      );

    const unchanged =
      removals.length === 0 &&
      additions.every((addition) => isAlreadyActive(addition, activePackages));
    if (unchanged) {
      this.logger.info('Lock file matches the distribution state', {
        targetId: target.id,
      });
      return { deploymentId: null, status: 'unchanged', warnings };
    }

    await this.saveDistribution(
      distributionId,
      [...additions, ...removals],
      command,
    );

    this.eventEmitterService.emit(
      new DistributionRecordedEvent({
        userId: command.userId,
        organizationId,
        source: command.source === 'cli' ? 'cli' : 'ui',
        repositoryId: target.gitRepoId,
        branch: command.branch,
      }),
    );

    this.logger.info('Recorded distribution from lock file', {
      distributionId,
      targetId: target.id,
      addedCount: additions.length,
      removedCount: removals.length,
    });

    return { deploymentId: distributionId, status: 'updated', warnings };
  }

  private async readLockedPackages(
    command: RecordLockFileCommand,
    warnings: LockFileSyncWarning[],
  ): Promise<Map<PackageId, string | undefined>> {
    const { lockFile, organizationId, userId } = command;

    if (!hasRecordedPackageVersions(lockFile)) {
      return this.readPackagesFromArtifacts(
        lockFile.artifacts,
        organizationId,
        command.packageVersions,
      );
    }

    const packagesBySlug = await this.resolvePackagesBySlug(
      Object.keys(lockFile.packages),
      organizationId,
      userId,
    );

    const lockedPackages: Map<PackageId, string | undefined> = new Map();
    for (const [slug, spec] of Object.entries(lockFile.packages)) {
      const pkg = packagesBySlug.get(slug);
      if (pkg) {
        lockedPackages.set(pkg.id, spec);
      } else {
        warnings.push({ type: 'unknown_package', packageSlug: slug });
      }
    }
    return lockedPackages;
  }

  private async readPackagesFromArtifacts(
    artifacts: Record<string, PackmindLockFileEntry>,
    organizationId: OrganizationId,
    packageVersions: Record<string, string> | undefined,
  ): Promise<Map<PackageId, string | undefined>> {
    const packageIds = [...groupArtifactsByPackageId(artifacts).keys()].map(
      (id) => createPackageId(id),
    );
    const lockedPackages: Map<PackageId, string | undefined> = new Map(
      packageIds.map((id) => [id, undefined]),
    );
    if (!packageVersions || packageIds.length === 0) return lockedPackages;

    const packages = await this.packageService.getPackagesByIdsInOrganization(
      packageIds,
      organizationId,
    );
    for (const pkg of packages) {
      const space = await this.spacesPort.getSpaceById(pkg.spaceId as SpaceId);
      const scopedSpec = space
        ? packageVersions[`@${space.slug}/${pkg.slug}`]
        : undefined;
      lockedPackages.set(pkg.id, scopedSpec ?? packageVersions[pkg.slug]);
    }
    return lockedPackages;
  }

  private async readDeclaredPackageIds(
    command: RecordLockFileCommand,
  ): Promise<Set<PackageId>> {
    const declaredPackages = await this.resolvePackagesBySlug(
      Object.keys(command.packageVersions ?? {}),
      command.organizationId,
      command.userId,
    );
    return new Set([...declaredPackages.values()].map((pkg) => pkg.id));
  }

  private async resolvePackagesBySlug(
    slugs: string[],
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Map<string, Package>> {
    const packagesBySlug = new Map<string, Package>();
    if (slugs.length === 0) return packagesBySlug;

    const orgPackages =
      await this.packageService.getPackagesByOrganizationId(organizationId);
    const spaceIdBySlug = new Map<string | null, SpaceId | null>();

    for (const slug of slugs) {
      const { spaceSlug, packageSlug } = parsePackageSlug(slug);
      if (!spaceIdBySlug.has(spaceSlug)) {
        spaceIdBySlug.set(
          spaceSlug,
          await this.resolveSpaceId(spaceSlug, organizationId, userId),
        );
      }
      const spaceId = spaceIdBySlug.get(spaceSlug);
      const pkg = orgPackages.find(
        (candidate) =>
          candidate.slug === packageSlug && candidate.spaceId === spaceId,
      );
      if (pkg) {
        packagesBySlug.set(slug, pkg);
      }
    }
    return packagesBySlug;
  }

  private async resolveSpaceId(
    spaceSlug: string | null,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<SpaceId | null> {
    if (spaceSlug === null) {
      const { defaultSpace } = await this.spacesPort.getDefaultSpace({
        userId,
        organizationId,
      });
      return defaultSpace.id;
    }
    const space = await this.spacesPort.getSpaceBySlug(
      spaceSlug,
      organizationId,
    );
    return space?.id ?? null;
  }

  private async buildAdditions(
    distributionId: DistributionId,
    lockFile: PackmindLockFile,
    lockedPackages: Map<PackageId, string | undefined>,
  ): Promise<DistributedPackageWithVersionIds[]> {
    const artifactsByPackageId = groupArtifactsByPackageId(lockFile.artifacts);
    const versions = await this.resolvePackageVersions(lockedPackages);

    const additions: DistributedPackageWithVersionIds[] = [];
    for (const packageId of lockedPackages.keys()) {
      additions.push({
        ...newDistributedPackage(distributionId, packageId, 'add'),
        ...versions.get(packageId),
        ...(await this.resolveArtifactVersionIds(
          artifactsByPackageId.get(packageId) ?? [],
        )),
      });
    }
    return additions;
  }

  private async resolvePackageVersions(
    lockedPackages: Map<PackageId, string | undefined>,
  ): Promise<
    Map<
      PackageId,
      Pick<DistributedPackage, 'versionSpec' | 'latestReleaseVersion'>
    >
  > {
    const specs = [...lockedPackages].flatMap(([packageId, raw]) => {
      const spec = parsePackageVersionSpec(raw);
      return spec ? [{ packageId, spec }] : [];
    });

    const wildcardPackageIds = specs
      .filter(({ spec }) => spec.kind === 'wildcard')
      .map(({ packageId }) => packageId);
    const latestReleases =
      wildcardPackageIds.length > 0
        ? await this.packageReleaseService.findLatestByPackageIds(
            wildcardPackageIds,
          )
        : new Map();

    return new Map(
      specs.map(({ packageId, spec }) => [
        packageId,
        spec.kind === 'exact'
          ? { versionSpec: spec.version, latestReleaseVersion: null }
          : {
              versionSpec: WILDCARD_VERSION_SPEC,
              latestReleaseVersion:
                latestReleases.get(packageId)?.version ?? null,
            },
      ]),
    );
  }

  private async resolveArtifactVersionIds(
    entries: PackmindLockFileEntry[],
  ): Promise<
    Pick<
      DistributedPackageWithVersionIds,
      '_standardVersionIds' | '_recipeVersionIds' | '_skillVersionIds'
    >
  > {
    const versionIds: Pick<
      DistributedPackageWithVersionIds,
      '_standardVersionIds' | '_recipeVersionIds' | '_skillVersionIds'
    > = {
      _standardVersionIds: [],
      _recipeVersionIds: [],
      _skillVersionIds: [],
    };

    for (const entry of entries) {
      const spaceIds = [createSpaceId(entry.spaceId)];
      switch (entry.type) {
        case 'standard': {
          const version = await this.standardsPort.getStandardVersionByNumber(
            createStandardId(entry.id),
            entry.version,
            spaceIds,
          );
          if (version) versionIds._standardVersionIds.push(version.id);
          break;
        }
        case 'command': {
          const version = await this.commandsPort.getCommandVersion(
            createCommandId(entry.id),
            entry.version,
            spaceIds,
          );
          if (version) versionIds._recipeVersionIds.push(version.id);
          break;
        }
        case 'skill': {
          const version = await this.skillsPort.getSkillVersionByNumber(
            createSkillId(entry.id),
            entry.version,
            spaceIds,
          );
          if (version) versionIds._skillVersionIds.push(version.id);
          break;
        }
      }
    }
    return versionIds;
  }

  private async saveDistribution(
    distributionId: DistributionId,
    distributedPackages: DistributedPackageWithVersionIds[],
    command: RecordLockFileCommand,
  ): Promise<void> {
    const distribution: Distribution = {
      id: distributionId,
      distributedPackages,
      createdAt: new Date().toISOString(),
      authorId: command.userId,
      organizationId: command.organizationId,
      target: command.target,
      status: DistributionStatus.success,
      renderModes:
        this.renderModeConfigurationService.mapCodingAgentsToRenderModes(
          command.lockFile.agents,
        ),
      source: command.source,
    };
    await this.distributionRepository.add(distribution);

    for (const distributedPackage of distributedPackages) {
      const { id, _standardVersionIds, _recipeVersionIds, _skillVersionIds } =
        distributedPackage;
      await this.distributedPackageRepository.add(distributedPackage);
      if (_standardVersionIds.length > 0) {
        await this.distributedPackageRepository.addStandardVersions(
          id,
          _standardVersionIds,
        );
      }
      if (_recipeVersionIds.length > 0) {
        await this.distributedPackageRepository.addCommandVersions(
          id,
          _recipeVersionIds,
        );
      }
      if (_skillVersionIds.length > 0) {
        await this.distributedPackageRepository.addSkillVersions(
          id,
          _skillVersionIds,
        );
      }
    }
  }
}

function newDistributedPackage(
  distributionId: DistributionId,
  packageId: PackageId,
  operation: DistributionOperation,
): DistributedPackageWithVersionIds {
  return {
    id: createDistributedPackageId(uuidv4()),
    distributionId,
    packageId,
    operation,
    versionSpec: null,
    latestReleaseVersion: null,
    standardVersions: [],
    recipeVersions: [],
    skillVersions: [],
    _standardVersionIds: [],
    _recipeVersionIds: [],
    _skillVersionIds: [],
  };
}

function groupArtifactsByPackageId(
  artifacts: Record<string, PackmindLockFileEntry>,
): Map<PackageId, PackmindLockFileEntry[]> {
  const artifactsByPackageId = new Map<PackageId, PackmindLockFileEntry[]>();
  for (const entry of Object.values(artifacts)) {
    for (const id of entry.packageIds) {
      const packageId = createPackageId(id);
      artifactsByPackageId.set(packageId, [
        ...(artifactsByPackageId.get(packageId) ?? []),
        entry,
      ]);
    }
  }
  return artifactsByPackageId;
}

function isAlreadyActive(
  addition: DistributedPackageWithVersionIds,
  activePackages: DistributedPackage[],
): boolean {
  const active = activePackages.find(
    (candidate) => candidate.packageId === addition.packageId,
  );
  return (
    !!active &&
    active.versionSpec === addition.versionSpec &&
    hasSameVersions(active.standardVersions, addition._standardVersionIds) &&
    hasSameVersions(active.recipeVersions, addition._recipeVersionIds) &&
    hasSameVersions(active.skillVersions, addition._skillVersionIds)
  );
}

function hasSameVersions(
  versions: { id: string }[],
  versionIds: string[],
): boolean {
  const activeIds = new Set(versions.map((version) => String(version.id)));
  const lockedIds = new Set(versionIds.map(String));
  return (
    activeIds.size === lockedIds.size &&
    [...activeIds].every((id) => lockedIds.has(id))
  );
}
