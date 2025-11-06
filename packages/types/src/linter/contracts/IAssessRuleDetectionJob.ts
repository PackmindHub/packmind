import { IUseCase, PackmindCommand } from '../../UseCase';
import { ProgrammingLanguage } from '../../languages';
import { Rule } from '../../standards';
import { AssessRuleDetectionOutput } from '../AssessRuleDetectionOutput';
import { RuleDetectionAssessmentId } from '../RuleDetectionAssessment';

export type AssessRuleDetectionJobCommand = PackmindCommand & {
  rule: Rule;
  jobId: string;
  language: ProgrammingLanguage;
  assessmentId: RuleDetectionAssessmentId;
};

export type IAssessRuleDetectionJob = IUseCase<
  AssessRuleDetectionJobCommand,
  AssessRuleDetectionOutput
>;
