import type { Space } from '@packmind/types';

export type SpaceAdminAvatar = {
  id: string;
  displayName: string;
};

export type SpaceListItem = Space & {
  admins: SpaceAdminAvatar[];
  membersCount: number;
  artifactsCount: number;
  createdAt: string;
};
