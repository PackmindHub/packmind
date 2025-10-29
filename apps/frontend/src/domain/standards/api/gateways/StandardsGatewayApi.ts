import {
  Standard,
  StandardVersion,
  StandardId,
  StandardVersionId,
  Rule,
  NewGateway,
  IListStandardsBySpaceUseCase,
  IGetStandardByIdUseCase,
  SpaceId,
  OrganizationId,
  NewPackmindCommandBody,
  ListStandardsBySpaceResponse,
  ListStandardsBySpaceCommand,
  GetStandardByIdCommand,
  GetStandardByIdResponse,
} from '@packmind/shared/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IStandardsGateway } from './IStandardsGateway';
import { GitRepoId } from '@packmind/git/types';

export class StandardsGatewayApi
  extends PackmindGateway
  implements IStandardsGateway
{
  constructor() {
    super('/standards');
  }

  getVersionsById(id: StandardId): Promise<StandardVersion[]> {
    return this._api.get<StandardVersion[]>(`${this._endpoint}/${id}/versions`);
  }

  getRulesByStandardId(id: StandardId): Promise<Rule[]> {
    return this._api.get<Rule[]>(`${this._endpoint}/${id}/rules`);
  }

  getStandards: NewGateway<IListStandardsBySpaceUseCase> = async ({
    spaceId,
    organizationId,
  }: NewPackmindCommandBody<ListStandardsBySpaceCommand>) => {
    return this._api.get<ListStandardsBySpaceResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/standards`,
    );
  };

  getStandardById: NewGateway<IGetStandardByIdUseCase> = async ({
    standardId,
    spaceId,
    organizationId,
  }: NewPackmindCommandBody<GetStandardByIdCommand>) => {
    return this._api.get<GetStandardByIdResponse>(
      `/organizations/${organizationId}/spaces/${spaceId}/standards/${standardId}`,
    );
  };

  async createStandard(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    },
  ): Promise<Standard> {
    return this._api.post<Standard>(
      `/organizations/${organizationId}/spaces/${spaceId}/standards`,
      standard,
    );
  }

  async updateStandard(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    id: StandardId,
    standard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    },
  ): Promise<Standard> {
    return this._api.post<Standard>(
      `/organizations/${organizationId}/spaces/${spaceId}/standards/${id}`,
      standard,
    );
  }

  async deployStandardsToGit(
    standardVersionIds: StandardVersionId[],
    repositoryIds: GitRepoId[],
  ): Promise<void> {
    return this._api.post<void>(`${this._endpoint}/deploy`, {
      standardVersionIds,
      repositoryIds,
    });
  }

  async deleteStandard(id: StandardId): Promise<void> {
    return this._api.delete<void>(`${this._endpoint}/${id}`);
  }

  async deleteStandardsBatch(standardIds: StandardId[]): Promise<void> {
    return this._api.delete<void>(this._endpoint, {
      data: { standardIds },
    });
  }
}
