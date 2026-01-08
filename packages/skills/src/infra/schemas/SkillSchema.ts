import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { Skill, SkillVersion } from '@packmind/types';

export const SkillSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      Skill & {
        versions?: SkillVersion[];
      }
    >
  >
>({
  name: 'Skill',
  tableName: 'skills',
  columns: {
    name: {
      type: 'varchar',
      length: 255,
    },
    slug: {
      type: 'varchar',
      length: 255,
    },
    description: {
      type: 'text',
    },
    version: {
      type: 'int',
    },
    prompt: {
      type: 'text',
    },
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: false,
    },
    spaceId: {
      name: 'space_id',
      type: 'uuid',
      nullable: false,
    },
    license: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    compatibility: {
      type: 'varchar',
      length: 500,
      nullable: true,
    },
    metadata: {
      type: 'jsonb',
      nullable: true,
    },
    allowedTools: {
      name: 'allowed_tools',
      type: 'text',
      nullable: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    versions: {
      type: 'one-to-many',
      target: 'SkillVersion',
      inverseSide: 'skill',
    },
  },
  indices: [
    {
      name: 'idx_skill_user',
      columns: ['userId'],
    },
    {
      name: 'idx_skill_space',
      columns: ['spaceId'],
    },
    {
      name: 'idx_skill_slug',
      columns: ['slug'],
    },
  ],
});
