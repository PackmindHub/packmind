import { IUseCase, PackmindCommand } from '../../UseCase';
import { RuleId } from '../../standards';

export type CopyRuleDetectionAssessmentsCommand = PackmindCommand & {
  oldRuleId: RuleId;
  newRuleId: RuleId;
};

export type CopyRuleDetectionAssessmentsResponse = {
  copiedAssessmentsCount: number;
};

export type ICopyRuleDetectionAssessments = IUseCase<
  CopyRuleDetectionAssessmentsCommand,
  CopyRuleDetectionAssessmentsResponse
>;
