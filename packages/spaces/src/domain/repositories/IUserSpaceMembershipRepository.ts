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
  updateMembershipPinned(
    userId: UserId,
    spaceId: SpaceId,
    pinned: boolean,
  ): Promise<boolean>;
  removeByUserAndOrganization(
    userId: UserId,
    organizationId: OrganizationId,
  ): Promise<number>;
  softDeleteBySpaceId(spaceId: SpaceId, deletedBy: string): Promise<number>;
  findAdminsForSpaceIds(
    spaceIds: SpaceId[],
  ): Promise<
    Array<{ spaceId: SpaceId; user: { id: UserId; displayName: string } }>
  >;
  findMemberIdsForSpaceIds(
    spaceIds: SpaceId[],
  ): Promise<Map<SpaceId, UserId[]>>;
  countByRoleForSpaceIds(
    spaceIds: SpaceId[],
    role: UserSpaceRole,
  ): Promise<Map<SpaceId, number>>;
  countUsersForSpaceIds(spaceIds: SpaceId[]): Promise<Map<SpaceId, number>>;
}
