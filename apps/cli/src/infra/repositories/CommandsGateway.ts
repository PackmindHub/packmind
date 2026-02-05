import { ICommandsGateway } from '../../domain/repositories/ICommandsGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import {
  Gateway,
  ICaptureRecipeUseCase,
  IListRecipesBySpaceUseCase,
  ListRecipesBySpaceResponse,
  Recipe,
} from '@packmind/types';

export class CommandsGateway implements ICommandsGateway {
  constructor(private readonly httpClient: PackmindHttpClient) {}

  public create: Gateway<ICaptureRecipeUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/recipes`,
      { method: 'POST', body: command },
    );
  };

  public list: Gateway<IListRecipesBySpaceUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();

    const listRecipesResponse = await this.httpClient.request<
      Recipe[] | ListRecipesBySpaceResponse
    >(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/recipes`,
    );
    // The API endpoint does not (yet) return the correct type, just handling this for future fix.
    if (listRecipesResponse instanceof Array) {
      return { recipes: listRecipesResponse };
    }
    return listRecipesResponse;
  };
}
