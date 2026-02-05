import {
  IStandardsGateway,
  CreateStandardInSpaceCommand,
  CreateStandardInSpaceResult,
  RuleWithId,
  RuleExample,
} from '../../domain/repositories/IStandardsGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';
import { Gateway, IListStandardsBySpaceUseCase } from '@packmind/types';

export class StandardsGateway implements IStandardsGateway {
  constructor(
    private readonly httpClient: PackmindHttpClient,
    private readonly spaces: ISpacesGateway,
  ) {}

  public create = async (
    spaceId: string,
    data: CreateStandardInSpaceCommand,
  ): Promise<CreateStandardInSpaceResult> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<CreateStandardInSpaceResult>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards`,
      { method: 'POST', body: data },
    );
  };

  public getRules = async (
    spaceId: string,
    standardId: string,
  ): Promise<RuleWithId[]> => {
    const { organizationId } = this.httpClient.getAuthContext();
    return this.httpClient.request<RuleWithId[]>(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules`,
    );
  };

  public addExampleToRule = async (
    spaceId: string,
    standardId: string,
    ruleId: string,
    example: RuleExample,
  ): Promise<void> => {
    const { organizationId } = this.httpClient.getAuthContext();
    await this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules/${ruleId}/examples`,
      {
        method: 'POST',
        body: {
          lang: example.language,
          positive: example.positive,
          negative: example.negative,
        },
      },
    );
  };

  public list: Gateway<IListStandardsBySpaceUseCase> = async (command) => {
    const { organizationId } = this.httpClient.getAuthContext();

    return this.httpClient.request(
      `/api/v0/organizations/${organizationId}/spaces/${command.spaceId}/standards`,
    );
  };
}
