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
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  OrganizationId,
  PackageWithArtefacts,
  RecipeVersion,
  SkillVersion,
  SpaceId,
  StandardVersion,
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
  buildArtifactMetadataMap,
  enrichFileModificationsWithMetadata,
  flattenArtifactMetadataMap,
} from '../utils/ArtifactMetadataUtils';

const origin = 'InstallPackagesUseCase';

export class InstallPackagesUseCase extends AbstractMemberUseCase<
  InstallPackagesCommand,
  InstallPackagesResponse
> {
  constructor(
    private readonly packageService: PackageService,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly packmindConfigService: PackmindConfigService = new PackmindConfigService(),
    private readonly lockFileService: PackmindLockFileService = new PackmindLockFileService(),
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
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

    // Classify packages by space access
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
    let recipeVersions: RecipeVersion[] = [];
    let standardVersions: StandardVersion[] = [];
    let skillVersions: SkillVersion[] = [];
    let normalizedAccessibleSlugs: string[] = [];
    let artifactMetadata: ReturnType<typeof buildArtifactMetadataMap> | null =
      null;

    if (accessibleSlugs.length > 0) {
      const resolution = await this.resolvePackagesBySlugs(
        accessibleSlugs,
        command.organization.id,
      );

      if (resolution.notFoundSlugs.length > 0) {
        throw new PackagesNotFoundError(resolution.notFoundSlugs);
      }

      normalizedAccessibleSlugs = resolution.normalizedSlugs;
      const packages = resolution.packages;

      this.logger.info('Found accessible packages', {
        count: packages.length,
        slugs: packages.map((p) => p.slug),
      });

      const allRecipes = packages.flatMap((pkg) => pkg.recipes);
      const allStandards = packages.flatMap((pkg) => pkg.standards);
      const allSkills = packages.flatMap((pkg) => pkg.skills);

      const recipes = [...new Map(allRecipes.map((r) => [r.id, r])).values()];
      const standards = [
        ...new Map(allStandards.map((s) => [s.id, s])).values(),
      ];
      const skills = [...new Map(allSkills.map((s) => [s.id, s])).values()];

      const buildPackageIdMap = (
        accessor: (pkg: PackageWithArtefacts) => { id: string }[],
      ): Map<string, string[]> => {
        const map = new Map<string, string[]>();
        for (const pkg of packages) {
          for (const artifact of accessor(pkg)) {
            const existing = map.get(artifact.id as string);
            if (existing) {
              existing.push(pkg.id as string);
            } else {
              map.set(artifact.id as string, [pkg.id as string]);
            }
          }
        }
        return map;
      };

      const recipePackageIdMap = buildPackageIdMap((pkg) => pkg.recipes);
      const standardPackageIdMap = buildPackageIdMap((pkg) => pkg.standards);
      const skillPackageIdMap = buildPackageIdMap((pkg) => pkg.skills);

      const recipeVersionsPromises = recipes.map(async (recipe) => {
        const versions = await this.recipesPort.listRecipeVersions(recipe.id);
        versions.sort(
          (a: RecipeVersion, b: RecipeVersion) => b.version - a.version,
        );
        return versions[0];
      });

      recipeVersions = (await Promise.all(recipeVersionsPromises)).filter(
        (rv): rv is NonNullable<typeof rv> => rv !== null,
      );

      const standardVersionsPromises = standards.map((standard) =>
        this.standardsPort.getLatestStandardVersion(standard.id),
      );

      standardVersions = (await Promise.all(standardVersionsPromises)).filter(
        (sv) => sv !== null,
      );

      const skillVersionsPromises = skills.map(async (skill) => {
        const latestVersion = await this.skillsPort.getLatestSkillVersion(
          skill.id,
        );
        if (latestVersion) {
          const files = await this.skillsPort.getSkillFiles(latestVersion.id);
          return { ...latestVersion, files };
        }
        return null;
      });

      skillVersions = (await Promise.all(skillVersionsPromises)).filter(
        (skv) => skv !== null,
      );

      artifactMetadata = buildArtifactMetadataMap({
        recipes: {
          spaceIdMap: new Map(
            recipes.map((r) => [r.id as string, r.spaceId as string]),
          ),
          packageIdMap: recipePackageIdMap,
          versions: recipeVersions,
        },
        standards: {
          spaceIdMap: new Map(
            standards.map((s) => [s.id as string, s.spaceId as string]),
          ),
          packageIdMap: standardPackageIdMap,
          versions: standardVersions,
        },
        skills: {
          spaceIdMap: new Map(
            skills.map((s) => [s.id as string, s.spaceId as string]),
          ),
          packageIdMap: skillPackageIdMap,
          versions: skillVersions,
        },
      });

      const artifactFileUpdates =
        await this.codingAgentPort.deployArtifactsForAgents({
          recipeVersions,
          standardVersions,
          skillVersions,
          codingAgents,
        });

      this.mergeFileUpdates(mergedFileUpdates, artifactFileUpdates);
    }

    // Delete files for artifacts from removed packages
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

    // Add packmind.json config (all slugs, both accessible and inaccessible)
    const allNormalizedSlugs = [
      ...normalizedAccessibleSlugs,
      ...inaccessibleSlugs,
    ];
    const configSlugs =
      allNormalizedSlugs.length > 0
        ? allNormalizedSlugs
        : command.packagesSlugs;
    const configFile = this.packmindConfigService.createConfigFileModification(
      configSlugs,
      undefined,
      command.agents,
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

    if (!('installedAt' in command.packmindLockFile)) {
      delete lockFile.installedAt;
    }

    // Preserve inaccessible artifacts from the previous lock file
    for (const [key, entry] of Object.entries(
      command.packmindLockFile.artifacts,
    )) {
      if (inaccessibleSpaceIds.has(entry.spaceId)) {
        lockFile.artifacts[key] = entry;
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

    return {
      fileUpdates: mergedFileUpdates,
      resolvedAgents: codingAgents,
      missingAccess: inaccessibleSlugs,
      skillFolders: Array.from(new Set(skillFolders)),
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
    packages: PackageWithArtefacts[];
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

    const packages: PackageWithArtefacts[] = [];
    const notFoundSlugs: string[] = [];
    const normalizedSlugMap = new Map<string, string>();

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
      packages.push(...found);

      const foundSlugs = new Set(found.map((p) => p.slug));
      for (const g of group) {
        if (!foundSlugs.has(g.packageSlug)) {
          notFoundSlugs.push(g.originalSlug);
        } else {
          normalizedSlugMap.set(
            g.originalSlug,
            `@${resolvedSpaceSlug}/${g.packageSlug}`,
          );
        }
      }
    }

    const normalizedSlugs = slugs
      .map((slug) => normalizedSlugMap.get(slug))
      .filter((s): s is string => s !== undefined);

    return { packages, notFoundSlugs, normalizedSlugs };
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
