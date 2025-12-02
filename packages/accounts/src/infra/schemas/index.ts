// Export schemas array for TypeORM configuration
import { UserSchema } from './UserSchema';
import { OrganizationSchema } from './OrganizationSchema';
import { UserOrganizationMembershipSchema } from './UserOrganizationMembershipSchema';
import { CliLoginCodeSchema } from './CliLoginCodeSchema';
import { InvitationSchema } from './InvitationSchema';
import { PasswordResetTokenSchema } from './PasswordResetTokenSchema';

export {
  UserSchema,
  OrganizationSchema,
  UserOrganizationMembershipSchema,
  CliLoginCodeSchema,
  InvitationSchema,
  PasswordResetTokenSchema,
};
export const accountsSchemas = [
  UserSchema,
  OrganizationSchema,
  UserOrganizationMembershipSchema,
  CliLoginCodeSchema,
  InvitationSchema,
  PasswordResetTokenSchema,
];
