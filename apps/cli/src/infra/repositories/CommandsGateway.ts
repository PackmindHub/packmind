import { ICommandsGateway } from '../../domain/repositories/ICommandsGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  Gateway,
  ICaptureCommandUseCase,
  IListCommandsBySpaceUseCase,
  Command,
} from '@packmind/types';

export class CommandsGateway implements ICommandsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  public create: Gateway<ICaptureCommandUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/commands`,
      { method: 'POST', body: command },
    );
  };

  public list: Gateway<IListCommandsBySpaceUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();

    const listCommandsResponse = await this.httpClient.request<
      Command[] | { commands?: Command[]; recipes?: Command[] }
    >(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/commands`,
    );
    // The API endpoint does not (yet) return the correct type, just handling this for future fix.
    if (listCommandsResponse instanceof Array) {
      return { recipes: listCommandsResponse };
    }
    // The API superset emits both `commands` and `recipes`; prefer the new
    // command-named field and fall back to the legacy one. Normalize into the
    // domain response shape (`recipes`) consumed by the rest of the CLI.
    return {
      recipes:
        listCommandsResponse.commands ?? listCommandsResponse.recipes ?? [],
    };
  };
}
