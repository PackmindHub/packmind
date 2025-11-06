import { PackmindLogger } from '@packmind/logger';
import { StandardVersionId, getErrorMessage } from '@packmind/shared';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';
import {
  IUpdateStandardVersionSummary,
  UpdateStandardVersionSummaryCommand,
} from '../../../domain/useCases/IUpdateStandardVersionSummary';

const origin = 'UpdateStandardVersionSummary';

export class UpdateStandardVersionSummaryUsecase
  implements IUpdateStandardVersionSummary
{
  constructor(
    private readonly _repositories: IStandardsRepositories,
    private readonly _logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: UpdateStandardVersionSummaryCommand,
  ): Promise<StandardVersionId> {
    this._logger.info(`[${origin}] Execute command`);

    // Validate that at least one field is provided for update
    if (!command.summary?.length) {
      throw new Error('Summary is empty, it will not be updated');
    }

    // Get the existing rule example
    const standardVersionRepository =
      this._repositories.getStandardVersionRepository();

    // Update the rule example
    try {
      const result = await standardVersionRepository.updateSummary(
        command.standardVersionId,
        command.summary,
      );

      this._logger.info(`${origin}.execute completed`, {
        standardVersionId: command.standardVersionId,
        updated: result,
      });
    } catch (error) {
      this._logger.error(`${origin}.execute failed`, {
        standardVersionId: command.standardVersionId,
        error: getErrorMessage(error),
      });
    }

    return command.standardVersionId;
  }
}
