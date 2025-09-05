import { RuleExample, PackmindLogger } from '@packmind/shared';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import {
  IUpdateRuleExample,
  UpdateRuleExampleCommand,
} from '../../../domain/useCases/IUpdateRuleExample';

export class UpdateRuleExampleUsecase implements IUpdateRuleExample {
  constructor(
    private readonly _repositories: IStandardsRepositories,
    private readonly _logger: PackmindLogger,
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

    return updatedExample;
  }
}
