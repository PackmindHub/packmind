import { DetectionProgramSchema } from './DetectionProgramSchema';
import { ActiveDetectionProgramSchema } from './ActiveDetectionProgramSchema';
import { RuleDetectionAssessmentSchema } from './RuleDetectionAssessmentSchema';
import { DetectionHeuristicsSchema } from './DetectionHeuristicsSchema';
import { DetectionProgramMetadataSchema } from './DetectionProgramMetadataSchema';
import { ExecutionLogSchema } from './ExecutionLogSchema';

export {
  DetectionProgramSchema,
  ActiveDetectionProgramSchema,
  RuleDetectionAssessmentSchema,
  DetectionHeuristicsSchema,
  DetectionProgramMetadataSchema,
  ExecutionLogSchema,
};

export const linterSchemas = [
  DetectionProgramSchema,
  ActiveDetectionProgramSchema,
  RuleDetectionAssessmentSchema,
  DetectionHeuristicsSchema,
  DetectionProgramMetadataSchema,
  ExecutionLogSchema,
];
