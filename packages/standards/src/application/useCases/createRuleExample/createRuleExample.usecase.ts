import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import {
  RuleExample,
  createRuleExampleId,
} from '../../../domain/entities/RuleExample';
import { RuleId } from '../../../domain/entities/Rule';
import {
  LogLevel,
  PackmindLogger,
  ProgrammingLanguage,
} from '@packmind/shared';
import { v4 as uuidv4 } from 'uuid';

const origin = 'CreateRuleExampleUsecase';

export type CreateRuleExampleRequest = {
  ruleId: RuleId;
  lang: ProgrammingLanguage;
  positive: string;
  negative: string;
};

export class CreateRuleExampleUsecase {
  constructor(
    private readonly ruleExampleRepository: IRuleExampleRepository,
    private readonly ruleRepository: IRuleRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      origin,
      LogLevel.DEBUG,
    ),
  ) {
    this.logger.info('CreateRuleExampleUsecase initialized');
  }

  public async createRuleExample({
    ruleId,
    lang,
    positive,
    negative,
  }: CreateRuleExampleRequest): Promise<RuleExample> {
    this.logger.info('Starting createRuleExample process', {
      ruleId,
      lang,
    });

    try {
      // Validate that the rule exists
      const rule = await this.ruleRepository.findById(ruleId);
      if (!rule) {
        const error = new Error(`Rule with id ${ruleId} not found`);
        this.logger.error('Rule not found', { ruleId });
        throw error;
      }

      this.logger.debug('Rule found, creating rule example', {
        ruleId,
        ruleContent: rule.content.substring(0, 50) + '...',
      });

      // Validate input parameters
      if (!lang) {
        const error = new Error('Language is required and cannot be empty');
        this.logger.error('Invalid language parameter', { lang });
        throw error;
      }

      // Create the rule example entity
      const ruleExample: RuleExample = {
        id: createRuleExampleId(uuidv4()),
        ruleId,
        lang: lang,
        positive: positive || '',
        negative: negative || '',
      };

      this.logger.debug('Creating rule example entity', {
        id: ruleExample.id,
        ruleId: ruleExample.ruleId,
        lang: ruleExample.lang,
      });

      // Save the rule example
      const savedRuleExample =
        await this.ruleExampleRepository.add(ruleExample);

      this.logger.info('Rule example created successfully', {
        id: savedRuleExample.id,
        ruleId: savedRuleExample.ruleId,
        lang: savedRuleExample.lang,
      });

      return savedRuleExample;
    } catch (error) {
      this.logger.error('Failed to create rule example', {
        ruleId,
        lang,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
