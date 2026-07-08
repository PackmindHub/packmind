import { EntitySchema } from 'typeorm';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/node-utils';
import { GitCommit, GitCommitId, Recipe, RecipeVersion } from '@packmind/types';

export const RecipeVersionSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      RecipeVersion & {
        recipe?: Recipe;
        git_commit_id?: GitCommitId;
        gitCommit?: GitCommit;
      }
    >
  >
>({
  name: 'RecipeVersion',
  tableName: 'recipe_versions',
  columns: {
    name: {
      type: 'varchar',
    },
    slug: {
      type: 'varchar',
    },
    content: {
      type: 'text',
    },
    recipeId: {
      name: 'recipe_id',
      type: 'uuid',
    },
    version: {
      type: 'int',
    },
    summary: {
      type: 'text',
      nullable: true,
    },
    git_commit_id: {
      type: 'uuid',
      nullable: true,
    },
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: true, // null for git commits, UserId for UI updates
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    recipe: {
      type: 'many-to-one',
      target: 'Recipe',
      joinColumn: {
        name: 'recipe_id',
      },
      onDelete: 'CASCADE',
    },
    gitCommit: {
      type: 'many-to-one',
      target: 'GitCommit',
      joinColumn: {
        name: 'git_commit_id',
      },
      nullable: true,
    },
  },
});
