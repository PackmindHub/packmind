import { Injectable } from '@nestjs/common';
import {
  StandardId,
  StandardsHexa,
  Rule,
  RuleExample,
  CreateRuleExampleCommand,
  GetRuleExamplesCommand,
  UpdateRuleExampleCommand,
  DeleteRuleExampleCommand,
} from '@packmind/standards';
import { PackmindLogger } from '@packmind/logger';

@Injectable()
export class RulesService {
  constructor(
    private readonly standardsHexa: StandardsHexa,
    private readonly logger: PackmindLogger,
  ) {}

  async getRulesByStandardId(standardId: StandardId): Promise<Rule[]> {
    return this.standardsHexa.getAdapter().getRulesByStandardId(standardId);
  }

  async createRuleExample(
    command: CreateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this.standardsHexa.getAdapter().createRuleExample(command);
  }

  async getRuleExamples(
    command: GetRuleExamplesCommand,
  ): Promise<RuleExample[]> {
    return this.standardsHexa.getAdapter().getRuleExamples(command);
  }

  async updateRuleExample(
    command: UpdateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this.standardsHexa.getAdapter().updateRuleExample(command);
  }

  async deleteRuleExample(command: DeleteRuleExampleCommand): Promise<void> {
    return this.standardsHexa.getAdapter().deleteRuleExample(command);
  }
}
