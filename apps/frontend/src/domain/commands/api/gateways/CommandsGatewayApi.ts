import { Command, CommandVersion, CommandId } from '@packmind/types';
import { NewGateway } from '@packmind/types';
import {
  IDeleteCommandsBatchUseCase,
  IDeleteCommandUseCase,
  OrganizationId,
} from '@packmind/types';
import { SpaceId } from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { ICommandsGateway } from './ICommandsGateway';

export class CommandsGatewayApi
  extends PackmindGateway
  implements ICommandsGateway
{
  constructor() {
    super('/commands');
  }

  getVersionsById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: CommandId,
  ): Promise<CommandVersion[]> {
    return this._api.get<CommandVersion[]>(
      `/organizations/${organizationId}/spaces/${spaceId}/commands/${id}/versions`,
    );
  }

  async getCommands(
    organizationId: OrganizationId,
    spaceId: SpaceId,
  ): Promise<Command[]> {
    return this._api.get<Command[]>(
      `/organizations/${organizationId}/spaces/${spaceId}/commands`,
    );
  }

  async getCommandById(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: CommandId,
  ): Promise<Command> {
    return this._api.get<Command>(
      `/organizations/${organizationId}/spaces/${spaceId}/commands/${id}`,
    );
  }

  async createCommand(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    recipe: { name: string; content: string; slug?: string },
  ): Promise<Command> {
    return this._api.post<Command>(
      `/organizations/${organizationId}/spaces/${spaceId}/commands`,
      recipe,
    );
  }

  async updateCommand(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: CommandId,
    updateData: { name: string; content: string },
  ): Promise<Command> {
    return this._api.patch<Command>(
      `/organizations/${organizationId}/spaces/${spaceId}/commands/${id}`,
      updateData,
    );
  }

  deleteCommand: NewGateway<IDeleteCommandUseCase> = async (command) => {
    const { recipeId, spaceId, organizationId } = command;
    return this._api.delete(
      `/organizations/${organizationId}/spaces/${spaceId}/commands/${recipeId}`,
    );
  };

  deleteCommandsBatch: NewGateway<IDeleteCommandsBatchUseCase> = async (
    command,
  ) => {
    const { organizationId, spaceId, recipeIds } = command;
    return this._api.delete(
      `/organizations/${organizationId}/spaces/${spaceId}/commands`,
      {
        data: { commandIds: recipeIds },
      },
    );
  };
}
