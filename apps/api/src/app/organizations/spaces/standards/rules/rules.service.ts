import { Injectable } from '@nestjs/common';
import { PackmindLogger } from '@packmind/logger';
import { GetRuleExamplesCommand, StandardsHexa } from '@packmind/standards';
import {
  CreateRuleExampleCommand,
  DeleteRuleExampleCommand,
  DeleteRuleExampleResponse,
  GetStandardByIdResponse,
  OrganizationId,
  Rule,
  RuleExample,
  SpaceId,
  StandardId,
  UpdateRuleExampleCommand,
  UserId,
} from '@packmind/types';

@Injectable()
export class RulesService {
  constructor(
    private readonly standardsHexa: StandardsHexa,
    private readonly logger: PackmindLogger,
  ) {}

  async getStandardById(
    standardId: StandardId,
    organizationId: OrganizationId,
    spaceId: SpaceId,
    userId: UserId,
  ): Promise<GetStandardByIdResponse> {
    return this.standardsHexa.getAdapter().getStandardById({
      standardId,
      organizationId,
      spaceId,
      userId,
    });
  }

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

  async deleteRuleExample(
    command: DeleteRuleExampleCommand,
  ): Promise<DeleteRuleExampleResponse> {
    return this.standardsHexa.getAdapter().deleteRuleExample(command);
  }
}
