import {
  IStandardsGateway,
  CreateStandardInSpaceCommand,
  CreateStandardInSpaceResult,
  RuleWithId,
  RuleExample,
  ListStandardsResult,
  ListedStandard,
} from '../../domain/repositories/IStandardsGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { PackmindHttpClient } from '../http/PackmindHttpClient';

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

  public list = async (): Promise<ListStandardsResult> => {
    const space = await this.spaces.getGlobal();
    const { organizationId } = this.httpClient.getAuthContext();

    const response = await this.httpClient.request<{
      standards: Array<{
        id: string;
        slug: string;
        name: string;
        description: string;
      }>;
    }>(`/api/v0/organizations/${organizationId}/spaces/${space.id}/standards`);

    return response.standards.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description,
    }));
  };

  public getBySlug = async (slug: string): Promise<ListedStandard | null> => {
    const standards = await this.list();
    return standards.find((s) => s.slug === slug) ?? null;
  };
}
