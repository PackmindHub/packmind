import { CodingAgents, ICodingAgentDeployer } from '@packmind/coding-agent';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  FileUpdates,
  IAccountsPort,
  ICodingAgentPort,
  IPullAllContentResponse,
  IRecipesPort,
  ISpacesPort,
  IStandardsPort,
  PackmindCommand,
  Recipe,
  RecipeVersion,
} from '@packmind/types';

const origin = 'PullAllContentUseCase';

export class PullAllContentUseCase extends AbstractMemberUseCase<
  PackmindCommand,
  IPullAllContentResponse
> {
  constructor(
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly codingAgentPort: ICodingAgentPort,
    accountsPort: IAccountsPort,
    logger: PackmindLogger = new PackmindLogger(origin, LogLevel.INFO),
  ) {
    super(accountsPort, logger);
    this.logger.info('PullAllContentUseCase initialized');
  }

  protected async executeForMembers(
    command: PackmindCommand & MemberContext,
  ): Promise<IPullAllContentResponse> {
    this.logger.info('Pulling all content for organization', {
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      // Hardcoded list of deployers to use (as per user's note)
      const codingAgents = [
        CodingAgents.packmind,
        CodingAgents.claude,
        CodingAgents.cursor,
        CodingAgents.copilot,
      ];

      this.logger.info('Using hardcoded list of coding agents', {
        codingAgents,
      });

      // Retrieve all recipes for the organization
      const recipes = await this.recipesPort.listRecipesByOrganization(
        command.organization.id,
      );

      this.logger.info('Retrieved recipes', {
        count: recipes.length,
        organizationId: command.organizationId,
      });

      // Get recipe versions for all recipes
      const recipeVersionsPromises = recipes.map(async (recipe: Recipe) => {
        const versions = await this.recipesPort.listRecipeVersions(recipe.id);
        // Return the latest version
        return versions.sort(
          (a: RecipeVersion, b: RecipeVersion) => b.version - a.version,
        )[0];
      });

      const recipeVersions = (await Promise.all(recipeVersionsPromises)).filter(
        (rv): rv is NonNullable<typeof rv> => rv !== null,
      );

      this.logger.info('Retrieved recipe versions', {
        count: recipeVersions.length,
      });

      // Retrieve all spaces for the organization
      const spaces = await this.spacesPort.listSpacesByOrganization(
        command.organization.id,
      );

      this.logger.info('Retrieved spaces', {
        count: spaces.length,
        organizationId: command.organizationId,
      });

      // Retrieve all standards across all spaces
      const allStandards = [];
      for (const space of spaces) {
        const standards = await this.standardsPort.listStandardsBySpace(
          space.id,
          command.organization.id,
          command.userId,
        );

        allStandards.push(...standards);
      }

      this.logger.info('Retrieved standards from all spaces', {
        count: allStandards.length,
        organizationId: command.organizationId,
      });

      // Get standard versions for all standards
      const standardVersionsPromises = allStandards.map(async (standard) => {
        const versions = await this.standardsPort.listStandardVersions(
          standard.id,
        );
        // Return the latest version
        return versions.sort((a, b) => b.version - a.version)[0];
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

          // Merge recipe file updates
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

          // Merge standard file updates
          this.mergeFileUpdates(mergedFileUpdates, standardFileUpdates);
        }
      }

      this.logger.info('Successfully pulled all content', {
        organizationId: command.organizationId,
        totalCreateOrUpdateCount: mergedFileUpdates.createOrUpdate.length,
        totalDeleteCount: mergedFileUpdates.delete.length,
      });

      return { fileUpdates: mergedFileUpdates };
    } catch (error) {
      this.logger.error('Failed to pull all content', {
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
