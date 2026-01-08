import { EntitySchema } from 'typeorm';
import { uuidSchema } from '@packmind/node-utils';
import { SkillFile, SkillVersion } from '@packmind/types';

export const SkillFileSchema = new EntitySchema<
  SkillFile & {
    skillVersion?: SkillVersion;
  }
>({
  name: 'SkillFile',
  tableName: 'skill_files',
  columns: {
    skillVersionId: {
      name: 'skill_version_id',
      type: 'uuid',
      nullable: false,
    },
    path: {
      type: 'varchar',
      length: 1000,
    },
    content: {
      type: 'text',
    },
    permissions: {
      type: 'varchar',
      length: 10,
    },
    ...uuidSchema,
  },
  relations: {
    skillVersion: {
      type: 'many-to-one',
      target: 'SkillVersion',
      joinColumn: {
        name: 'skill_version_id',
      },
      onDelete: 'CASCADE',
    },
  },
  indices: [
    {
      name: 'idx_skill_file_version',
      columns: ['skillVersionId'],
    },
  ],
});
