// Export schemas array for TypeORM configuration
import { UserSchema } from './UserSchema';
import { OrganizationSchema } from './OrganizationSchema';
import { UserOrganizationMembershipSchema } from './UserOrganizationMembershipSchema';
import { InvitationSchema } from './InvitationSchema';

export {
  UserSchema,
  OrganizationSchema,
  UserOrganizationMembershipSchema,
  InvitationSchema,
};
export const accountsSchemas = [
  UserSchema,
  OrganizationSchema,
  UserOrganizationMembershipSchema,
  InvitationSchema,
];
