import { PackmindLogger } from '@packmind/shared';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import {
  IDeleteRuleExample,
  DeleteRuleExampleCommand,
} from '../../../domain/useCases/IDeleteRuleExample';

export class DeleteRuleExampleUsecase implements IDeleteRuleExample {
  constructor(
    private readonly _repositories: IStandardsRepositories,
    private readonly _logger: PackmindLogger,
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

    // Delete the rule example
    await ruleExampleRepository.deleteById(command.ruleExampleId);

    this._logger.info('DeleteRuleExampleUsecase.execute completed', {
      ruleExampleId: command.ruleExampleId,
    });
  }
}
