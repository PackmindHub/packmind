import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  ArtifactsPulledEvent,
  FileUpdates,
  CodingAgent,
  IAccountsPort,
  ICodingAgentPort,
  IPullContentResponse,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  OrganizationId,
  PackageId,
  PackageWithArtefacts,
  PullContentCommand,
  CommandVersion,
  SkillVersion,
  SpaceId,
  StandardVersion,
  WILDCARD_VERSION_SPEC,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { parsePackageSlug } from '../services/packageSlugHelpers';
import { PackageService } from '../services/PackageService';
import { PackmindConfigService } from '../services/PackmindConfigService';
import { PackmindLockFileService } from '../services/PackmindLockFileService';
import { NoPackageSlugsProvidedError } from '../../domain/errors/NoPackageSlugsProvidedError';
import { PackagesNotFoundError } from '../../domain/errors/PackagesNotFoundError';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import {
  PackageContentResolver,
  readPackageVersionSpec,
} from '../services/PackageContentResolver';
import { PackageReleaseService } from '../services/PackageReleaseService';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { TargetResolutionService } from '../services/TargetResolutionService';
import {
  ArtifactMetadataMap,
  enrichFileModificationsWithMetadata,
  flattenArtifactMetadataMap,
} from '../utils/ArtifactMetadataUtils';

const origin = 'PullContentUseCase';

/** A slug the caller asked for, the package it named, and its canonical form. */
type ResolvedPackageEntry = {
  originalSlug: string;
  normalizedSlug: string;
  pkg: PackageWithArtefacts;
};

export class PullContentUseCase extends AbstractMemberUseCase<
  PullContentCommand,
  IPullContentResponse
