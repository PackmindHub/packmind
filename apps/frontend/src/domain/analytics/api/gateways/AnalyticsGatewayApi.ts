import { PackmindGateway } from '../../../../shared/PackmindGateway';
import {
  GitRepoId,
  TargetId,
  OrganizationUsageAnalytics,
  TargetUsageAnalytics,
  TimePeriod,
} from '@packmind/types';
import { IAnalyticsGateway } from './IAnalyticsGateway';

export class AnalyticsGatewayApi
  extends PackmindGateway
  implements IAnalyticsGateway
{
  constructor() {
    super('/recipes');
  }

  async getRecipeUsageAnalytics(
    timePeriod?: TimePeriod,
    repositoryId?: GitRepoId,
    targetId?: TargetId,
  ): Promise<OrganizationUsageAnalytics | TargetUsageAnalytics> {
    const params = new URLSearchParams();
    if (timePeriod) {
      params.append('timePeriod', timePeriod);
    }
    if (repositoryId) {
      params.append('repositoryId', repositoryId);
    }
    if (targetId) {
      params.append('targetId', targetId);
    }
    const queryString = params.toString();
    return this._api.get<OrganizationUsageAnalytics | TargetUsageAnalytics>(
      `/analytics/recipes/usage${queryString ? `?${queryString}` : ''}`,
    );
  }
}
