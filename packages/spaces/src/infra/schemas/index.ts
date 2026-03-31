// Export schemas array for TypeORM configuration
import { SpaceSchema } from './SpaceSchema';
import { UserSpaceMembershipSchema } from './UserSpaceMembershipSchema';

export { SpaceSchema };
export { UserSpaceMembershipSchema };
export const spacesSchemas = [SpaceSchema, UserSpaceMembershipSchema];