> {
  private readonly contentResolver: PackageContentResolver;

  constructor(
    private readonly packageService: PackageService,
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly distributionRepository: IDistributionRepository,
    private readonly targetResolutionService: TargetResolutionService,
    private readonly spacesPort: ISpacesPort,
    packageReleaseService: PackageReleaseService,
    private readonly packmindConfigService: PackmindConfigService = new PackmindConfigService(),
    private readonly lockFileService: PackmindLockFileService = new PackmindLockFileService(),
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
    this.contentResolver = new PackageContentResolver(
      commandsPort,
      standardsPort,
      skillsPort,
      packageReleaseService,
    );
    this.logger.info('PullContentUseCase initialized');
  }

  protected async executeForMembers(
    command: PullContentCommand & MemberContext,
  ): Promise<IPullContentResponse> {
    const { source = 'cli' } = command;

    this.logger.info('Pulling content for organization', {
      organizationId: command.organizationId,
      userId: command.userId,
      packagesSlugs: command.packagesSlugs,
    });

    const isRemovalOnlyOperation =
      (!command.packagesSlugs || command.packagesSlugs.length === 0) &&
      command.previousPackagesSlugs &&
      command.previousPackagesSlugs.length > 0;

    if (
      !isRemovalOnlyOperation &&
      (!command.packagesSlugs || command.packagesSlugs.length === 0)
    ) {
      this.logger.error('Pull content failed: no package slugs provided', {
        organizationId: command.organizationId,
        userId: command.userId,
      });
      throw new NoPackageSlugsProvidedError();
    }

    try {
      let resolvedTargetId: string | undefined;

      const codingAgents =
        await this.renderModeConfigurationService.resolveCodingAgents(
          command.agents,
          command.organization.id,
        );

      let commandVersions: CommandVersion[] = [];
      let standardVersions: StandardVersion[] = [];
      let skillVersions: SkillVersion[] = [];
      let packages: PackageWithArtefacts[] = [];
      let artifactMetadata: ArtifactMetadataMap | null = null;
      // Normalized slugs in "@space-slug/package-slug" format
      let normalizedCurrentSlugs: string[] = [];
      const resolvedPackageVersions: Record<string, string> = {};

      if (!isRemovalOnlyOperation && command.packagesSlugs) {
        const resolution = await this.resolvePackagesBySlugs(
          command.packagesSlugs,
          command.organization.id,
        );
        packages = resolution.entries.map((entry) => entry.pkg);
        normalizedCurrentSlugs = resolution.normalizedSlugs;

        if (resolution.notFoundSlugs.length > 0) {
          this.logger.error('Pull content failed: unknown package slugs', {
            unknownSlugs: resolution.notFoundSlugs,
            requestedSlugs: command.packagesSlugs,
            organizationId: command.organizationId,
          });
          throw new PackagesNotFoundError(resolution.notFoundSlugs);
        }

        this.logger.info('Found packages with relations', {
          count: packages.length,
          packagesSlugs: packages.map((p) => p.slug),
        });

        const content = await this.contentResolver.resolve(
          resolution.entries.map((entry) => ({
            pkg: entry.pkg,
            slug: entry.originalSlug,
            spec: readPackageVersionSpec(
              entry.originalSlug,
              command.packageVersions,
            ),
          })),
        );

        commandVersions = content.commandVersions;
        standardVersions = content.standardVersions;
        skillVersions = content.skillVersions;
        artifactMetadata = content.artifactMetadata;

        for (const entry of resolution.entries) {
          resolvedPackageVersions[entry.normalizedSlug] =
            content.resolvedVersions.get(entry.pkg.id) ?? WILDCARD_VERSION_SPEC;
        }

        this.logger.info('Resolved package contents', {
          commandCount: commandVersions.length,
          standardCount: standardVersions.length,
          skillCount: skillVersions.length,
        });
      } else {
        this.logger.info(
          'Removal-only operation: skipping package fetching, will delete all artifacts from previous packages',
        );
      }

      let removedCommandVersions: CommandVersion[] = [];
      let removedStandardVersions: StandardVersion[] = [];
      let removedSkillVersions: SkillVersion[] = [];

      if (
        command.previousPackagesSlugs &&
        command.previousPackagesSlugs.length > 0
      ) {
        // Normalize before comparing against normalizedCurrentSlugs.
        const normalizedPreviousSlugs = await this.normalizeSlugs(
          command.previousPackagesSlugs,
          command.organization.id,
        );

        const removedPackageSlugs = this.computeRemovedPackages(
          normalizedPreviousSlugs,
          normalizedCurrentSlugs,
        );

        if (removedPackageSlugs.length > 0) {
          this.logger.info('Detected removed packages', {
            removedPackageSlugs,
            count: removedPackageSlugs.length,
          });

          const result = await this.fetchArtifactsForRemovedPackages(
            removedPackageSlugs,
            command.organization.id,
          );
          removedCommandVersions = result.commandVersions;
          removedStandardVersions = result.standardVersions;
          removedSkillVersions = result.skillVersions;

          this.logger.info('Retrieved removed artifact versions', {
            removedCommandsCount: removedCommandVersions.length,
            removedStandardsCount: removedStandardVersions.length,
            removedSkillsCount: removedSkillVersions.length,
          });
        }

        // Packages present in both lists may have had artifacts dropped.
        const updatedPackageSlugs = this.computeUpdatedPackages(
          normalizedPreviousSlugs,
          normalizedCurrentSlugs,
        );

        if (updatedPackageSlugs.length > 0) {
          this.logger.info(
            'Detected updated packages - checking for removed artifacts',
            {
              updatedPackageSlugs,
              count: updatedPackageSlugs.length,
            },
          );

          const previousResult = await this.fetchArtifactsForRemovedPackages(
            updatedPackageSlugs,
            command.organization.id,
          );

          // filterSharedArtifacts later drops those still present in the current content.
          removedCommandVersions = [
            ...removedCommandVersions,
            ...previousResult.commandVersions,
          ];
          removedStandardVersions = [
            ...removedStandardVersions,
            ...previousResult.standardVersions,
          ];
          removedSkillVersions = [
            ...removedSkillVersions,
            ...previousResult.skillVersions,
          ];

          this.logger.info(
            'Retrieved previous artifact versions from updated packages',
            {
              previousCommandsCount: previousResult.commandVersions.length,
              previousStandardsCount: previousResult.standardVersions.length,
              previousSkillsCount: previousResult.skillVersions.length,
              totalRemovedCommandsCount: removedCommandVersions.length,
              totalRemovedStandardsCount: removedStandardVersions.length,
              totalRemovedSkillsCount: removedSkillVersions.length,
            },
          );
        }
      }

      if (
        packages.length > 0 &&
        command.gitRemoteUrl &&
        command.gitBranch &&
        command.relativePath
      ) {
        const currentPackageIds = packages.map((p) => p.id) as PackageId[];

        const previouslyDeployed =
          await this.targetResolutionService.findPreviouslyDeployedVersions(
            command.organization.id,
            command.userId,
            command.gitRemoteUrl,
            command.gitBranch,
            command.relativePath,
            currentPackageIds,
          );

        if (previouslyDeployed.standardVersions.length > 0) {
          this.logger.info(
            'Retrieved previously deployed standard versions from distribution history',
            { count: previouslyDeployed.standardVersions.length },
          );

          removedStandardVersions = [
            ...removedStandardVersions,
            ...previouslyDeployed.standardVersions,
          ];
        }

        if (previouslyDeployed.commandVersions.length > 0) {
          this.logger.info(
            'Retrieved previously deployed command versions from distribution history',
            { count: previouslyDeployed.commandVersions.length },
          );

          removedCommandVersions = [
            ...removedCommandVersions,
            ...previouslyDeployed.commandVersions,
          ];
        }

        if (previouslyDeployed.skillVersions.length > 0) {
          this.logger.info(
            'Retrieved previously deployed skill versions from distribution history',
            { count: previouslyDeployed.skillVersions.length },
          );

          removedSkillVersions = [
            ...removedSkillVersions,
            ...previouslyDeployed.skillVersions,
          ];
        }
      }

      const mergedFileUpdates: FileUpdates = {
        createOrUpdate: [],
        delete: [],
      };

      let skillVersionsToDelete: SkillVersion[] = [];
      let removedAgents: CodingAgent[] = [];
      let cleanupSkillVersions: SkillVersion[] = [];

      this.logger.info('Deploying artifacts for coding agents', {
        codingAgents,
      });

      const artifactFileUpdates =
        await this.codingAgentPort.deployArtifactsForAgents({
          recipeVersions: commandVersions,
          standardVersions,
          skillVersions,
          codingAgents,
        });

      this.logger.info('Generated artifact file updates', {
        createOrUpdateCount: artifactFileUpdates.createOrUpdate.length,
        deleteCount: artifactFileUpdates.delete.length,
      });

      this.mergeFileUpdates(mergedFileUpdates, artifactFileUpdates);

      if (
        removedCommandVersions.length > 0 ||
        removedStandardVersions.length > 0 ||
        removedSkillVersions.length > 0
      ) {
        const filterResult = this.filterSharedArtifacts(
          removedCommandVersions,
          removedStandardVersions,
          removedSkillVersions,
          commandVersions,
          standardVersions,
          skillVersions,
        );
        const commandVersionsToDelete = filterResult.commandVersionsToDelete;
        const standardVersionsToDelete = filterResult.standardVersionsToDelete;
        skillVersionsToDelete = filterResult.skillVersionsToDelete;

        this.logger.info('Filtered shared artifacts from deletion', {
          originalRemovedCommands: removedCommandVersions.length,
          actualCommandsToDelete: commandVersionsToDelete.length,
          originalRemovedStandards: removedStandardVersions.length,
          actualStandardsToDelete: standardVersionsToDelete.length,
          originalRemovedSkills: removedSkillVersions.length,
          actualSkillsToDelete: skillVersionsToDelete.length,
        });

        if (
          commandVersionsToDelete.length > 0 ||
          standardVersionsToDelete.length > 0 ||
          skillVersionsToDelete.length > 0
        ) {
          const removalFileUpdates =
            await this.codingAgentPort.generateRemovalUpdatesForAgents({
              removed: {
                recipeVersions: commandVersionsToDelete,
                standardVersions: standardVersionsToDelete,
                skillVersions: skillVersionsToDelete,
              },
              installed: {
                recipeVersions: commandVersions,
                standardVersions,
                skillVersions,
              },
              codingAgents,
            });

          this.logger.info('Generated removal file updates', {
            createOrUpdateCount: removalFileUpdates.createOrUpdate.length,
            deleteCount: removalFileUpdates.delete.length,
          });

          this.mergeFileUpdates(mergedFileUpdates, removalFileUpdates);
        }
      }

      if (command.gitRemoteUrl && command.gitBranch && command.relativePath) {
        try {
          const target =
            await this.targetResolutionService.findOrCreateTargetFromGitInfo(
              command.organization.id,
              command.userId,
              command.gitRemoteUrl,
              command.gitBranch,
              command.relativePath,
            );

          if (target) {
            resolvedTargetId = target.id as string;

            const previousRenderModes =
              await this.distributionRepository.findActiveRenderModesByTarget(
                command.organization.id,
                target.id,
              );

            const previousAgents =
              this.renderModeConfigurationService.mapRenderModesToCodingAgents(
                previousRenderModes,
              );

            const currentAgentSet = new Set(codingAgents);
            removedAgents = previousAgents.filter(
              (agent) => !currentAgentSet.has(agent),
            );

            if (removedAgents.length > 0) {
              const {
                commandVersions: activeCommandVersions,
                standardVersions: activeStandardVersions,
                skillVersions: activeSkillVersions,
              } = await this.distributionRepository.findActiveVersionsByTarget(
                command.organization.id,
                target.id,
              );

              cleanupSkillVersions = activeSkillVersions;

              const cleanupFileUpdates =
                await this.codingAgentPort.generateAgentCleanupUpdatesForAgents(
                  {
                    agents: removedAgents,
                    artifacts: {
                      recipeVersions: activeCommandVersions,
                      standardVersions: activeStandardVersions,
                      skillVersions: activeSkillVersions,
                    },
                  },
                );

              this.mergeFileUpdates(mergedFileUpdates, cleanupFileUpdates);
            }
          }
        } catch (error) {
          this.logger.info('Skipping agent cleanup from render mode history', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Prefer the normalized slugs so packmind.json always stores "@space/package".
      const configSlugs =
        normalizedCurrentSlugs.length > 0
          ? normalizedCurrentSlugs
          : command.packagesSlugs;
      const configFile =
        this.packmindConfigService.createConfigFileModification(
          configSlugs,
          undefined, // existingPackages: configSlugs already lists every package
          command.agents,
          resolvedPackageVersions,
        );
      mergedFileUpdates.createOrUpdate.push(configFile);

      if (artifactMetadata) {
        enrichFileModificationsWithMetadata(
          mergedFileUpdates.createOrUpdate,
          artifactMetadata,
        );
      }

      const { artifactSpaceIds, artifactPackageIds } = artifactMetadata
        ? flattenArtifactMetadataMap(artifactMetadata)
        : { artifactSpaceIds: {}, artifactPackageIds: {} };

      const lockFile = this.lockFileService.buildLockFile({
        fileModifications: mergedFileUpdates.createOrUpdate.filter(
          (f) => f.artifactType && f.artifactId,
        ),
        recipeVersions: commandVersions,
        standardVersions,
        skillVersions,
        codingAgents,
        packageSlugs: command.packagesSlugs ?? [],
        targetId: resolvedTargetId,
        artifactSpaceIds,
        artifactPackageIds,
      });
      mergedFileUpdates.createOrUpdate.push(
        this.lockFileService.createLockFileModification(lockFile),
      );

      this.logger.info('Successfully pulled content', {
        organizationId: command.organizationId,
        totalCreateOrUpdateCount: mergedFileUpdates.createOrUpdate.length,
        totalDeleteCount: mergedFileUpdates.delete.length,
      });

      this.eventEmitterService.emit(
        new ArtifactsPulledEvent({
          userId: createUserId(command.userId),
          organizationId: createOrganizationId(command.organizationId),
          packageSlugs: command.packagesSlugs,
          recipeCount: commandVersions.length,
          standardCount: standardVersions.length,
          skillCount: skillVersions.length,
          source,
        }),
      );

      // Removed skills are included too, so their folders get cleaned up.
      const skillFolderPaths =
        this.codingAgentPort.getSkillsFolderPathForAgents(codingAgents);

      const allSkillsForFolderCleanup = [
        ...skillVersions,
        ...skillVersionsToDelete,
      ];

      const skillFolders = codingAgents.flatMap((agent) => {
        const skillPath = skillFolderPaths.get(agent);
        if (!skillPath) return [];
        return allSkillsForFolderCleanup.map((sv) => `${skillPath}${sv.slug}`);
      });

      const removedAgentsSkillFolders =
        removedAgents.length > 0 && cleanupSkillVersions.length > 0
          ? (() => {
              const removedSkillFolderPaths =
                this.codingAgentPort.getSkillsFolderPathForAgents(
                  removedAgents,
                );
              return removedAgents.flatMap((agent) => {
                const skillPath = removedSkillFolderPaths.get(agent);
                if (!skillPath) return [];
                return cleanupSkillVersions.map(
                  (sv) => `${skillPath}${sv.slug}`,
                );
              });
            })()
          : [];

      const mergedSkillFolders = Array.from(
        new Set([...skillFolders, ...removedAgentsSkillFolders]),
      );

      this.logger.info('Generated skill folders', {
        installedSkillCount: skillVersions.length,
        removedSkillCount: skillVersionsToDelete.length,
        totalFolderCount: mergedSkillFolders.length,
      });

      return {
        fileUpdates: mergedFileUpdates,
        skillFolders: mergedSkillFolders,
        targetId: resolvedTargetId,
        resolvedAgents: codingAgents,
        resolvedPackageVersions,
      };
    } catch (error) {
      this.logger.error('Failed to pull content', {
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Slugs prefixed with "@space-slug/" are resolved within that space; unprefixed
   * slugs are resolved within the organization's default space.
   */
  private async resolvePackagesBySlugs(
    slugs: string[],
    organizationId: OrganizationId,
  ): Promise<{
    /** One per resolved slug, in the order the caller asked for them. */
    entries: ResolvedPackageEntry[];
    notFoundSlugs: string[];
    normalizedSlugs: string[];
  }> {
    const parsedSlugs = slugs.map((slug) => ({
      originalSlug: slug,
      ...parsePackageSlug(slug),
    }));

    // Group by space slug (null = default space)
    const spaceGroups = new Map<string | null, typeof parsedSlugs>();
    for (const parsed of parsedSlugs) {
      const group = spaceGroups.get(parsed.spaceSlug) ?? [];
      group.push(parsed);
      spaceGroups.set(parsed.spaceSlug, group);
    }

    // Resolve default space once if needed
    let defaultSpaceSlug: string | null = null;
    let defaultSpaceId: SpaceId | null = null;
    if (spaceGroups.has(null)) {
      const allSpaces =
        await this.spacesPort.listSpacesByOrganization(organizationId);
      const defaultSpace = allSpaces.find((s) => s.isDefaultSpace) ?? null;
      defaultSpaceId = defaultSpace?.id ?? null;
      defaultSpaceSlug = defaultSpace?.slug ?? null;
    }

    const notFoundSlugs: string[] = [];
    // Map from originalSlug → normalizedSlug
    const normalizedSlugMap = new Map<string, string>();
    const packageByOriginalSlug = new Map<string, PackageWithArtefacts>();

    for (const [spaceSlug, group] of spaceGroups) {
      let resolvedSpaceSlug: string | null;
      let spaceId: SpaceId | null;

      if (spaceSlug === null) {
        spaceId = defaultSpaceId;
        resolvedSpaceSlug = defaultSpaceSlug;
      } else {
        const space = await this.spacesPort.getSpaceBySlug(
          spaceSlug,
          organizationId,
        );
        spaceId = space?.id ?? null;
        resolvedSpaceSlug = space?.slug ?? null;
      }

      if (!spaceId || !resolvedSpaceSlug) {
        notFoundSlugs.push(...group.map((g) => g.originalSlug));
        continue;
      }

      const pkgSlugs = group.map((g) => g.packageSlug);
      const found =
        await this.packageService.getPackagesBySlugsAndSpaceWithArtefacts(
          pkgSlugs,
          spaceId,
        );
      const foundBySlug = new Map(found.map((p) => [p.slug, p]));
      for (const g of group) {
        const pkg = foundBySlug.get(g.packageSlug);
        if (!pkg) {
          notFoundSlugs.push(g.originalSlug);
        } else {
          normalizedSlugMap.set(
            g.originalSlug,
            `@${resolvedSpaceSlug}/${g.packageSlug}`,
          );
          packageByOriginalSlug.set(g.originalSlug, pkg);
        }
      }
    }

    const normalizedSlugs = slugs
      .map((slug) => normalizedSlugMap.get(slug))
      .filter((s): s is string => s !== undefined);

    const entries = slugs.flatMap((slug) => {
      const pkg = packageByOriginalSlug.get(slug);
      const normalizedSlug = normalizedSlugMap.get(slug);
      if (!pkg || !normalizedSlug) return [];
      return [{ originalSlug: slug, normalizedSlug, pkg }];
    });

    return { entries, notFoundSlugs, normalizedSlugs };
  }

  /**
   * Normalizes slugs to "@space-slug/package-slug", resolving unprefixed ones
   * against the organization's default space.
   */
  private async normalizeSlugs(
    slugs: string[],
    organizationId: OrganizationId,
  ): Promise<string[]> {
    const hasUnprefixed = slugs.some((s) => !s.startsWith('@'));
    let defaultSpaceSlug: string | null = null;
    if (hasUnprefixed) {
      const allSpaces =
        await this.spacesPort.listSpacesByOrganization(organizationId);
      defaultSpaceSlug = allSpaces.find((s) => s.isDefaultSpace)?.slug ?? null;
    }

    return slugs.map((slug) => {
      if (slug.startsWith('@')) return slug;
      if (defaultSpaceSlug) return `@${defaultSpaceSlug}/${slug}`;
      return slug;
    });
  }

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

  private computeRemovedPackages(
    previousSlugs: string[],
    currentSlugs: string[],
  ): string[] {
    const currentSet = new Set(currentSlugs);
    return previousSlugs.filter((slug) => !currentSet.has(slug));
  }

  /**
   * Packages in both lists: their artifact set may have changed.
   */
  private computeUpdatedPackages(
    previousSlugs: string[],
    currentSlugs: string[],
  ): string[] {
    const currentSet = new Set(currentSlugs);
    return previousSlugs.filter((slug) => currentSet.has(slug));
  }

  /**
   * Compares by recipeId/standardId/skillId rather than by version id: the same
   * artifact renders to the same file path whichever package it came from.
   */
  private filterSharedArtifacts(
    removedCommandVersions: CommandVersion[],
    removedStandardVersions: StandardVersion[],
    removedSkillVersions: SkillVersion[],
    remainingCommandVersions: CommandVersion[],
    remainingStandardVersions: StandardVersion[],
    remainingSkillVersions: SkillVersion[],
  ): {
    commandVersionsToDelete: CommandVersion[];
    standardVersionsToDelete: StandardVersion[];
    skillVersionsToDelete: SkillVersion[];
  } {
    const remainingCommandIds = new Set(
      remainingCommandVersions.map((rv) => rv.recipeId),
    );
    const remainingStandardIds = new Set(
      remainingStandardVersions.map((sv) => sv.standardId),
    );
    const remainingSkillIds = new Set(
      remainingSkillVersions.map((skv) => skv.skillId),
    );

    const commandVersionsToDelete = removedCommandVersions.filter(
      (rv) => !remainingCommandIds.has(rv.recipeId),
    );
    const standardVersionsToDelete = removedStandardVersions.filter(
      (sv) => !remainingStandardIds.has(sv.standardId),
    );
    const skillVersionsToDelete = removedSkillVersions.filter(
      (skv) => !remainingSkillIds.has(skv.skillId),
    );

    return {
      commandVersionsToDelete,
      standardVersionsToDelete,
      skillVersionsToDelete,
    };
  }

  private async fetchArtifactsForRemovedPackages(
    removedPackageSlugs: string[],
    organizationId: OrganizationId,
  ): Promise<{
    commandVersions: CommandVersion[];
    standardVersions: StandardVersion[];
    skillVersions: SkillVersion[];
  }> {
    // notFoundSlugs is ignored: a removed package may no longer exist.
    const { entries } = await this.resolvePackagesBySlugs(
      removedPackageSlugs,
      organizationId,
    );
    const packages = entries.map((entry) => entry.pkg);

    const allCommands = packages.flatMap((pkg) => pkg.recipes);
    const allStandards = packages.flatMap((pkg) => pkg.standards);
    const allSkills = packages.flatMap((pkg) => pkg.skills);

    // Deduplicate by ID (when multiple packages share the same artifact)
    const commands = [...new Map(allCommands.map((c) => [c.id, c])).values()];
    const standards = [...new Map(allStandards.map((s) => [s.id, s])).values()];
    const skills = [...new Map(allSkills.map((s) => [s.id, s])).values()];

    const commandVersionsPromises = commands.map(async (cmd) => {
      const versions = await this.commandsPort.listCommandVersions(cmd.id);
      versions.sort(
        (a: CommandVersion, b: CommandVersion) => b.version - a.version,
      );
      return versions[0];
    });

    const commandVersions = (await Promise.all(commandVersionsPromises)).filter(
      (rv): rv is NonNullable<typeof rv> => rv !== null,
    );

    const standardVersionsPromises = standards.map((standard) =>
      this.standardsPort.getLatestStandardVersion(standard.id),
    );

    const standardVersions = (
      await Promise.all(standardVersionsPromises)
    ).filter((sv) => sv !== null);

    const skillVersionsPromises = skills.map((skill) =>
      this.skillsPort.getLatestSkillVersion(skill.id),
    );

    const skillVersions = (await Promise.all(skillVersionsPromises)).filter(
      (skv) => skv !== null,
    );

    return { commandVersions, standardVersions, skillVersions };
  }
}
