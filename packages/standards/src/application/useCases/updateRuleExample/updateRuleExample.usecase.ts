import { RuleExample, RuleId, ProgrammingLanguage } from '@packmind/shared';
import { PackmindLogger } from '@packmind/logger';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import {
  IUpdateRuleExample,
  UpdateRuleExampleCommand,
} from '../../../domain/useCases/IUpdateRuleExample';
import {
  OrganizationId,
  UserId,
  createOrganizationId,
  createUserId,
} from '@packmind/accounts';
import type { ILinterPort } from '@packmind/shared';

const origin = 'UpdateRuleExampleUsecase';
export class UpdateRuleExampleUsecase implements IUpdateRuleExample {
  constructor(
    private readonly _repositories: IStandardsRepositories,
    private readonly _linterAdapter?: ILinterPort,
    private readonly _logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: UpdateRuleExampleCommand): Promise<RuleExample> {
    this._logger.info('UpdateRuleExampleUsecase.execute', { command });

    // Validate that at least one field is provided for update
    if (!command.lang && !command.positive && !command.negative) {
      throw new Error('At least one field must be provided for update');
    }

    // Get the existing rule example
    const ruleExampleRepository = this._repositories.getRuleExampleRepository();
    const existingExample = await ruleExampleRepository.findById(
      command.ruleExampleId,
    );

    if (!existingExample) {
      throw new Error(
        `Rule example with id ${command.ruleExampleId} not found`,
      );
    }

    // Prepare update data with trimmed values where applicable
    const updateData: Partial<RuleExample> = {};

    if (command.lang !== undefined) {
      if (!command.lang) {
        throw new Error('Language cannot be empty');
      }
      updateData.lang = command.lang;
    }

    if (command.positive !== undefined) {
      updateData.positive = command.positive || '';
    }

    if (command.negative !== undefined) {
      updateData.negative = command.negative || '';
    }

    // Update the rule example
    const updatedExample = await ruleExampleRepository.updateById(
      command.ruleExampleId,
      updateData,
    );

    this._logger.info('UpdateRuleExampleUsecase.execute completed', {
      ruleExampleId: command.ruleExampleId,
      updatedFields: Object.keys(updateData),
    });

    // Validate detection program for the updated language
    const languageToValidate = command.lang || existingExample.lang;
    await this.assessOrUpdateRuleDetectionForLanguage(
      existingExample.ruleId,
      languageToValidate as ProgrammingLanguage,
      createOrganizationId(command.organizationId),
      createUserId(command.userId),
    );

    return updatedExample;
  }

  public async assessOrUpdateRuleDetectionForLanguage(
    ruleId: RuleId,
    language: ProgrammingLanguage,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<void> {
    if (!this._linterAdapter) {
      return;
    }

    this._logger.info('Validating detection program for rule and language', {
      ruleId,
      language,
    });

    try {
      await this._linterAdapter.updateRuleDetectionAssessmentAfterUpdate({
        ruleId,
        language,
        organizationId,
        userId,
      });
    } catch (error) {
      this._logger.error('Failed to update detection program status', {
        ruleId,
        language,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
