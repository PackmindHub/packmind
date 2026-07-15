import { ICommandsGateway } from '../../domain/repositories/ICommandsGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  Gateway,
  ICaptureCommandUseCase,
  IListCommandsBySpaceUseCase,
  ListCommandsBySpaceResponse,
  Command,
} from '@packmind/types';

export class CommandsGateway implements ICommandsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  public create: Gateway<ICaptureCommandUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/recipes`,
      { method: 'POST', body: command },
    );
  };

  public list: Gateway<IListCommandsBySpaceUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();

    const listCommandsResponse = await this.httpClient.request<
      Command[] | ListCommandsBySpaceResponse
    >(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/recipes`,
    );
    // The API endpoint does not (yet) return the correct type, just handling this for future fix.
    if (listCommandsResponse instanceof Array) {
      return { recipes: listCommandsResponse };
    }
    return listCommandsResponse;
  };
}
