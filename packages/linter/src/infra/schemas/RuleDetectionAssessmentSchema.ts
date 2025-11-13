import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { Rule } from '@packmind/types';
import {
  RuleDetectionAssessment,
  RuleDetectionAssessmentStatus,
  DetectionModeEnum,
} from '@packmind/types';

export const RuleDetectionAssessmentSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      RuleDetectionAssessment & {
        rule?: Rule;
      }
    >
  >
>({
  name: 'RuleDetectionAssessment',
  tableName: 'rule_detection_assessments',
  columns: {
    ruleId: {
      name: 'rule_id',
      type: 'uuid',
    },
    language: {
      type: 'varchar',
      nullable: false,
    },
    detectionMode: {
      name: 'detection_mode',
      type: 'enum',
      enum: DetectionModeEnum,
      nullable: false,
    },
    status: {
      type: 'enum',
      enum: RuleDetectionAssessmentStatus,
      nullable: false,
    },
    details: {
      type: 'text',
      nullable: false,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    rule: {
      type: 'many-to-one',
      target: 'Rule',
      joinColumn: {
        name: 'rule_id',
      },
      onDelete: 'CASCADE',
    },
  },
});
