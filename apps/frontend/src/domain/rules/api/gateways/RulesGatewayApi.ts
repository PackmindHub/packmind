import {
  OrganizationId,
  RuleExample,
  RuleExampleId,
  RuleId,
  SpaceId,
  StandardId,
} from '@packmind/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IRulesGateway } from './IRulesGateway';

export class RulesGatewayApi extends PackmindGateway implements IRulesGateway {
  constructor() {
    super('/organizations');
  }

  async createRuleExample(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
    ruleId: RuleId,
    example: {
      lang: string;
      positive: string;
      negative: string;
    },
  ): Promise<RuleExample> {
    return this._api.post<RuleExample>(
      `${this._endpoint}/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules/${ruleId}/examples`,
      example,
    );
  }

  async getRuleExamples(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
    ruleId: RuleId,
  ): Promise<RuleExample[]> {
    return this._api.get<RuleExample[]>(
      `${this._endpoint}/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules/${ruleId}/examples`,
    );
  }

  async updateRuleExample(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
    ruleId: RuleId,
    exampleId: RuleExampleId,
    updates: {
      lang?: string;
      positive?: string;
      negative?: string;
    },
  ): Promise<RuleExample> {
    return this._api.put<RuleExample>(
      `${this._endpoint}/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules/${ruleId}/examples/${exampleId}`,
      updates,
    );
  }

  async deleteRuleExample(
    organizationId: OrganizationId,
    spaceId: SpaceId,
    standardId: StandardId,
    ruleId: RuleId,
    exampleId: RuleExampleId,
  ): Promise<void> {
    await this._api.delete(
      `${this._endpoint}/${organizationId}/spaces/${spaceId}/standards/${standardId}/rules/${ruleId}/examples/${exampleId}`,
    );
  }
}
