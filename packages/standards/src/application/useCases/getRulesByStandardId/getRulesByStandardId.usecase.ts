import { StandardVersionService } from '../../services/StandardVersionService';
import { Rule } from '@packmind/types';
import { StandardId } from '@packmind/types';
import { LogLevel, PackmindLogger } from '@packmind/logger';

const origin = 'GetRulesByStandardIdUsecase';

export class GetRulesByStandardIdUsecase {
  constructor(
    private readonly standardVersionService: StandardVersionService,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('GetRulesByStandardIdUsecase initialized');
  }

  public async getRulesByStandardId(standardId: StandardId): Promise<Rule[]> {
    this.logger.info('Getting rules by standard ID', { standardId });

    try {
      const rules =
        await this.standardVersionService.getLatestRulesByStandardId(
          standardId,
        );
      this.logger.debug('Retrieved rules', {
        standardId,
        ruleCount: rules.length,
      });
      return rules;
    } catch (error) {
      this.logger.error('Failed to get rules by standard ID', {
        standardId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
