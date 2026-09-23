import { RuleNotFoundError } from '../../../domain/errors/RuleNotFoundError';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { RuleExample } from '@packmind/types';
import { RuleId } from '@packmind/types';
import { LogLevel, PackmindLogger } from '@packmind/logger';

const origin = 'GetRuleExamplesUseCase';

export type GetRuleExamplesRequest = {
  ruleId: RuleId;
};

export class GetRuleExamplesUseCase {
  constructor(
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly ruleRepository: IRuleRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetRuleExamplesUseCase initialized');
  }

  public async getRuleExamples({
    ruleId,
  }: GetRuleExamplesRequest): Promise<RuleExample[]> {
    this.logger.info('Starting getRuleExamples process', {
      ruleId,
    });

    const rule = await this.ruleRepository.findById(ruleId);
    if (!rule) {
      throw new RuleNotFoundError(ruleId);
    }

    this.logger.debug('Rule found, getting rule examples', {
      ruleId,
      ruleContent: rule.content.substring(0, 50) + '...',
    });

    const ruleExamples = await this.ruleExampleRepository.findByRuleId(ruleId);

    this.logger.info('Rule examples retrieved successfully', {
      ruleId,
      count: ruleExamples.length,
    });

    return ruleExamples;
  }
}
