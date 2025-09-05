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
    gitRepos: {
      type: 'many-to-many',
      target: 'GitRepo',
      joinTable: {
        name: 'standard_deployment_git_repos',
        joinColumn: {
          name: 'standard_deployment_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'git_repo_id',
          referencedColumnName: 'id',
        },
      },
    },
    gitCommits: {
      type: 'many-to-many',
      target: 'GitCommit',
      joinTable: {
        name: 'standard_deployment_git_commits',
        joinColumn: {
          name: 'standard_deployment_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'git_commit_id',
          referencedColumnName: 'id',
        },
      },
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
