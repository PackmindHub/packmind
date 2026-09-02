import { EntitySchema } from 'typeorm';
import { WithSoftDelete, WithTimestamps } from '@packmind/types';

export type TestUser = {
  id: string;
  email: string;
  displayName: string | null;
};

/**
 * Stands in for the real `UserSchema` in specs that need author hydration to
 * resolve: `getCreatedByMany` looks authors up by entity name, so a datasource
 * with no `User` entity silently yields `createdBy: undefined` for every item.
 * A local copy because `standards` and `commands` do not depend on
 * `@packmind/accounts`.
 */
export const TestUserSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<TestUser>>
>({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
    },
    email: {
      type: 'varchar',
      length: 255,
      unique: true,
    },
    displayName: {
      name: 'display_name',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    createdAt: {
      name: 'created_at',
      type: 'timestamp with time zone',
      createDate: true,
    },
    updatedAt: {
      name: 'updated_at',
      type: 'timestamp with time zone',
      updateDate: true,
    },
    deletedAt: {
      name: 'deleted_at',
      type: 'timestamp with time zone',
      nullable: true,
      deleteDate: true,
    },
    deletedBy: {
      name: 'deleted_by',
      type: 'varchar',
      nullable: true,
    },
  },
});
