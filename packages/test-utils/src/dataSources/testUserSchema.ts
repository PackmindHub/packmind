import { EntitySchema } from 'typeorm';
import { WithSoftDelete, WithTimestamps } from '@packmind/types';

export type TestUser = {
  id: string;
  email: string;
  displayName: string | null;
};

/**
 * A stand-in for the real `UserSchema` for specs that need author hydration to
 * resolve.
 *
 * `AbstractRepository.getCreatedByMany` looks its authors up by entity *name*
 * (`getRepository('User')`), so any datasource whose entity list omits a `User`
 * entity makes that lookup throw — which the method swallows, silently
 * yielding `createdBy: undefined` for every item. Register this alongside the
 * entities under test to exercise the resolved path instead.
 *
 * It is deliberately a local copy rather than an import of
 * `@packmind/accounts`: `standards` and `commands` do not depend on that
 * package, and this file only has to carry the columns the lookup reads. The
 * soft-delete columns are kept because the real schema has them, and their
 * absence would change the SQL the lookup generates.
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
