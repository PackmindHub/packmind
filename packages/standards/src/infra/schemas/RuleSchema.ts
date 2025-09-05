import { EntitySchema } from 'typeorm';
import { Rule } from '../../domain/entities/Rule';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/shared';
import { StandardVersion } from '../../domain/entities/StandardVersion';

export const RuleSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      Rule & {
        standardVersion?: StandardVersion;
      }
    >
  >
>({
  name: 'Rule',
  tableName: 'rules',
  columns: {
    content: {
      type: 'text',
    },
    standardVersionId: {
      name: 'standard_version_id',
      type: 'uuid',
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    standardVersion: {
      type: 'many-to-one',
      target: 'StandardVersion',
      joinColumn: {
        name: 'standard_version_id',
      },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    {
      name: 'idx_rule_standard_version',
      columns: ['standardVersionId'],
    },
  ],
});
