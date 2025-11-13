import {
  WithSoftDelete,
  WithTimestamps,
  softDeleteSchemas,
  timestampsSchemas,
  uuidSchema,
} from '@packmind/node-utils';
import { GitRepo, Recipe, Target, User } from '@packmind/types';
import { EntitySchema } from 'typeorm';
import { RecipeUsage } from '../../domain/entities/RecipeUsage';

export const RecipeUsageSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      RecipeUsage & {
        recipe?: Recipe;
        gitRepo?: GitRepo;
        user?: User;
        target?: Target;
      }
    >
  >
>({
  name: 'RecipeUsage',
  tableName: 'recipe_usage',
  columns: {
    recipeId: {
      name: 'recipe_id',
      type: 'uuid',
      nullable: false,
    },
    usedAt: {
      name: 'used_at',
      type: 'timestamp with time zone',
      nullable: false,
    },
    aiAgent: {
      name: 'ai_agent',
      type: 'varchar',
      nullable: false,
    },
    gitRepoId: {
      name: 'git_repo_id',
      type: 'uuid',
      nullable: true,
    },
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: false,
    },
    targetId: {
      name: 'target_id',
      type: 'uuid',
      nullable: true,
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
    gitRepo: {
      type: 'many-to-one',
      target: 'GitRepo',
      joinColumn: {
        name: 'git_repo_id',
      },
      onDelete: 'SET NULL',
    },
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    target: {
      type: 'many-to-one',
      target: 'Target',
      joinColumn: {
        name: 'target_id',
      },
      onDelete: 'SET NULL',
    },
  },
});
