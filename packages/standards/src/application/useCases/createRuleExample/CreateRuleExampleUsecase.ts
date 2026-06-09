import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  PackmindEventEmitterService,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  CreateRuleExampleCommand,
  CreateRuleExampleResponse,
  IAccountsPort,
  ICreateRuleExampleUseCase,
  ILinterPort,
  ISpacesPort,
  ProgrammingLanguage,
  RuleExample,
  RuleId,
  RuleUpdatedEvent,
  createOrganizationId,
  createRuleExampleId,
  createStandardId,
  createStandardVersionId,
  createUserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { RuleNotInSpaceError } from '../../../domain/errors/RuleNotInSpaceError';
import { IRuleExampleRepository } from '../../../domain/repositories/IRuleExampleRepository';
import { IRuleRepository } from '../../../domain/repositories/IRuleRepository';
import { IStandardVersionRepository } from '../../../domain/repositories/IStandardVersionRepository';

const origin = 'CreateRuleExampleUsecase';

export class CreateRuleExampleUsecase
  extends AbstractSpaceMemberUseCase<
    CreateRuleExampleCommand,
    CreateRuleExampleResponse
  >
  implements ICreateRuleExampleUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsAdapter: IAccountsPort,
    private readonly _ruleExampleRepository: IRuleExampleRepository,
    private readonly _ruleRepository: IRuleRepository,
    private readonly _standardVersionRepository: IStandardVersionRepository,
    private readonly _eventEmitterService: PackmindEventEmitterService,
    private readonly _linterAdapter?: ILinterPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsAdapter, logger);
  }

  async executeForSpaceMembers(
    command: CreateRuleExampleCommand & SpaceMemberContext,
  ): Promise<CreateRuleExampleResponse> {
    const {
      ruleId,
      lang,
      positive,
      negative,
      organizationId,
      userId,
      source = 'ui',
    } = command;

    if (!lang) {
      throw new Error('Language is required and cannot be empty');
    }

    const rule = await this._ruleRepository.findByIdInSpace(
      ruleId,
      command.spaceId,
    );

    if (!rule) {
      throw new RuleNotInSpaceError(ruleId, command.spaceId);
    }

    const ruleExample: RuleExample = {
      id: createRuleExampleId(uuidv4()),
      ruleId,
      lang,
      positive: positive || '',
      negative: negative || '',
    };

    const savedRuleExample = await this._ruleExampleRepository.add(ruleExample);

    this.logger.info('Rule example created', {
      ruleExampleId: savedRuleExample.id,
      ruleId: savedRuleExample.ruleId,
      lang: savedRuleExample.lang,
    });

    const standardVersion = await this._standardVersionRepository.findById(
      rule.standardVersionId,
    );
    if (standardVersion) {
      this._eventEmitterService.emit(
        new RuleUpdatedEvent({
          standardId: createStandardId(standardVersion.standardId),
          standardVersionId: createStandardVersionId(standardVersion.id),
          newVersion: standardVersion.version,
          organizationId: createOrganizationId(organizationId),
          userId: createUserId(userId),
          source,
        }),
      );
    }

    if (this._linterAdapter) {
      await this.assessOrUpdateRuleDetectionForLanguage(
        ruleId,
        lang,
        organizationId,
        userId,
      );
    }

    return savedRuleExample;
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
      this.logger.error('Failed to update detection program status', {
        ruleId,
        language,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
