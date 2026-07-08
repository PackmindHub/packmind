import { Command, CommandId, CommandVersion } from '@packmind/types';
import { NewGateway } from '@packmind/types';
import { IDeleteCommandUseCase } from '@packmind/types';
import { IDeleteCommandsBatchUseCase } from '@packmind/types';
import { OrganizationId } from '@packmind/types';
import { SpaceId } from '@packmind/types';

export interface ICommandsGateway {
  getCommands(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<Command[]>;
  getCommandById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: CommandId,
  ): Promise<Command>;
  getVersionsById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: CommandId,
  ): Promise<CommandVersion[]>;
  createCommand(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    recipe: { name: string; content: string; slug?: string },
  ): Promise<Command>;
  updateCommand(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: CommandId,
    updateData: { name: string; content: string },
  ): Promise<Command>;
  deleteCommand: NewGateway<IDeleteCommandUseCase>;
  deleteCommandsBatch: NewGateway<IDeleteCommandsBatchUseCase>;
}
