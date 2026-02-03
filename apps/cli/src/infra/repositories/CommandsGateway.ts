import {
  ICommandsGateway,
  CreateCommandCommand,
  CreateCommandResult,
  ListCommandsResult,
} from '../../domain/repositories/ICommandsGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

export class CommandsGateway implements ICommandsGateway {
  constructor(
    private readonly httpClient: PackmindHttpClient,
    private readonly spaces: ISpacesGateway,
  ) {}

  public create = async (
    spaceId: string,
    data: CreateCommandCommand,
  ): Promise<CreateCommandResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<CreateCommandResult>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/recipes`,
      { method: 'POST', body: data },
    );
  };

  public list = async (): Promise<ListCommandsResult> => {
    const space = await this.spaces.getGlobal();
    const { organizationId } = this.httpClient.getAuthContext();

    const recipes = await this.httpClient.request<
      Array<{ id: string; slug: string; name: string }>
    >(`/api/v0/organizations/${organizationId}/spaces/${space.id}/recipes`);

    return recipes.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
    }));
  };
}
