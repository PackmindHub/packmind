import { EntitySchema } from 'typeorm';
import { UserSpaceMembership } from '@packmind/types';
import { WithTimestamps, timestampsSchemas } from '@packmind/node-utils';

export const UserSpaceMembershipSchema = new EntitySchema<
  WithTimestamps<UserSpaceMembership>
>({
  name: 'UserSpaceMembership',
  tableName: 'user_space_memberships',
  columns: {
    userId: {
      name: 'user_id',
      type: 'uuid',
      primary: true,
    },
    spaceId: {
      name: 'space_id',
      type: 'uuid',
      primary: true,
    },
    role: {
      type: 'varchar',
      length: 64,
      nullable: false,
    },
    createdBy: {
      name: 'created_by',
      type: 'uuid',
      nullable: false,
    },
    updatedBy: {
      name: 'updated_by',
      type: 'uuid',
      nullable: false,
    },
    ...timestampsSchemas,
  },
  relations: {
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'user_id',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    space: {
      type: 'many-to-one',
      target: 'Space',
      joinColumn: {
        name: 'space_id',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
});
