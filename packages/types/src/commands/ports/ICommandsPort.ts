import { OrganizationId } from '../../accounts/Organization';
import { UserId } from '../../accounts/User';
import {
  CaptureCommandCommand,
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

import type { QueryOption } from '../../database/types';
import { SpaceId } from '../../spaces';

export const ICommandsPortName = 'ICommandsPort' as const;

export interface ICommandsPort {
  captureCommand(command: CaptureCommandCommand): Promise<Command>;

  /** Takes every version of the command with it. */
  deleteCommand(command: DeleteCommandCommand): Promise<DeleteCommandResponse>;

  deleteCommandsBatch(
    command: DeleteCommandsBatchCommand,
  ): Promise<DeleteCommandsBatchResponse>;

  /** Access-controlled; use getCommandByIdInternal to bypass the checks. */
  getCommandById(command: GetCommandByIdCommand): Promise<Command | null>;

  /**
   * No access control. For callers already authorized elsewhere — the
   * package use cases and the change appliers, which resolve commands by id
   * outside any space context.
   */
  getCommandByIdInternal(id: CommandId): Promise<Command | null>;

  findCommandBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Command | null>;

  /** Access-controlled; use listAllCommandsByOrganization to bypass the checks. */
  listCommandsBySpace(command: ListCommandsBySpaceCommand): Promise<Command[]>;

  /**
   * List all commands across every space of an organization, without space
   * membership checks. Intended for organization-scoped aggregations
   * where the caller has already been authorized at the organization level.
   */
  listAllCommandsByOrganization(
    organizationId: OrganizationId,
  ): Promise<Command[]>;

  /** Spaces with no command are absent from the Map, not zero. */
  countBySpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>>;

  listCommandVersions(recipeId: CommandId): Promise<CommandVersion[]>;

  getCommandVersion(
    recipeId: CommandId,
    version: number,
    allowedSpaceIds: SpaceId[],
  ): Promise<CommandVersion | null>;

  getLatestCommandVersions(recipeIds: CommandId[]): Promise<CommandVersion[]>;

  getCommandVersionById(id: string): Promise<CommandVersion | null>;

  getCommandVersionsByIds(
    commandVersionIds: CommandVersionId[],
  ): Promise<CommandVersion[]>;

  /** Creates a new CommandVersion rather than mutating the current one. */
  updateCommandFromUI(
    command: UpdateCommandFromUICommand,
  ): Promise<UpdateCommandFromUIResponse>;

  /** Permanent, not a soft delete. Used for rollback only. */
  hardDeleteCommand(recipeId: CommandId): Promise<void>;

  /** Permanent, not a soft delete. Used for rollback only. */
  hardDeleteCommandVersion(versionId: CommandVersionId): Promise<void>;

  /** Copies the full entity graph, not just the Command row. */
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
