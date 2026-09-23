import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import { AuthenticatedRequest } from '@packmind/node-utils';
import {
  OrganizationId,
  Command,
  CommandId,
  CommandVersion,
  SpaceId,
  UserId,
} from '@packmind/types';
import { CommandNotFoundError } from '@packmind/commands';
import { CommandsService } from './commands.service';
import { OrganizationAccessGuard } from '../../guards/organization-access.guard';

const origin = 'OrganizationsSpacesRecipesController';

/**
 * Wire response for command versions. SUPERSET for the recipes→commands
 * rename: keeps the persisted `recipeId` field AND adds a command-named twin
 * `commandId` carrying the same value. The persisted `CommandVersion` entity is
 * never modified — the twin is added at the controller boundary.
 */
type CommandVersionResponse = CommandVersion & { commandId: CommandId };

/**
 * Controller for space-scoped recipe routes within organizations
 * Actual path: /organizations/:orgId/spaces/:spaceId/recipes (inherited via RouterModule in AppModule)
 *
 * This controller provides space-scoped recipe endpoints within organizations.
 * The path is inherited from the RouterModule configuration in AppModule:
 * - Parent: /organizations/:orgId/spaces/:spaceId (from OrganizationsSpacesModule)
 * - This controller: (empty, inherits from /recipes path in RouterModule)
 * - Final path: /organizations/:orgId/spaces/:spaceId/recipes
 *
 * OrganizationAccessGuard ensures proper access control.
 */
@Controller()
@UseGuards(OrganizationAccessGuard)
export class OrganizationsSpacesCommandsController {
  constructor(
    private readonly commandsService: CommandsService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('OrganizationsSpacesRecipesController initialized');
  }

  /**
   * Get all recipes for a space within an organization
   * GET /organizations/:orgId/spaces/:spaceId/recipes
   */
  @Get()
  async getCommands(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Command[]> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/recipes - Fetching recipes',
      {
        organizationId,
        spaceId,
      },
    );

