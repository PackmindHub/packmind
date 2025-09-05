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
    username: {
      type: 'varchar',
      length: 255,
      unique: true,
    },
    passwordHash: {
      name: 'password_hash',
      type: 'varchar',
      length: 255,
    },
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      nullable: false,
    },
    ...uuidSchema,
    ...timestampsSchemas,
    ...softDeleteSchemas,
  },
  relations: {
    organization: {
      type: 'many-to-one',
      target: 'Organization',
      joinColumn: {
        name: 'organization_id',
        referencedColumnName: 'id',
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
  },
  indices: [
    {
      name: 'idx_user_organization',
      columns: ['organizationId'],
    },
  ],
});
