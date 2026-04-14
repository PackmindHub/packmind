import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  PackmindEventEmitterService,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  IAccountsPort,
  ILinterPort,
  ISpacesPort,
  IUpdateRuleExampleUseCase,
  ProgrammingLanguage,
  RuleExample,
  RuleId,
  RuleUpdatedEvent,
  UpdateRuleExampleCommand,
  UpdateRuleExampleResponse,
  createOrganizationId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import { RuleExampleNotFoundInSpaceError } from '../../../domain/errors/RuleExampleNotFoundInSpaceError';
import { IStandardsRepositories } from '../../../domain/repositories/IStandardsRepositories';

const origin = 'UpdateRuleExampleUsecase';

export class UpdateRuleExampleUsecase
  extends AbstractSpaceMemberUseCase<
    UpdateRuleExampleCommand,
    UpdateRuleExampleResponse
  >
  implements IUpdateRuleExampleUseCase
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
    command: UpdateRuleExampleCommand & SpaceMemberContext,
  ): Promise<UpdateRuleExampleResponse> {
    const { source = 'ui' } = command;

    if (!command.lang && !command.positive && !command.negative) {
      throw new Error('At least one field must be provided for update');
    }

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

    const updatedExample = await ruleExampleRepository.updateById(
      command.ruleExampleId,
      updateData,
    );

    this.logger.info('Rule example updated', {
      ruleExampleId: command.ruleExampleId,
      updatedFields: Object.keys(updateData),
    });

    const ruleRepository = this._repositories.getRuleRepository();
    const rule = await ruleRepository.findById(existingExample.ruleId);
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

    const languageToValidate = command.lang || existingExample.lang;
    await this.assessOrUpdateRuleDetectionForLanguage(
      existingExample.ruleId,
      languageToValidate as ProgrammingLanguage,
      command.organizationId,
      command.userId,
    );

    return updatedExample;
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

    this.logger.info('Validating detection program for rule and language', {
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
