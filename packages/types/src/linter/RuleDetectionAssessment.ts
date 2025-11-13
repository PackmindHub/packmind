import { Branded, brandedIdFactory } from '../brandedTypes';
import { ProgrammingLanguage } from '../languages';
import { RuleId } from '../standards';
import { DetectionModeEnum } from './DetectionProgram';

export type RuleDetectionAssessmentId = Branded<'RuleDetectionAssessmentId'>;
export const createRuleDetectionAssessmentId =
  brandedIdFactory<RuleDetectionAssessmentId>();

export enum RuleDetectionAssessmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  SUCCESS = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export type RuleDetectionAssessment = {
  id: RuleDetectionAssessmentId;
  ruleId: RuleId;
  language: ProgrammingLanguage;
  detectionMode: DetectionModeEnum;
  status: RuleDetectionAssessmentStatus;
  details: string;
  clarificationQuestion: string | null;
  clarificationAnswers: string[] | null;
};
