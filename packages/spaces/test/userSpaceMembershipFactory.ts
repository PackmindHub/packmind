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
  return {
    userId: createUserId(uuidv4()),
    spaceId: createSpaceId(uuidv4()),
    role: UserSpaceRole.MEMBER,
    ...overrides,
  };
}
