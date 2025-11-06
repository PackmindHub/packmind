import { EntitySchema } from 'typeorm';
import { RecipesDeployment } from '../../domain/entities/RecipesDeployment';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';

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
    // New columns for single target model
    status: {
      type: 'varchar',
      nullable: false, // Required for new recipes deployments
    },
    error: {
      type: 'text',
      nullable: true, // Can be null for successful deployments
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
    // Old junction table relations removed for recipes (now using direct relations)
    // Note: Kept as empty arrays in code for backward compatibility during transition
    organizationId: {
      type: 'many-to-one',
      target: 'Organization',
      joinColumn: {
        name: 'organization_id',
        referencedColumnName: 'id',
      },
    },
    // Direct relations for single target model
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
      nullable: false, // Required for new recipes deployments
    },
  },
});
