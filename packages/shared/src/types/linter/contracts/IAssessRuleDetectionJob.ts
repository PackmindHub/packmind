import { IUseCase, PackmindCommand } from '@packmind/types';
import { ProgrammingLanguage } from '../../languages/Language';
import { Rule } from '../../standards/Rule';
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
