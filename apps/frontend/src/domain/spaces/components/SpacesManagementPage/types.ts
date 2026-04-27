import type { Space } from '@packmind/types';

export type SpaceColorToken =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'cyan'
  | 'purple'
  | 'pink';

export type SpaceAdminAvatar = {
  id: string;
  displayName: string;
};

export type SpaceListItem = Space & {
  colorToken: SpaceColorToken;
  isOrgWide: boolean;
  admins: SpaceAdminAvatar[];
  membersCount: number | null;
  artifactsCount: number | null;
  createdAt: string | null;
};
