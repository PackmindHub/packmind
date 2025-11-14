import { EntitySchema } from 'typeorm';
import { PackagesDeployment } from '@packmind/types';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';

export const PackagesDeploymentSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<PackagesDeployment>>
>({
  name: 'PackagesDeployment',
  tableName: 'package_deployments',
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
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    packages: {
      type: 'many-to-many',
      target: 'Package',
      joinTable: {
        name: 'package_deployment_packages',
        joinColumn: {
          name: 'package_deployment_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'package_id',
          referencedColumnName: 'id',
        },
      },
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
      name: 'idx_package_deployment_organization',
      columns: ['organizationId'],
    },
    {
      name: 'idx_package_deployment_author',
      columns: ['authorId'],
    },
  ],
});
