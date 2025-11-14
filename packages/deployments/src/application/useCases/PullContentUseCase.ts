import { CodingAgents, ICodingAgentDeployer } from '@packmind/coding-agent';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  FileUpdates,
  IAccountsPort,
  ICodingAgentPort,
  IPullContentResponse,
  IRecipesPort,
  IStandardsPort,
  PullContentCommand,
  RecipeVersion,
} from '@packmind/types';
import { PackageService } from '../services/PackageService';

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
    accountsPort: IAccountsPort,
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
      // Hardcoded list of deployers to use
      const codingAgents = [
        CodingAgents.packmind,
        CodingAgents.claude,
        CodingAgents.cursor,
        CodingAgents.copilot,
      ];

      this.logger.info('Using hardcoded list of coding agents', {
        codingAgents,
      });

      // Fetch packages by slugs with full Recipe[] and Standard[] artefacts
      const packages =
        await this.packageService.getPackagesBySlugsWithArtefacts(
          command.packagesSlugs,
        );

      if (packages.length === 0) {
        const error = new Error(
          `No packages found with the provided slugs: ${command.packagesSlugs.join(', ')}. Please verify that the package slugs are correct and that they exist in your organization.`,
        );
        this.logger.error('Pull content failed: no matching packages found', {
          packagesSlugs: command.packagesSlugs,
          organizationId: command.organizationId,
        });
        throw error;
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

        // Deploy recipes
        if (recipeVersions.length > 0) {
          const recipeFileUpdates =
            await deployer.generateFileUpdatesForRecipes(recipeVersions);

          this.logger.info('Generated recipe file updates', {
            codingAgent,
            createOrUpdateCount: recipeFileUpdates.createOrUpdate.length,
            deleteCount: recipeFileUpdates.delete.length,
          });

          this.mergeFileUpdates(mergedFileUpdates, recipeFileUpdates);
        }

        // Deploy standards
        if (standardVersions.length > 0) {
          const standardFileUpdates =
            await deployer.generateFileUpdatesForStandards(standardVersions);

          this.logger.info('Generated standard file updates', {
            codingAgent,
            createOrUpdateCount: standardFileUpdates.createOrUpdate.length,
            deleteCount: standardFileUpdates.delete.length,
          });

          this.mergeFileUpdates(mergedFileUpdates, standardFileUpdates);
        }
      }

      this.logger.info('Successfully pulled content', {
        organizationId: command.organizationId,
        totalCreateOrUpdateCount: mergedFileUpdates.createOrUpdate.length,
        totalDeleteCount: mergedFileUpdates.delete.length,
      });

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
