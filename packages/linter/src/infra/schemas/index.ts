import { DetectionProgramSchema } from './DetectionProgramSchema';
import { ActiveDetectionProgramSchema } from './ActiveDetectionProgramSchema';
import { RuleDetectionAssessmentSchema } from './RuleDetectionAssessmentSchema';

export {
  DetectionProgramSchema,
  ActiveDetectionProgramSchema,
  RuleDetectionAssessmentSchema,
};

export const linterSchemas = [
  DetectionProgramSchema,
  ActiveDetectionProgramSchema,
  RuleDetectionAssessmentSchema,
];
