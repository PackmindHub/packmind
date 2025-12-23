import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/logger';
import { ILinterRepositories } from '../../../domain/repositories/ILinterRepositories';
import {
  ICopyRuleDetectionAssessments,
  CopyRuleDetectionAssessmentsCommand,
  CopyRuleDetectionAssessmentsResponse,
  RuleDetectionAssessment,
  createRuleDetectionAssessmentId,
} from '@packmind/types';

const origin = 'CopyRuleDetectionAssessmentsUseCase';

export class CopyRuleDetectionAssessmentsUseCase implements ICopyRuleDetectionAssessments {
  constructor(
    private readonly repositories: ILinterRepositories,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  async execute(
    command: CopyRuleDetectionAssessmentsCommand,
  ): Promise<CopyRuleDetectionAssessmentsResponse> {
    this.logger.info(
      'Starting to copy rule detection assessments to new rule',
      {
        oldRuleId: command.oldRuleId,
        newRuleId: command.newRuleId,
        organizationId: command.organizationId,
        userId: command.userId,
      },
    );

    try {
      // Get all RuleDetectionAssessments for the old rule
      const oldAssessments = await this.repositories
        .getRuleDetectionAssessmentRepository()
        .findByRuleId(command.oldRuleId);

      if (oldAssessments.length === 0) {
        this.logger.info('No rule detection assessments found for old rule', {
          oldRuleId: command.oldRuleId,
        });
        return { copiedAssessmentsCount: 0 };
      }

      this.logger.info('Found rule detection assessments to copy', {
        count: oldAssessments.length,
        oldRuleId: command.oldRuleId,
      });

      // Copy all RuleDetectionAssessments
      for (const oldAssessment of oldAssessments) {
        const newAssessment: RuleDetectionAssessment = {
          ...oldAssessment,
          id: createRuleDetectionAssessmentId(uuidv4()),
          ruleId: command.newRuleId,
        };

        await this.repositories
          .getRuleDetectionAssessmentRepository()
          .add(newAssessment);
      }

      this.logger.info(
        'Successfully copied all rule detection assessments to new rule',
        {
          oldRuleId: command.oldRuleId,
          newRuleId: command.newRuleId,
          copiedAssessmentsCount: oldAssessments.length,
        },
      );

      return { copiedAssessmentsCount: oldAssessments.length };
    } catch (error) {
      this.logger.error('Failed to copy rule detection assessments', {
        oldRuleId: command.oldRuleId,
        newRuleId: command.newRuleId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
