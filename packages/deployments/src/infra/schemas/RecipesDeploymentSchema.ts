import { EntitySchema } from 'typeorm';
import { RecipesDeployment } from '../../domain/entities/RecipesDeployment';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/shared';

export const RecipesDeploymentSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<RecipesDeployment>>
>({
  name: 'RecipesDeployment',
  tableName: 'deployments',
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
    recipeVersions: {
      type: 'many-to-many',
      target: 'RecipeVersion',
      joinTable: {
        name: 'deployment_recipe_versions',
        joinColumn: {
          name: 'deployment_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'recipe_version_id',
          referencedColumnName: 'id',
        },
      },
    },
    gitRepos: {
      type: 'many-to-many',
      target: 'GitRepo',
      joinTable: {
        name: 'deployment_git_repos',
        joinColumn: {
          name: 'deployment_id',
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
        name: 'deployment_git_commits',
        joinColumn: {
          name: 'deployment_id',
          referencedColumnName: 'id',
        },
        inverseJoinColumn: {
          name: 'git_commit_id',
          referencedColumnName: 'id',
        },
      },
    },
    organizationId: {
      type: 'many-to-one',
      target: 'Organization',
      joinColumn: {
        name: 'organization_id',
        referencedColumnName: 'id',
      },
    },
  },
});
