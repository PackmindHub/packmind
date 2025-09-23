import { EntitySchema } from 'typeorm';
import { StandardsDeployment } from '../../domain/entities/StandardsDeployment';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/shared';

export const StandardsDeploymentSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<StandardsDeployment>>
>({
  name: 'StandardsDeployment',
  tableName: 'standard_deployments',
  columns: {
    authorId: {
      name: 'author_id',
      type: 'varchar',
    },
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
    },
    // New columns for single target model (required for new deployments)
    status: {
      type: 'varchar',
      nullable: false, // Required for new standards deployments
    },
    error: {
      type: 'text',
      nullable: true, // Can be null for successful deployments
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    standardVersions: {
      type: 'many-to-many',
      target: 'StandardVersion',
      joinTable: {
        name: 'standard_deployment_versions',
        joinColumn: {
          name: 'standard_deployment_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'standard_version_id',
          referencedColumnName: 'id',
        },
      },
    },
    // Old junction table relations removed for standards (now using direct relations)
    // Note: Kept as empty arrays in code for backward compatibility during transition
    // Direct relations for single target model (required for new deployments)
    gitCommit: {
      type: 'many-to-one',
      target: 'GitCommit',
      joinColumn: {
        name: 'git_commit_id',
        referencedColumnName: 'id',
      },
      nullable: true, // Can be null for failed deployments
    },
    target: {
      type: 'many-to-one',
      target: 'Target',
      joinColumn: {
        name: 'target_id',
        referencedColumnName: 'id',
      },
      nullable: false, // Required for new standards deployments
    },
  },
  indices: [
    {
      name: 'idx_standard_deployment_organization',
      columns: ['organizationId'],
    },
    {
      name: 'idx_standard_deployment_author',
      columns: ['authorId'],
    },
  ],
});
