import { PackmindLogger } from '@packmind/logger';
import {
  GetAllDetectionProgramsByRuleCommand,
  GetAllDetectionProgramsByRuleResponse,
  IGetAllDetectionProgramsByRule,
} from '@packmind/types';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';

const origin = 'GetAllDetectionProgramsByRuleUseCase';

export class GetAllDetectionProgramsByRuleUseCase implements IGetAllDetectionProgramsByRule {
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: GetAllDetectionProgramsByRuleCommand,
  ): Promise<GetAllDetectionProgramsByRuleResponse> {
    this.logger.info('Getting all detection programs by rule', {
      ruleId: command.ruleId,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    try {
      const programs = await this.linterRepositories
        .getDetectionProgramRepository()
        .findByRuleId(command.ruleId);

      this.logger.info('Successfully retrieved all detection programs', {
        ruleId: command.ruleId,
        count: programs.length,
      });

      return { programs };
    } catch (error) {
      this.logger.error('Failed to get all detection programs by rule', {
        ruleId: command.ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
