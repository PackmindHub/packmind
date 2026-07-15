import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import {
  CaptureCommandCommand,
  CaptureCommandWithPackagesCommand,
  CaptureCommandWithPackagesResponse,
  DeleteCommandCommand,
  DeleteCommandResponse,
  DeleteCommandsBatchCommand,
  DeleteCommandsBatchResponse,
  GetCommandByIdCommand,
  ListCommandsBySpaceCommand,
  UpdateCommandFromUICommand,
  UpdateCommandFromUIResponse,
} from '../contracts';
import { Command } from '../Command';
import { CommandId } from '../CommandId';
import { CommandVersion, CommandVersionId } from '../CommandVersion';

// QueryOption is now exported from @packmind/types/database/types
import type { QueryOption } from '../../database/types';
import { SpaceId } from '../../spaces';

export const ICommandsPortName = 'ICommandsPort' as const;

/**
 * Port interface for the Recipes domain.
 * Defines all public methods that can be consumed by other domains.
 */
export interface ICommandsPort {
  // ===========================
  // CORE RECIPE MANAGEMENT
  // ===========================

  /**
   * Capture a new recipe with initial content
   */
  captureCommand(command: CaptureCommandCommand): Promise<Command>;

  /**
   * Capture a new recipe and add it to packages in a single operation
   */
  captureCommandWithPackages(
    command: CaptureCommandWithPackagesCommand,
  ): Promise<CaptureCommandWithPackagesResponse>;

  /**
   * Delete a recipe and all its versions
   */
  deleteCommand(command: DeleteCommandCommand): Promise<DeleteCommandResponse>;

  /**
   * Delete multiple recipes in batch
   */
  deleteCommandsBatch(
    command: DeleteCommandsBatchCommand,
  ): Promise<DeleteCommandsBatchResponse>;

  /**
   * Get a recipe by its ID (public API - with access control)
   */
  getCommandById(command: GetCommandByIdCommand): Promise<Command | null>;

  /**
   * Get a recipe by its ID (internal use - no access control)
   * Used by UpdateRecipeFromUI
   */
  getCommandByIdInternal(id: CommandId): Promise<Command | null>;

  /**
   * Find a recipe by its slug within an organization
   */
  findCommandBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Command | null>;

  /**
   * List recipes by space (public API - with access control)
   */
  listCommandsBySpace(command: ListCommandsBySpaceCommand): Promise<Command[]>;

  // ===========================
  // RECIPE VERSION MANAGEMENT
  // ===========================

  /**
   * List all versions of a recipe
   */
  listCommandVersions(recipeId: CommandId): Promise<CommandVersion[]>;

  /**
   * Get a specific version of a recipe
   */
  getCommandVersion(
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<CommandVersion | null>;

  /**
   * Get a recipe version by its ID
   */
  getCommandVersionById(id: string): Promise<CommandVersion | null>;

  /**
   * Update a recipe from UI with new content (creates new version)
   */
  updateCommandFromUI(
    command: UpdateCommandFromUICommand,
  ): Promise<UpdateCommandFromUIResponse>;

  /**
   * Hard-delete a recipe (permanent, no soft-delete). Used for rollback only.
   */
  hardDeleteCommand(recipeId: CommandId): Promise<void>;

  /**
   * Hard-delete a recipe version (permanent). Used for rollback only.
   */
  hardDeleteCommandVersion(versionId: CommandVersionId): Promise<void>;

  /**
   * Duplicate a recipe and its full entity graph into a destination space.
   */
  duplicateCommandToSpace(
    recipeId: CommandId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<Command>;
  markCommandAsMoved(
    recipeId: CommandId,
    destinationSpaceId: SpaceId,
  ): Promise<void>;
}
