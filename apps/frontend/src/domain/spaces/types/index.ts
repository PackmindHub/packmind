export type { Space, SpaceId } from '@packmind/types';
export { createSpaceId } from '@packmind/types';

export type SpaceMemberRole = 'admin' | 'member';

export type SpaceMemberEntry = {
  userId: string;
  role: SpaceMemberRole;
};

export type SpaceMemberDTO = {
  userId: string;
  spaceId: string;
  displayName: string;
  role: SpaceMemberRole;
};

export type ListSpaceMembersResponse = {
  members: SpaceMemberDTO[];
};

export type AddMembersToSpaceResponse = {
  memberships: { userId: string; spaceId: string; role: SpaceMemberRole }[];
};

export type RemoveMemberFromSpaceResponse = {
  removed: boolean;
};

export type UpdateMemberRoleResponse = {
  updated: boolean;
};
