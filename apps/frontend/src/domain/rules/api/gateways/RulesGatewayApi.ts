import { RuleExample, RuleExampleId } from '@packmind/shared/types';
import { RuleId } from '@packmind/shared/types';
import { PackmindGateway } from '../../../../shared/PackmindGateway';
import { IRulesGateway } from './IRulesGateway';

export class RulesGatewayApi extends PackmindGateway implements IRulesGateway {
  constructor() {
    super('/standards');
  }

  async createRuleExample(
    standardId: string,
    ruleId: RuleId,
    example: {
      lang: string;
      positive: string;
      negative: string;
    },
  ): Promise<RuleExample> {
    return this._api.post<RuleExample>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/examples`,
      example,
    );
  }

  async getRuleExamples(
    standardId: string,
    ruleId: RuleId,
  ): Promise<RuleExample[]> {
    return this._api.get<RuleExample[]>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/examples`,
    );
  }

  async updateRuleExample(
    standardId: string,
    ruleId: RuleId,
    exampleId: RuleExampleId,
    updates: {
      lang?: string;
      positive?: string;
      negative?: string;
    },
  ): Promise<RuleExample> {
    return this._api.put<RuleExample>(
      `${this._endpoint}/${standardId}/rules/${ruleId}/examples/${exampleId}`,
      updates,
    );
  }

  async deleteRuleExample(
    standardId: string,
    ruleId: RuleId,
    exampleId: RuleExampleId,
  ): Promise<void> {
    await this._api.delete(
      `${this._endpoint}/${standardId}/rules/${ruleId}/examples/${exampleId}`,
    );
  }
}
