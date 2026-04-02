import {
  createSpaceId,
  createUserId,
  UserSpaceMembership,
  UserSpaceRole,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';

export function userSpaceMembershipFactory(
  overrides: Partial<UserSpaceMembership> = {},
): UserSpaceMembership {
  const userId = createUserId(uuidv4());
  return {
    userId,
    spaceId: createSpaceId(uuidv4()),
    role: UserSpaceRole.MEMBER,
    createdBy: userId,
    updatedBy: userId,
    ...overrides,
  };
}
