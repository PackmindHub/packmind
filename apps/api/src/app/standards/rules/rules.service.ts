import { Injectable } from '@nestjs/common';
import {
  Standard,
  StandardId,
  StandardsHexa,
  Rule,
  RuleExample,
  CreateRuleExampleCommand,
  GetRuleExamplesCommand,
  UpdateRuleExampleCommand,
  DeleteRuleExampleCommand,
} from '@packmind/standards';
import { PackmindLogger } from '@packmind/shared';

@Injectable()
export class RulesService {
  constructor(
    private readonly standardsHexa: StandardsHexa,
    private readonly logger: PackmindLogger,
  ) {}

  async getRulesByStandardId(standardId: StandardId): Promise<Rule[]> {
    return this.standardsHexa.getRulesByStandardId(standardId);
  }

  async getStandardById(standardId: StandardId): Promise<Standard | null> {
    return this.standardsHexa.getStandardById(standardId);
  }

  async createRuleExample(
    command: CreateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this.standardsHexa.createRuleExample(command);
  }

  async getRuleExamples(
    command: GetRuleExamplesCommand,
  ): Promise<RuleExample[]> {
    return this.standardsHexa.getRuleExamples(command);
  }

  async updateRuleExample(
    command: UpdateRuleExampleCommand,
  ): Promise<RuleExample> {
    return this.standardsHexa.updateRuleExample(command);
  }

  async deleteRuleExample(command: DeleteRuleExampleCommand): Promise<void> {
    return this.standardsHexa.deleteRuleExample(command);
  }
}
