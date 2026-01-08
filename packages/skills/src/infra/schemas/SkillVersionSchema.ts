import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  uuidSchema,
  timestampsSchemas,
} from '@packmind/node-utils';
import { Skill, SkillVersion, UserId } from '@packmind/types';

export const SkillVersionSchema = new EntitySchema<
  WithTimestamps<
    SkillVersion & {
      skill?: Skill;
      user_id?: UserId;
    }
  >
>({
  name: 'SkillVersion',
  tableName: 'skill_versions',
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
    skillId: {
      name: 'skill_id',
      type: 'uuid',
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
  },
  relations: {
    skill: {
      type: 'many-to-one',
      target: 'Skill',
      joinColumn: {
        name: 'skill_id',
      },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    {
      name: 'idx_skill_version_skill',
      columns: ['skillId'],
    },
    {
      name: 'uidx_skill_version',
      columns: ['skillId', 'version'],
      unique: true,
    },
  ],
});
