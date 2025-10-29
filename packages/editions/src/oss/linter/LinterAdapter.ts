import {
  ComputeRuleLanguageDetectionStatusCommand,
  ComputeRuleLanguageDetectionStatusResponse,
  CopyDetectionProgramsToNewRuleCommand,
  CopyDetectionProgramsToNewRuleResponse,
  CopyRuleDetectionAssessmentsCommand,
  CopyRuleDetectionAssessmentsResponse,
  ILinterPort,
  RuleLanguageDetectionStatus,
  UpdateRuleDetectionAssessmentAfterUpdateCommand,
  UpdateRuleDetectionAssessmentAfterUpdateResponse,
} from '@packmind/shared';
import { LinterUsecases } from '.';

export class LinterAdapter implements ILinterPort {
  constructor(private readonly linterUsecases: LinterUsecases) {}

  async copyDetectionProgramsToNewRule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CopyDetectionProgramsToNewRuleCommand,
  ): Promise<CopyDetectionProgramsToNewRuleResponse> {
    return {
      copiedProgramsCount: 0,
    };
  }

  async copyRuleDetectionAssessments(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: CopyRuleDetectionAssessmentsCommand,
  ): Promise<CopyRuleDetectionAssessmentsResponse> {
    return {
      copiedAssessmentsCount: 0,
    };
  }

  async updateRuleDetectionAssessmentAfterUpdate(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: UpdateRuleDetectionAssessmentAfterUpdateCommand,
  ): Promise<UpdateRuleDetectionAssessmentAfterUpdateResponse> {
    return {
      action: 'STATUS_UPDATED',
      message: '',
    };
  }

  async computeRuleLanguageDetectionStatus(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    command: ComputeRuleLanguageDetectionStatusCommand,
  ): Promise<ComputeRuleLanguageDetectionStatusResponse> {
    return {
      status: RuleLanguageDetectionStatus.NONE,
    };
  }
}
