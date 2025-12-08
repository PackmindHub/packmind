import { EntitySchema } from 'typeorm';
import { Distribution } from '@packmind/types';
import {
  WithTimestamps,
  uuidSchema,
  timestampsSchemas,
} from '@packmind/node-utils';

export const DistributionSchema = new EntitySchema<
  WithTimestamps<Distribution>
>({
  name: 'Distribution',
  tableName: 'distributions',
  columns: {
    authorId: {
      name: 'author_id',
      type: 'varchar',
    },
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
    },
    status: {
      type: 'varchar',
      nullable: false,
    },
    error: {
      type: 'text',
      nullable: true,
    },
    renderModes: {
      name: 'render_modes',
      type: 'json',
      nullable: false,
      default: '[]',
    },
    source: {
      type: 'varchar',
      nullable: false,
      default: 'app',
    },
    ...uuidSchema,
    ...timestampsSchemas,
  },
  relations: {
    distributedPackages: {
      type: 'one-to-many',
      target: 'DistributedPackage',
      inverseSide: 'distribution',
    },
    gitCommit: {
      type: 'many-to-one',
      target: 'GitCommit',
      joinColumn: {
        name: 'git_commit_id',
        referencedColumnName: 'id',
      },
      nullable: true,
    },
    target: {
      type: 'many-to-one',
      target: 'Target',
      joinColumn: {
        name: 'target_id',
        referencedColumnName: 'id',
      },
      nullable: false,
    },
  },
  indices: [
    {
      name: 'idx_distribution_organization',
      columns: ['organizationId'],
    },
    {
      name: 'idx_distribution_author',
      columns: ['authorId'],
    },
  ],
});
