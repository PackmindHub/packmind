import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  PackmindEventEmitterService,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  DeleteRuleExampleCommand,
  DeleteRuleExampleResponse,
  IAccountsPort,
  IDeleteRuleExampleUseCase,
  ILinterPort,
  ISpacesPort,
  ProgrammingLanguage,
  RuleId,
  RuleUpdatedEvent,
  createOrganizationId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import { RuleExampleNotFoundInSpaceError } from '../../../domain/errors/RuleExampleNotFoundInSpaceError';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';

const origin = 'DeleteRuleExampleUsecase';

export class DeleteRuleExampleUsecase
  extends AbstractSpaceMemberUseCase<
    DeleteRuleExampleCommand,
    DeleteRuleExampleResponse
  >
  implements IDeleteRuleExampleUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly _repositories: IStandardsRepositories,
    private readonly _eventEmitterService: PackmindEventEmitterService,
    private readonly _linterAdapter?: ILinterPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
  }

  async executeForSpaceMembers(
    command: DeleteRuleExampleCommand & SpaceMemberContext,
  ): Promise<DeleteRuleExampleResponse> {
    const { source = 'ui' } = command;
    const ruleExampleRepository = this._repositories.getRuleExampleRepository();
    const existingExample = await ruleExampleRepository.findByIdInSpace(
      command.ruleExampleId,
      command.spaceId,
    );

    if (!existingExample) {
      throw new RuleExampleNotFoundInSpaceError(
        command.ruleExampleId,
        command.spaceId,
      );
    }

    const ruleId = existingExample.ruleId;
    const language = existingExample.lang;

    await ruleExampleRepository.deleteById(command.ruleExampleId);

    this.logger.info('Rule example deleted', {
      ruleExampleId: command.ruleExampleId,
    });

    const ruleRepository = this._repositories.getRuleRepository();
    const rule = await ruleRepository.findById(ruleId);
    if (rule) {
      const standardVersionRepository =
        this._repositories.getStandardVersionRepository();
      const standardVersion = await standardVersionRepository.findById(
        rule.standardVersionId,
      );
      if (standardVersion) {
        this._eventEmitterService.emit(
          new RuleUpdatedEvent({
            standardId: createStandardId(standardVersion.standardId),
            standardVersionId: createStandardVersionId(standardVersion.id),
            newVersion: standardVersion.version,
            organizationId: createOrganizationId(command.organizationId),
            userId: createUserId(command.userId),
            source,
          }),
        );
      }
    }

    await this.assessOrUpdateRuleDetectionForLanguage(
      ruleId,
      language as ProgrammingLanguage,
      command.organizationId,
      command.userId,
    );

    return {};
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

    this.logger.info('Validating detection programs for rule and language', {
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
    } catch (error) {
      this.logger.error('Failed to update detection program status', {
        ruleId,
        language,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
