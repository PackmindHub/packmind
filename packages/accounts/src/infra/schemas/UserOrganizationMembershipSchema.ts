import { EntitySchema } from 'typeorm';
import { UserOrganizationMembership } from '@packmind/types';
import { WithTimestamps, timestampsSchemas } from '@packmind/shared';

export const UserOrganizationMembershipSchema = new EntitySchema<
  WithTimestamps<UserOrganizationMembership>
>({
  name: 'UserOrganizationMembership',
  tableName: 'user_organization_memberships',
  columns: {
    userId: {
      name: 'user_id',
      type: 'uuid',
      primary: true,
    },
    organizationId: {
      name: 'organization_id',
      type: 'uuid',
      primary: true,
    },
    role: {
      type: 'varchar',
      length: 64,
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
    organization: {
      type: 'many-to-one',
      target: 'Organization',
      joinColumn: {
        name: 'organization_id',
        referencedColumnName: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
});
