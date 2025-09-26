import { EntitySchema } from 'typeorm';
import { User } from '../../domain/entities/User';
import {
  WithTimestamps,
  WithSoftDelete,
  uuidSchema,
  timestampsSchemas,
  softDeleteSchemas,
} from '@packmind/shared';

export const UserSchema = new EntitySchema<
  WithSoftDelete<WithTimestamps<User>>
>({
  name: 'User',
  tableName: 'users',
  columns: {
    email: {
      type: 'varchar',
      length: 255,
      unique: true,
    },
    passwordHash: {
      name: 'password_hash',
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    active: {
      type: 'boolean',
      default: true,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    memberships: {
      type: 'one-to-many',
      target: 'UserOrganizationMembership',
      inverseSide: 'user',
      cascade: ['insert', 'update'],
      eager: false,
    },
  },
});