    return this.commandsService.getCommandsBySpace(
      spaceId,
      organizationId,
      userId,
    );
  }

  /**
   * Get a recipe by ID within a space
   * GET /organizations/:orgId/spaces/:spaceId/recipes/:id
   */
  @Get(':id')
  async getCommandById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('id') id: CommandId,
    @Req() request: AuthenticatedRequest,
  ): Promise<Command> {
    const userId = request.user.userId;

    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/recipes/:id - Fetching recipe by ID',
      {
        organizationId,
        spaceId,
        recipeId: id,
      },
    );

    const recipe = await this.commandsService.getCommandById(
      id,
      organizationId,
      spaceId,
      userId,
    );
    if (!recipe) {
      throw new CommandNotFoundError(id, spaceId);
    }
    return recipe;
  }

  /**
   * Create a new recipe within a space
   * POST /organizations/:orgId/spaces/:spaceId/recipes
   */
  @Post()
  async createCommand(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body()
    recipe: Omit<
      CommandVersion,
      'id' | 'recipeId' | 'version' | 'author' | 'gitSha' | 'gitRepo'
    > & { originSkill?: string },
    @Req() request: AuthenticatedRequest,
  ): Promise<Command> {
    const userId = request.user.userId;

    this.logger.info(
      'POST /organizations/:orgId/spaces/:spaceId/recipes - Creating recipe',
      {
        organizationId,
        spaceId,
        recipeName: recipe.name,
        userId,
      },
    );

    return this.commandsService.addCommand(
      recipe,
      organizationId,
      userId,
      spaceId,
      request.clientSource,
    );
  }

  /**
   * Update a recipe within a space
   * PATCH /organizations/:orgId/spaces/:spaceId/recipes/:id
   */
  @Patch(':id')
  async updateCommand(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('id') id: CommandId,
    @Body()
    updateData: {
      name: string;
      content: string;
    },
    @Req() request: AuthenticatedRequest,
  ): Promise<Command> {
    const userId = request.user.userId;

    this.logger.info(
      'PATCH /organizations/:orgId/spaces/:spaceId/recipes/:id - Updating recipe',
      {
        organizationId,
        spaceId,
        recipeId: id,
        recipeName: updateData.name,
        userId,
      },
    );

    const updatedCommand = await this.commandsService.updateCommandFromUI({
      recipeId: id,
      spaceId,
      organizationId,
      name: updateData.name,
      content: updateData.content,
      userId,
      source: request.clientSource,
    });

    this.logger.info(
      'PATCH /organizations/:orgId/spaces/:spaceId/recipes/:id - Recipe updated successfully',
      {
        organizationId,
        spaceId,
        recipeId: id,
        newVersion: updatedCommand.version,
        userId,
      },
    );

    return updatedCommand;
  }

  /**
   * Delete multiple recipes within a space (batch delete)
   * DELETE /organizations/:orgId/spaces/:spaceId/recipes
   */
  @Delete()
  async deleteCommandsBatch(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Body() body: { commandIds?: CommandId[]; recipeIds?: CommandId[] },
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    // Accept BOTH keys: new `commandIds` wins, legacy `recipeIds` fallback.
    const ids = body.commandIds ?? body.recipeIds;

    if (!ids || !Array.isArray(ids)) {
      throw new BadRequestException('recipeIds must be an array');
    }

    if (ids.length === 0) {
      throw new BadRequestException('recipeIds array cannot be empty');
    }

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/recipes - Deleting recipes in batch',
      {
        organizationId,
        spaceId,
        recipeIds: ids,
        count: ids.length,
        userId,
      },
    );

    await this.commandsService.deleteCommandsBatch(
      ids,
      spaceId,
      userId,
      organizationId,
      request.clientSource,
    );

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/recipes - Recipes deleted successfully in batch',
      {
        organizationId,
        spaceId,
        count: ids.length,
        userId,
      },
    );
  }

  /**
   * Delete a recipe within a space
   * DELETE /organizations/:orgId/spaces/:spaceId/recipes/:id
   */
  @Delete(':id')
  async deleteCommand(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('id') id: CommandId,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const userId = request.user.userId;

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/recipes/:id - Deleting recipe',
      {
        organizationId,
        spaceId,
        recipeId: id,
        userId,
      },
    );

    await this.commandsService.deleteCommand(
      id,
      spaceId,
      organizationId,
      userId,
      request.clientSource,
    );

    this.logger.info(
      'DELETE /organizations/:orgId/spaces/:spaceId/recipes/:id - Recipe deleted successfully',
      {
        organizationId,
        spaceId,
        recipeId: id,
        userId,
      },
    );
  }

  /**
   * Get the latest version number of a recipe
   * GET /organizations/:orgId/spaces/:spaceId/recipes/:id/latest-version
   */
  @Get(':id/latest-version')
  async getCommandLatestVersion(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('id') id: CommandId,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ version: number }> {
    const userId = request.user.userId as UserId;
    this.logger.info('Getting latest version for recipe', {
      organizationId,
      recipeId: id,
      userId: userId.substring(0, 6) + '*',
    });

    const version = await this.commandsService.getLatestVersionNumber({
      recipeId: id,
      organizationId,
      spaceId,
      userId,
    });

    if (version === null) {
      throw new CommandNotFoundError(id, spaceId);
    }

    return { version };
  }

  /**
   * Get all versions of a recipe within a space
   * GET /organizations/:orgId/spaces/:spaceId/recipes/:id/versions
   */
  @Get(':id/versions')
  async getCommandVersionsById(
    @Param('orgId') organizationId: OrganizationId,
    @Param('spaceId') spaceId: SpaceId,
    @Param('id') id: CommandId,
  ): Promise<CommandVersionResponse[]> {
    this.logger.info(
      'GET /organizations/:orgId/spaces/:spaceId/recipes/:id/versions - Fetching recipe versions',
      {
        organizationId,
        spaceId,
        recipeId: id,
      },
    );

    const versions = await this.commandsService.getCommandVersionsById(id);
    if (!versions || versions.length === 0) {
      throw new CommandNotFoundError(id, spaceId);
    }
    // Superset: add command-named twin `commandId` beside `recipeId`.
    return versions.map((version) => ({
      ...version,
      commandId: version.recipeId,
    }));
  }
}
