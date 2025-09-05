// Export schemas array for TypeORM configuration
import { UserSchema } from './UserSchema';
import { OrganizationSchema } from './OrganizationSchema';

export { UserSchema, OrganizationSchema };
export const accountsSchemas = [UserSchema, OrganizationSchema];
