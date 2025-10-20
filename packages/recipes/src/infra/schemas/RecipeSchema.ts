import { EntitySchema } from 'typeorm';
import { Recipe } from '../../domain/entities/Recipe';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/shared';
import { RecipeVersion } from '../../domain/entities/RecipeVersion';
import { GitCommit, GitCommitId } from '@packmind/git';

export const RecipeSchema = new EntitySchema<
  WithSoftDelete<
    WithTimestamps<
      Recipe & {
        versions?: RecipeVersion;
        git_commit_id?: GitCommitId;
        gitCommit?: GitCommit;
      }
    >
  >
>({
  name: 'Recipe',
  tableName: 'recipes',
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
    version: {
      type: 'int',
    },
    git_commit_id: {
      type: 'uuid',
      nullable: true,
    },
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
    },
    userId: {
      name: 'user_id',
      type: 'uuid',
      nullable: false,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    versions: {
      type: 'one-to-many',
      target: 'RecipeVersion',
      inverseSide: 'recipe',
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
  indices: [
    {
      name: 'idx_recipe_organization',
      columns: ['organizationId'],
    },
    {
      name: 'idx_recipe_user',
      columns: ['userId'],
    },
    {
      name: 'idx_recipe_org_user',
      columns: ['organizationId', 'userId'],
    },
    {
      name: 'idx_recipe_slug',
      columns: ['slug', 'organizationId'],
      unique: true,
      where: 'deleted_at IS NULL',
    },
  ],
});
