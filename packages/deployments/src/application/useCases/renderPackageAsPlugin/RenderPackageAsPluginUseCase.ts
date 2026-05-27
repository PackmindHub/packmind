import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import { ClaudePluginDeployer } from '@packmind/coding-agent';
import {
  FileUpdates,
  GitRepo,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  OrganizationId,
  PackageWithArtefacts,
  RecipeVersion,
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginResponse,
  SkillVersion,
  SpaceId,
  StandardVersion,
  Target,
  createGitRepoId,
  createTargetId,
} from '@packmind/types';
import { parsePackageSlug } from '../../services/packageSlugHelpers';
import { PackageService } from '../../services/PackageService';
import { PackagesNotFoundError } from '../../../domain/errors/PackagesNotFoundError';

const origin = 'RenderPackageAsPluginUseCase';

const PLUGIN_VERSION = '0.1.0';

/**
 * Renders a single Packmind package as a Claude plugin.
 *
 * The use case finds and validates the package, fetches the latest version of
 * each artefact, then delegates rendering to {@link ClaudePluginDeployer}.
 * Standards are intentionally skipped; the count is surfaced to the caller.
 */
export class RenderPackageAsPluginUseCase extends AbstractMemberUseCase<
  RenderPackageAsPluginCommand,
  RenderPackageAsPluginResponse
> {
  constructor(
    private readonly packageService: PackageService,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
    this.logger.info('RenderPackageAsPluginUseCase initialized');
  }

  protected async executeForMembers(
    command: RenderPackageAsPluginCommand & MemberContext,
  ): Promise<RenderPackageAsPluginResponse> {
    this.logger.info('Rendering package as Claude plugin', {
      organizationId: command.organizationId,
      packageSlug: command.packageSlug,
      mode: command.mode,
    });

    const pkg = await this.resolvePackageBySlug(
      command.packageSlug,
      command.organization.id,
    );

    const recipeVersions = await this.fetchRecipeVersions(pkg);
    const skillVersions = await this.fetchSkillVersions(pkg);
    const standardVersions = await this.fetchStandardVersions(pkg);

    const deployer = new ClaudePluginDeployer();
    const target = this.buildSyntheticTarget(command.pluginRoot);
    // ClaudePluginDeployer does not read repository contents; only the id is
    // referenced in logs. A minimal synthetic repo keeps the contract honest.
    const gitRepo = { id: target.gitRepoId } as GitRepo;

    const manifestUpdate = deployer.deployPluginManifest(
      {
        name: command.pluginName,
        description: pkg.description || undefined,
        version: PLUGIN_VERSION,
      },
      target,
    );
    const commandsUpdate = await deployer.deployRecipes(
      recipeVersions,
      gitRepo,
      target,
    );
    const skillsUpdate = await deployer.deploySkills(
      skillVersions,
      gitRepo,
      target,
    );
    await deployer.deployStandards(standardVersions, gitRepo, target);

    const files = this.toRenderedFiles([
      manifestUpdate,
      commandsUpdate,
      skillsUpdate,
    ]);

    this.logger.info('Rendered package as Claude plugin', {
      packageSlug: command.packageSlug,
      fileCount: files.length,
      skippedStandardsCount: deployer.getLastSkippedStandardsCount(),
    });

    return {
      files,
      skippedStandardsCount: deployer.getLastSkippedStandardsCount(),
      pluginName: command.pluginName,
      pluginDescription: pkg.description || undefined,
      pluginVersion: PLUGIN_VERSION,
    };
  }

  private async resolvePackageBySlug(
    slug: string,
    organizationId: OrganizationId,
  ): Promise<PackageWithArtefacts> {
    const { spaceSlug, packageSlug } = parsePackageSlug(slug);

    const spaceId = await this.resolveSpaceId(spaceSlug, organizationId);
    if (!spaceId) {
      throw new PackagesNotFoundError([slug]);
    }

    const packages =
      await this.packageService.getPackagesBySlugsAndSpaceWithArtefacts(
        [packageSlug],
        spaceId,
      );

    const found = packages.find((p) => p.slug === packageSlug);
    if (!found) {
      throw new PackagesNotFoundError([slug]);
    }

    return found;
  }

  private async resolveSpaceId(
    spaceSlug: string | null,
    organizationId: OrganizationId,
  ): Promise<SpaceId | null> {
    if (spaceSlug === null) {
      const spaces =
        await this.spacesPort.listSpacesByOrganization(organizationId);
      return spaces.find((s) => s.isDefaultSpace)?.id ?? null;
    }

    const space = await this.spacesPort.getSpaceBySlug(
      spaceSlug,
      organizationId,
    );
    return space?.id ?? null;
  }

  private async fetchRecipeVersions(
    pkg: PackageWithArtefacts,
  ): Promise<RecipeVersion[]> {
    const versions = await Promise.all(
      pkg.recipes.map(async (recipe) => {
        const recipeVersions = await this.recipesPort.listRecipeVersions(
          recipe.id,
        );
        recipeVersions.sort(
          (a: RecipeVersion, b: RecipeVersion) => b.version - a.version,
        );
        return recipeVersions[0] ?? null;
      }),
    );
    return versions.filter((v): v is RecipeVersion => v != null);
  }

  private async fetchSkillVersions(
    pkg: PackageWithArtefacts,
  ): Promise<SkillVersion[]> {
    const versions = await Promise.all(
      pkg.skills.map(async (skill) => {
        const latest = await this.skillsPort.getLatestSkillVersion(skill.id);
        if (!latest) {
          return null;
        }
        const files = await this.skillsPort.getSkillFiles(latest.id);
        return { ...latest, files };
      }),
    );
    return versions.filter((v): v is SkillVersion => v != null);
  }

  private async fetchStandardVersions(
    pkg: PackageWithArtefacts,
  ): Promise<StandardVersion[]> {
    const versions = await Promise.all(
      pkg.standards.map((standard) =>
        this.standardsPort.getLatestStandardVersion(standard.id),
      ),
    );
    return versions.filter((v): v is StandardVersion => v != null);
  }

  private buildSyntheticTarget(pluginRoot: string): Target {
    return {
      id: createTargetId('cli-plugin'),
      name: 'cli-plugin',
      path: pluginRoot,
      gitRepoId: createGitRepoId('cli-plugin'),
    };
  }

  private toRenderedFiles(
    updates: FileUpdates[],
  ): RenderPackageAsPluginResponse['files'] {
    return updates.flatMap((update) =>
      update.createOrUpdate.map((file) => ({
        path: file.path,
        content: file.content,
      })),
    );
  }
}
