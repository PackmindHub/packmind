import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { RuleExample } from '@packmind/types';
import { RuleId } from '@packmind/types';
import { LogLevel, PackmindLogger } from '@packmind/logger';

const origin = 'GetRuleExamplesUsecase';

export type GetRuleExamplesRequest = {
  ruleId: RuleId;
};

export class GetRuleExamplesUsecase {
  constructor(
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly ruleRepository: IRuleRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetRuleExamplesUsecase initialized');
  }

  public async getRuleExamples({
    ruleId,
  }: GetRuleExamplesRequest): Promise<RuleExample[]> {
    this.logger.info('Starting getRuleExamples process', {
      ruleId,
    });

    try {
      // Validate that the rule exists
      const rule = await this.ruleRepository.findById(ruleId);
      if (!rule) {
        const error = new Error(`Rule with id ${ruleId} not found`);
        this.logger.error('Rule not found', { ruleId });
        throw error;
      }

      this.logger.debug('Rule found, getting rule examples', {
        ruleId,
        ruleContent: rule.content.substring(0, 50) + '...',
      });

      // Get rule examples
      const ruleExamples =
        await this.ruleExampleRepository.findByRuleId(ruleId);

      this.logger.info('Rule examples retrieved successfully', {
        ruleId,
        count: ruleExamples.length,
      });

      return ruleExamples;
    } catch (error) {
      this.logger.error('Failed to get rule examples', {
        ruleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
