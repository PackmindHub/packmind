import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  ArtifactsPulledEvent,
  DeleteItemType,
  FileUpdates,
  IAccountsPort,
  ICodingAgentPort,
  InstallPackagesCommand,
  InstallPackagesResponse,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  OrganizationId,
  PackageWithArtefacts,
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
import {
  ArtifactMetadataMap,
  enrichFileModificationsWithMetadata,
  flattenArtifactMetadataMap,
} from '../utils/ArtifactMetadataUtils';

const origin = 'InstallPackagesUseCase';

/** A slug the caller asked for, the package it named, and its canonical form. */
type ResolvedPackageEntry = {
  originalSlug: string;
  normalizedSlug: string;
  pkg: PackageWithArtefacts;
};

export class InstallPackagesUseCase extends AbstractMemberUseCase<
  InstallPackagesCommand,
  InstallPackagesResponse
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
    private readonly spacesPort: ISpacesPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
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
    this.logger.info('InstallPackagesUseCase initialized');
  }

  protected async executeForMembers(
    command: InstallPackagesCommand & MemberContext,
  ): Promise<InstallPackagesResponse> {
    const { source = 'cli' } = command;

    this.logger.info('Installing packages for organization', {
      organizationId: command.organizationId,
      userId: command.userId,
      packagesSlugs: command.packagesSlugs,
    });

    if (!command.packagesSlugs || command.packagesSlugs.length === 0) {
      throw new NoPackageSlugsProvidedError();
    }

    const codingAgents =
      await this.renderModeConfigurationService.resolveCodingAgents(
        command.agents,
        command.organization.id,
      );

    const { accessibleSlugs, inaccessibleSlugs, inaccessibleSpaceIds } =
      await this.classifyPackagesByAccess(
        command.packagesSlugs,
        command.organization.id,
        command.userId,
      );

    this.logger.info('Classified packages by access', {
      accessibleCount: accessibleSlugs.length,
      inaccessibleCount: inaccessibleSlugs.length,
    });

    const mergedFileUpdates: FileUpdates = { createOrUpdate: [], delete: [] };
    let recipeVersions: CommandVersion[] = [];
    let standardVersions: StandardVersion[] = [];
    let skillVersions: SkillVersion[] = [];
    let normalizedAccessibleSlugs: string[] = [];
    let artifactMetadata: ArtifactMetadataMap | null = null;
    const resolvedPackageVersions: Record<string, string> = {};

    if (accessibleSlugs.length > 0) {
      const resolution = await this.resolvePackagesBySlugs(
        accessibleSlugs,
        command.organization.id,
      );

      if (resolution.notFoundSlugs.length > 0) {
        throw new PackagesNotFoundError(resolution.notFoundSlugs);
      }

      normalizedAccessibleSlugs = resolution.normalizedSlugs;

      this.logger.info('Found accessible packages', {
        count: resolution.entries.length,
        slugs: resolution.entries.map((entry) => entry.pkg.slug),
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

      recipeVersions = content.commandVersions;
      standardVersions = content.standardVersions;
      skillVersions = content.skillVersions;
      artifactMetadata = content.artifactMetadata;

      for (const entry of resolution.entries) {
        resolvedPackageVersions[entry.normalizedSlug] =
          content.resolvedVersions.get(entry.pkg.id) ?? WILDCARD_VERSION_SPEC;
      }

      const artifactFileUpdates =
        await this.codingAgentPort.deployArtifactsForAgents({
          recipeVersions,
          standardVersions,
          skillVersions,
          codingAgents,
        });

      this.mergeFileUpdates(mergedFileUpdates, artifactFileUpdates);
    }

    const newArtifactIds = new Set<string>([
      ...recipeVersions.map((rv) => String(rv.recipeId)),
      ...standardVersions.map((sv) => String(sv.standardId)),
      ...skillVersions.map((skv) => String(skv.skillId)),
    ]);

    for (const entry of Object.values(command.packmindLockFile.artifacts)) {
      if (inaccessibleSpaceIds.has(entry.spaceId)) {
        continue;
      }
      if (!newArtifactIds.has(entry.id)) {
        for (const file of entry.files) {
          if (!mergedFileUpdates.delete.some((d) => d.path === file.path)) {
            mergedFileUpdates.delete.push({
              path: file.path,
              type: DeleteItemType.File,
            });
          }
        }
      }
    }

    // packmind.json lists the inaccessible slugs too, so they are not lost.
    const allNormalizedSlugs = [
      ...normalizedAccessibleSlugs,
      ...inaccessibleSlugs,
    ];
    const configSlugs =
      allNormalizedSlugs.length > 0
        ? allNormalizedSlugs
        : command.packagesSlugs;
    // A slug the caller cannot read keeps whatever it asked for: the version
    // is theirs to change, and this install never looked at the package.
    const configVersions: Record<string, string> = {
      ...resolvedPackageVersions,
    };
    for (const slug of inaccessibleSlugs) {
      const requested = command.packageVersions?.[slug];
      if (requested !== undefined) {
        configVersions[slug] = requested;
      }
    }

    const configFile = this.packmindConfigService.createConfigFileModification(
      configSlugs,
      undefined,
      command.agents,
      configVersions,
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
      recipeVersions,
      standardVersions,
      skillVersions,
      codingAgents,
      packageSlugs: command.packagesSlugs,
      artifactSpaceIds,
      artifactPackageIds,
    });

    // Preserve inaccessible artifacts from the previous lock file
    for (const [key, entry] of Object.entries(
      command.packmindLockFile.artifacts,
    )) {
      if (inaccessibleSpaceIds.has(entry.spaceId)) {
        lockFile.artifacts[key] = entry;
      }
    }

    // Prune per-agent renderings left behind when an agent is dropped but the
    // artifact survives. The whole-artifact delete above only fires when an
    // artifact disappears entirely; here the artifact is still rendered for the
    // remaining agents, so its previously-deployed file for the removed agent
    // (e.g. `.github/skills/X` after dropping copilot) must be cleaned up too.
    const renderedFilePaths = new Set<string>();
    for (const entry of Object.values(lockFile.artifacts)) {
      for (const file of entry.files) {
        renderedFilePaths.add(file.path);
      }
    }
    for (const [key, entry] of Object.entries(
      command.packmindLockFile.artifacts,
    )) {
      if (inaccessibleSpaceIds.has(entry.spaceId)) {
        continue;
      }
      // Only surviving artifacts — whole-artifact removal is handled above.
      if (!lockFile.artifacts[key]) {
        continue;
      }
      for (const file of entry.files) {
        if (
          !renderedFilePaths.has(file.path) &&
          !mergedFileUpdates.delete.some((d) => d.path === file.path)
        ) {
          mergedFileUpdates.delete.push({
            path: file.path,
            type: DeleteItemType.File,
          });
        }
      }
    }

    mergedFileUpdates.createOrUpdate.push(
      this.lockFileService.createLockFileModification(lockFile),
    );

    this.logger.info('Successfully installed packages', {
      organizationId: command.organizationId,
      totalCreateOrUpdateCount: mergedFileUpdates.createOrUpdate.length,
      missingAccessCount: inaccessibleSlugs.length,
    });

    this.eventEmitterService.emit(
      new ArtifactsPulledEvent({
        userId: createUserId(command.userId),
        organizationId: createOrganizationId(command.organizationId),
        packageSlugs: accessibleSlugs,
        recipeCount: recipeVersions.length,
        standardCount: standardVersions.length,
        skillCount: skillVersions.length,
        source,
      }),
    );

    const skillFolderPaths =
      this.codingAgentPort.getSkillsFolderPathForAgents(codingAgents);

    const skillFolders = codingAgents.flatMap((agent) => {
      const skillPath = skillFolderPaths.get(agent);
      if (!skillPath) return [];
      return skillVersions.map((sv) => `${skillPath}${sv.slug}`);
    });

    const sourceArtifacts = {
      skillsCount: skillVersions.length,
      standardsCount: standardVersions.length,
      // Same value under the command-named field the response also requires.
      commandsCount: recipeVersions.length,
      recipesCount: recipeVersions.length,
    };

    return {
      fileUpdates: mergedFileUpdates,
      resolvedAgents: codingAgents,
      missingAccess: inaccessibleSlugs,
      skillFolders: Array.from(new Set(skillFolders)),
      resolvedPackageVersions,
      sourceArtifacts,
    };
  }

  private async classifyPackagesByAccess(
    slugs: string[],
    organizationId: OrganizationId,
    userId: string,
  ): Promise<{
    accessibleSlugs: string[];
    inaccessibleSlugs: string[];
    inaccessibleSpaceIds: Set<string>;
  }> {
    const parsedSlugs = slugs.map((slug) => ({
      originalSlug: slug,
      ...parsePackageSlug(slug),
    }));

    const spaceGroups = new Map<string | null, typeof parsedSlugs>();
    for (const parsed of parsedSlugs) {
      const group = spaceGroups.get(parsed.spaceSlug) ?? [];
      group.push(parsed);
      spaceGroups.set(parsed.spaceSlug, group);
    }

    let defaultSpaceId: SpaceId | null = null;
    if (spaceGroups.has(null)) {
      const allSpaces =
        await this.spacesPort.listSpacesByOrganization(organizationId);
      defaultSpaceId = allSpaces.find((s) => s.isDefaultSpace)?.id ?? null;
    }

    const accessibleSlugs: string[] = [];
    const inaccessibleSlugs: string[] = [];
    const inaccessibleSpaceIds = new Set<string>();

    const uid = createUserId(userId);

    for (const [spaceSlug, group] of spaceGroups) {
      let spaceId: SpaceId | null;

      if (spaceSlug === null) {
        spaceId = defaultSpaceId;
      } else {
        const space = await this.spacesPort.getSpaceBySlug(
          spaceSlug,
          organizationId,
        );
        spaceId = space?.id ?? null;
      }

      if (!spaceId) {
        // Space not found - treat as not accessible
        inaccessibleSlugs.push(...group.map((g) => g.originalSlug));
        continue;
      }

      const membership = await this.spacesPort.findMembership(uid, spaceId);

      if (!membership) {
        inaccessibleSlugs.push(...group.map((g) => g.originalSlug));
        inaccessibleSpaceIds.add(String(spaceId));
      } else {
        accessibleSlugs.push(...group.map((g) => g.originalSlug));
      }
    }

    return { accessibleSlugs, inaccessibleSlugs, inaccessibleSpaceIds };
  }

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

    const spaceGroups = new Map<string | null, typeof parsedSlugs>();
    for (const parsed of parsedSlugs) {
      const group = spaceGroups.get(parsed.spaceSlug) ?? [];
      group.push(parsed);
      spaceGroups.set(parsed.spaceSlug, group);
    }

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
