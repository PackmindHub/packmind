import { PackmindLogger } from '@packmind/logger';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  UpdateRuleDetectionStatusAfterUpdateCommand,
  UpdateRuleDetectionStatusAfterUpdateResponse,
  IUpdateRuleDetectionStatusAfterUpdateUseCase,
  ActiveDetectionProgram,
  IStandardsPort,
  ILinterPort,
  RuleDetectionAssessmentStatus,
} from '@packmind/types';

const origin = 'UpdateRuleDetectionStatusAfterUpdateUseCase';

export class UpdateRuleDetectionStatusAfterUpdateUseCase
  implements IUpdateRuleDetectionStatusAfterUpdateUseCase
{
  constructor(
    private readonly linterRepositories: ILinterRepositories,
    private readonly standardsAdapter: IStandardsPort,
    private readonly getLinterAdapter: () => ILinterPort,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: UpdateRuleDetectionStatusAfterUpdateCommand,
  ): Promise<UpdateRuleDetectionStatusAfterUpdateResponse> {
    this.logger.info('Updating rule detection status after rule update', {
      ruleId: command.ruleId,
      language: command.language,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    // Step 1: Check if active detection program exists
    const activeProgram = await this.linterRepositories
      .getActiveDetectionProgramRepository()
      .findByRuleIdAndLanguage(command.ruleId, command.language);

    if (activeProgram) {
      return await this.updateDetectionProgramStatus(command, activeProgram);
    }

    // Step 2: Check if any detection program exists (not just active)
    const detectionProgram = await this.linterRepositories
      .getDetectionProgramRepository()
      .findByRuleIdAndLanguage(command.ruleId, command.language);

    if (detectionProgram) {
      this.logger.info(
        'Detection program exists but is not active, no action taken',
        {
          ruleId: command.ruleId,
          language: command.language,
          detectionProgramId: detectionProgram.id,
          status: detectionProgram.status,
        },
      );
      return {
        action: 'NO_ACTION',
        message: 'Detection program exists, no action taken',
      };
    }

    // Step 3: No detection program exists - start new assessment
    return await this.startRuleDetectionAssessment(command);
  }

  private async updateDetectionProgramStatus(
    command: UpdateRuleDetectionStatusAfterUpdateCommand,
    activeProgram: ActiveDetectionProgram,
  ): Promise<UpdateRuleDetectionStatusAfterUpdateResponse> {
    // Active program exists - update status
    this.logger.info('Active detection program found, updating status', {
      ruleId: command.ruleId,
      language: command.language,
      activeProgramId: activeProgram.id,
    });

    await this.getLinterAdapter().updateDetectionProgramStatus({
      ruleId: command.ruleId,
      language: command.language,
      organizationId: command.organizationId,
      userId: command.userId,
    });

    this.logger.info('Detection program status updated successfully', {
      ruleId: command.ruleId,
      language: command.language,
    });

    return {
      action: 'STATUS_UPDATED',
      message: 'Detection program status updated',
    };
  }

  private async startRuleDetectionAssessment(
    command: UpdateRuleDetectionStatusAfterUpdateCommand,
  ): Promise<UpdateRuleDetectionStatusAfterUpdateResponse> {
    // No active program exists - check if assessment already exists
    this.logger.info(
      'No active detection program found, checking for existing assessment',
      {
        ruleId: command.ruleId,
        language: command.language,
      },
    );

    // Step 3.1: Check if assessment already exists for this rule and language
    const existingAssessment = await this.linterRepositories
      .getRuleDetectionAssessmentRepository()
      .get(command.ruleId, command.language);

    if (existingAssessment) {
      // If assessment has FAILED, restart it with updated examples
      if (existingAssessment.status === RuleDetectionAssessmentStatus.FAILED) {
        this.logger.info(
          'Failed assessment found, restarting assessment with updated examples',
          {
            ruleId: command.ruleId,
            language: command.language,
            assessmentId: existingAssessment.id,
            previousStatus: existingAssessment.status,
          },
        );
        // Continue to step 3.2 to restart the assessment
      } else {
        // For non-FAILED statuses, no action needed
        this.logger.info(
          'Assessment already exists for this rule and language, no action taken',
          {
            ruleId: command.ruleId,
            language: command.language,
            assessmentId: existingAssessment.id,
            assessmentStatus: existingAssessment.status,
          },
        );
        return {
          action: 'NO_ACTION',
          message: 'Assessment already exists, no action taken',
        };
      }
    }

    // Step 3.2: No assessment exists or FAILED assessment - start/restart assessment
    const action = existingAssessment ? 'Restarting' : 'Starting';
    this.logger.info(`${action} rule detection assessment`, {
      ruleId: command.ruleId,
      language: command.language,
      isRestart: !!existingAssessment,
    });

    const rule = await this.standardsAdapter.getRule(command.ruleId);
    if (!rule) {
      this.logger.error('Rule not found', {
        ruleId: command.ruleId,
      });
      throw new Error(`Rule not found: ${command.ruleId}`);
    }

    await this.getLinterAdapter().startRuleDetectionAssessment({
      rule,
      organizationId: command.organizationId,
      userId: command.userId,
      language: command.language,
    });

    const successMessage = existingAssessment
      ? 'Failed assessment restarted successfully'
      : 'New rule detection assessment started successfully';
    this.logger.info(successMessage, {
      ruleId: command.ruleId,
      language: command.language,
      isRestart: !!existingAssessment,
    });

    return {
      action: 'ASSESSMENT_STARTED',
      message: existingAssessment
        ? 'Failed assessment restarted'
        : 'New rule detection assessment started',
    };
  }
}
