import { PackmindLogger } from '@packmind/logger';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import {
  IDeleteRuleExample,
  DeleteRuleExampleCommand,
} from '../../../domain/useCases/IDeleteRuleExample';
import { RuleId } from '../../../domain/entities/Rule';
import { ProgrammingLanguage } from '@packmind/types';
import type { ILinterPort } from '@packmind/types';

const origin = 'DeleteRuleExampleUsecase';

export class DeleteRuleExampleUsecase implements IDeleteRuleExample {
  constructor(
    private readonly _repositories: IStandardsRepositories,
    private readonly _linterAdapter?: ILinterPort,
    private readonly _logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(command: DeleteRuleExampleCommand): Promise<void> {
    this._logger.info('DeleteRuleExampleUsecase.execute', { command });

    // Check if the rule example exists
    const ruleExampleRepository = this._repositories.getRuleExampleRepository();
    const existingExample = await ruleExampleRepository.findById(
      command.ruleExampleId,
    );

    if (!existingExample) {
      throw new Error(
        `Rule example with id ${command.ruleExampleId} not found`,
      );
    }

    // Store info before deletion for validation
    const ruleId = existingExample.ruleId;
    const language = existingExample.lang;

    // Delete the rule example
    await ruleExampleRepository.deleteById(command.ruleExampleId);

    this._logger.info('DeleteRuleExampleUsecase.execute completed', {
      ruleExampleId: command.ruleExampleId,
    });

    // Validate detection programs for the deleted example's language
    await this.assessOrUpdateRuleDetectionForLanguage(
      ruleId,
      language,
      command.organizationId,
      command.userId,
    );
  }

  public async assessOrUpdateRuleDetectionForLanguage(
    ruleId: RuleId,
    language: ProgrammingLanguage,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    if (!this._linterAdapter) {
      this._logger.warn(
        'Linter adapter not available, skipping detection program validation',
        { ruleId, language },
      );
      return;
    }

    this._logger.info('Validating detection programs for rule and language', {
      ruleId,
      language,
    });

    try {
      await this._linterAdapter.updateRuleDetectionAssessmentAfterUpdate({
        ruleId,
        language,
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(userId),
      });
      this._logger.debug('Detection program validation triggered', {
        ruleId,
        language,
      });
    } catch (error) {
      this._logger.error('Failed to update detection program status', {
        ruleId,
        language,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
