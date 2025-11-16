import { DetectionProgramSchema } from './DetectionProgramSchema';
import { ActiveDetectionProgramSchema } from './ActiveDetectionProgramSchema';
import { RuleDetectionAssessmentSchema } from './RuleDetectionAssessmentSchema';
import { DetectionHeuristicsSchema } from './DetectionHeuristicsSchema';

export {
  DetectionProgramSchema,
  ActiveDetectionProgramSchema,
  RuleDetectionAssessmentSchema,
  DetectionHeuristicsSchema,
};

export const linterSchemas = [
  DetectionProgramSchema,
  ActiveDetectionProgramSchema,
  RuleDetectionAssessmentSchema,
  DetectionHeuristicsSchema,
];
