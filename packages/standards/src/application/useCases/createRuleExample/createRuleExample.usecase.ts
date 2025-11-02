import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import {
  RuleExample,
  createRuleExampleId,
} from '../../../domain/entities/RuleExample';
import { RuleId } from '../../../domain/entities/Rule';
import {
  PackmindLogger,
  getErrorMessage,
  ProgrammingLanguage,
} from '@packmind/shared';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateRuleExampleCommand,
  ICreateRuleExample,
} from '../../../domain/useCases/ICreateRuleExample';
import type { ILinterPort } from '@packmind/shared';

const origin = 'CreateRuleExampleUsecase';

export class CreateRuleExampleUsecase implements ICreateRuleExample {
  constructor(
    private readonly _ruleExampleRepository: IRuleExampleRepository,
    private readonly _ruleRepository: IRuleRepository,
    private readonly _linterAdapter?: ILinterPort,
    private readonly _logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: CreateRuleExampleCommand): Promise<RuleExample> {
    this._logger.info(`[${origin}] Execute command`);

    const { ruleId, lang, positive, negative, organizationId, userId } =
      command;

    // Validate input parameters
    if (!lang) {
      throw new Error('Language is required and cannot be empty');
    }

    // Validate that the rule exists
    const rule = await this._ruleRepository.findById(ruleId);
    if (!rule) {
      throw new Error(`Rule with id ${ruleId} not found`);
    }

    // Create the rule example entity
    const ruleExample: RuleExample = {
      id: createRuleExampleId(uuidv4()),
      ruleId,
      lang: lang,
      positive: positive || '',
      negative: negative || '',
    };

    try {
      // Save the rule example
      const savedRuleExample =
        await this._ruleExampleRepository.add(ruleExample);

      this._logger.info(`${origin}.execute completed`, {
        ruleExampleId: savedRuleExample.id,
        ruleId: savedRuleExample.ruleId,
        lang: savedRuleExample.lang,
      });

      // Validate detection programs for the current language
      if (this._linterAdapter && organizationId && userId) {
        await this.assessOrUpdateRuleDetectionForLanguage(
          ruleId,
          lang,
          organizationId,
          userId,
        );
      }

      return savedRuleExample;
    } catch (error) {
      this._logger.error(`${origin}.execute failed`, {
        ruleId,
        lang,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  private async assessOrUpdateRuleDetectionForLanguage(
    ruleId: RuleId,
    language: ProgrammingLanguage,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    if (!this._linterAdapter) {
      return;
    }

    try {
      await this._linterAdapter.updateRuleDetectionAssessmentAfterUpdate({
        ruleId,
        language,
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(userId),
      });
    } catch (error) {
      this._logger.error('Failed to update detection program status', {
        ruleId,
        language,
        organizationId,
        error: getErrorMessage(error),
      });
      // Don't throw - we want rule example creation to succeed even if detection program update fails
    }
  }
}
