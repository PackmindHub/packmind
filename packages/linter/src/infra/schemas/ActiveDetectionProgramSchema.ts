import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { Rule } from '@packmind/types';
import { ActiveDetectionProgram, DetectionProgram } from '@packmind/types';

export const ActiveDetectionProgramSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      ActiveDetectionProgram & {
        rule?: Rule;
        detectionProgram?: DetectionProgram;
        draftDetectionProgram?: DetectionProgram;
      }
    >
  >
>({
  name: 'ActiveDetectionProgram',
  tableName: 'active_detection_programs',
  columns: {
    detectionProgramVersion: {
      name: 'detection_program_version',
      type: 'uuid',
      nullable: true,
    },
    ruleId: {
      name: 'rule_id',
      type: 'uuid',
    },
    language: {
      type: 'varchar',
      length: 50,
    },
    detectionProgramDraftVersion: {
      name: 'detection_program_draft_version',
      type: 'uuid',
      nullable: true,
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
    detectionProgram: {
      type: 'many-to-one',
      target: 'DetectionProgram',
      joinColumn: {
        name: 'detection_program_version',
      },
      onDelete: 'CASCADE',
    },
    draftDetectionProgram: {
      type: 'many-to-one',
      target: 'DetectionProgram',
      joinColumn: {
        name: 'detection_program_draft_version',
      },
      onDelete: 'SET NULL',
    },
  },
  indices: [
    {
      name: 'idx_active_detection_programs_rule_id',
      columns: ['ruleId'],
    },
  ],
  uniques: [
    {
      name: 'uq_active_detection_programs_rule_language',
      columns: ['ruleId', 'language'],
    },
  ],
});
