import {
  UserId,
  SpaceId,
  UserSpaceMembership,
  UserSpaceRole,
} from '@packmind/types';
import { OrganizationId } from '@packmind/types';

export interface IUserSpaceMembershipRepository {
  addMembership(membership: UserSpaceMembership): Promise<UserSpaceMembership>;
  removeMembership(userId: UserId, spaceId: SpaceId): Promise<boolean>;
  findMembership(
    userId: UserId,
    spaceId: SpaceId,
  ): Promise<UserSpaceMembership | null>;
  findByUserId(userId: UserId): Promise<UserSpaceMembership[]>;
  findBySpaceId(spaceId: SpaceId): Promise<UserSpaceMembership[]>;
  findByUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<UserSpaceMembership[]>;
  updateMembershipRole(
    userId: UserId,
    spaceId: SpaceId,
    role: UserSpaceRole,
  ): Promise<boolean>;
  removeByUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<number>;
}
