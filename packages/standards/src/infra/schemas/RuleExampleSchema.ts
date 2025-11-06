import { EntitySchema } from 'typeorm';
import { RuleExample } from '../../domain/entities/RuleExample';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { Rule } from '../../domain/entities/Rule';

export const RuleExampleSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      RuleExample & {
        rule?: Rule;
      }
    >
  >
>({
  name: 'RuleExample',
  tableName: 'rule_examples',
  columns: {
    lang: {
      type: 'varchar',
      nullable: false,
    },
    positive: {
      type: 'text',
      nullable: false,
    },
    negative: {
      type: 'text',
      nullable: false,
    },
    ruleId: {
      name: 'rule_id',
      type: 'uuid',
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
      name: 'idx_rule_example_rule',
      columns: ['ruleId'],
    },
    {
      name: 'idx_rule_example_lang',
      columns: ['lang'],
    },
  ],
});
