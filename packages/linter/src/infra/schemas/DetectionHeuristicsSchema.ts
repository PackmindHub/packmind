import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { DetectionHeuristics, Rule } from '@packmind/types';

export const DetectionHeuristicsSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      DetectionHeuristics & {
        rule?: Rule;
      }
    >
  >
>({
  name: 'DetectionHeuristics',
  tableName: 'detection_heuristics',
  columns: {
    ruleId: {
      name: 'rule_id',
      type: 'uuid',
      nullable: false,
    },
    language: {
      type: 'varchar',
      nullable: false,
    },
    heuristics: {
      type: 'text',
      array: true,
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
      name: 'idx_detection_heuristics_rule_id',
      columns: ['ruleId'],
    },
    {
      name: 'uq_detection_heuristics_rule_language',
      columns: ['ruleId', 'language'],
      unique: true,
      where: 'deleted_at IS NULL',
    },
  ],
});
