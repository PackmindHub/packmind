import { EntitySchema } from 'typeorm';
import {
  DetectionProgram,
  DetectionModeEnum,
  DetectionStatus,
  Rule,
} from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';

export const DetectionProgramSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      DetectionProgram & {
        rule?: Rule;
      }
    >
  >
>({
  name: 'DetectionProgram',
  tableName: 'detection_programs',
  columns: {
    code: {
      type: 'text',
    },
    version: {
      type: 'int',
    },
    mode: {
      type: 'enum',
      enum: DetectionModeEnum,
    },
    ruleId: {
      name: 'rule_id',
      type: 'uuid',
    },
    language: {
      type: 'varchar',
      nullable: false,
    },
    status: {
      type: 'enum',
      enum: DetectionStatus,
      nullable: false,
    },
    sourceCodeState: {
      name: 'source_code_state',
      type: 'varchar',
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
  indices: [
    {
      name: 'idx_detection_programs_rule_id',
      columns: ['ruleId'],
    },
    {
      name: 'idx_detection_programs_rule_language_unique_version',
      columns: ['ruleId', 'language', 'version'],
      unique: true,
    },
  ],
});
