import { ICodingAgentDeployer } from '@packmind/coding-agent';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  ArtifactsPulledEvent,
  FileUpdates,
  IAccountsPort,
  ICodingAgentPort,
  IPullContentResponse,
  IRecipesPort,
  IStandardsPort,
  PullContentCommand,
  RecipeVersion,
  createOrganizationId,
  createUserId,
} from '@packmind/types';
import { PackageService } from '../services/PackageService';
import { PackmindConfigService } from '../services/PackmindConfigService';
import { PackagesNotFoundError } from '../../domain/errors/PackagesNotFoundError';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';

const origin = 'PullContentUseCase';

export class PullContentUseCase extends AbstractMemberUseCase<
  PullContentCommand,
  IPullContentResponse
> {
  constructor(
    private readonly packageService: PackageService,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly codingAgentPort: ICodingAgentPort,
    private readonly renderModeConfigurationService: RenderModeConfigurationService,
    accountsPort: IAccountsPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    private readonly packmindConfigService: PackmindConfigService = new PackmindConfigService(),
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
    this.logger.info('PullContentUseCase initialized');
  }

  protected async executeForMembers(
    command: PullContentCommand & MemberContext,
  ): Promise<IPullContentResponse> {
    this.logger.info('Pulling content for organization', {
      organizationId: command.organizationId,
      userId: command.userId,
      packagesSlugs: command.packagesSlugs,
    });

    // Validate that package slugs are provided
    if (!command.packagesSlugs || command.packagesSlugs.length === 0) {
      const error = new Error(
        'No package slugs provided. Please specify at least one package slug.',
      );
      this.logger.error('Pull content failed: no package slugs provided', {
        organizationId: command.organizationId,
        userId: command.userId,
      });
      throw error;
    }

    try {
      // Get active coding agents for the organization
      const codingAgents =
        await this.renderModeConfigurationService.resolveActiveCodingAgents(
          command.organization.id,
        );

      this.logger.info('Using organization render modes', {
        codingAgents,
        organizationId: command.organizationId,
      });

      // Fetch packages by slugs with full Recipe[] and Standard[] artefacts
      const packages =
        await this.packageService.getPackagesBySlugsWithArtefacts(
          command.packagesSlugs,
        );

      // Check if all requested slugs were found
      const foundSlugs = packages.map((pkg) => pkg.slug);
      const unknownSlugs = command.packagesSlugs.filter(
        (slug) => !foundSlugs.includes(slug),
      );

      if (unknownSlugs.length > 0) {
        this.logger.error('Pull content failed: unknown package slugs', {
          unknownSlugs,
          requestedSlugs: command.packagesSlugs,
          foundSlugs,
          organizationId: command.organizationId,
        });
        throw new PackagesNotFoundError(unknownSlugs);
      }

      this.logger.info('Found packages with relations', {
        count: packages.length,
        packagesSlugs: packages.map((p) => p.slug),
      });

      // Extract recipes and standards from packages
      const recipes = packages.flatMap((pkg) => pkg.recipes);
      const standards = packages.flatMap((pkg) => pkg.standards);

      this.logger.info('Extracted content from packages', {
        recipeCount: recipes.length,
        standardCount: standards.length,
      });

      // Get recipe versions for recipes
      const recipeVersionsPromises = recipes.map(async (recipe) => {
        const versions = await this.recipesPort.listRecipeVersions(recipe.id);
        versions.sort(
          (a: RecipeVersion, b: RecipeVersion) => b.version - a.version,
        );
        return versions[0];
      });

      const recipeVersions = (await Promise.all(recipeVersionsPromises)).filter(
        (rv): rv is NonNullable<typeof rv> => rv !== null,
      );

      this.logger.info('Retrieved recipe versions', {
        count: recipeVersions.length,
      });

      // Get standard versions for standards
      const standardVersionsPromises = standards.map(async (standard) => {
        const versions = await this.standardsPort.listStandardVersions(
          standard.id,
        );
        versions.sort((a, b) => b.version - a.version);
        return versions[0];
      });

      const standardVersions = (
        await Promise.all(standardVersionsPromises)
      ).filter((sv) => sv !== undefined);

      this.logger.info('Retrieved standard versions', {
        count: standardVersions.length,
      });

      // Initialize the merged file updates
      const mergedFileUpdates: FileUpdates = {
        createOrUpdate: [],
        delete: [],
      };

      // Get the deployer registry
      const deployerRegistry = this.codingAgentPort.getDeployerRegistry();

      // For each coding agent, generate file updates
      for (const codingAgent of codingAgents) {
        this.logger.info('Processing coding agent', {
          codingAgent,
        });

        const deployer = deployerRegistry.getDeployer(
          codingAgent,
        ) as ICodingAgentDeployer;

        // Deploy both recipes and standards together using deployArtifacts
        // This ensures both sections are included in the same file
        const artifactFileUpdates = await deployer.deployArtifacts(
          recipeVersions,
          standardVersions,
        );

        this.logger.info('Generated artifact file updates', {
          codingAgent,
          createOrUpdateCount: artifactFileUpdates.createOrUpdate.length,
          deleteCount: artifactFileUpdates.delete.length,
        });

        this.mergeFileUpdates(mergedFileUpdates, artifactFileUpdates);
      }

      // Add packmind.json config file
      const configFile =
        this.packmindConfigService.createConfigFileModification(
          command.packagesSlugs,
        );
      mergedFileUpdates.createOrUpdate.push(configFile);

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
          recipeCount: recipeVersions.length,
          standardCount: standardVersions.length,
          source: 'cli',
        }),
      );

      return { fileUpdates: mergedFileUpdates };
    } catch (error) {
      this.logger.error('Failed to pull content', {
        organizationId: command.organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private mergeFileUpdates(target: FileUpdates, source: FileUpdates): void {
    // Merge createOrUpdate files (avoid duplicates by path)
    const existingPaths = new Set(target.createOrUpdate.map((f) => f.path));
    for (const file of source.createOrUpdate) {
      if (!existingPaths.has(file.path)) {
        target.createOrUpdate.push(file);
        existingPaths.add(file.path);
      }
    }

    // Merge delete files (avoid duplicates by path)
    const existingDeletePaths = new Set(target.delete.map((f) => f.path));
    for (const file of source.delete) {
      if (!existingDeletePaths.has(file.path)) {
        target.delete.push(file);
        existingDeletePaths.add(file.path);
      }
    }
  }
}
