import {
  Standard,
  StandardVersion,
  StandardId,
  StandardVersionId,
  Rule,
} from '@packmind/standards/types';
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

  async getStandards(): Promise<Standard[]> {
    return this._api.get<Standard[]>(this._endpoint);
  }

  async getStandardById(id: StandardId): Promise<Standard> {
    return this._api.get<Standard>(`${this._endpoint}/${id}`);
  }

  async createStandard(standard: {
    name: string;
    description: string;
    rules: Array<{ content: string }>;
    scope?: string | null;
  }): Promise<Standard> {
    return this._api.put<Standard>(this._endpoint, standard);
  }

  async updateStandard(
    id: StandardId,
    standard: {
      name: string;
      description: string;
      rules: Array<{ content: string }>;
      scope?: string | null;
    },
  ): Promise<Standard> {
    return this._api.post<Standard>(`${this._endpoint}/${id}`, standard);
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
