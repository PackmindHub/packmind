export type SpaceColorToken =
  | 'beige'
  | 'blue'
  | 'orange'
  | 'red'
  | 'green'
  | 'purple';

export type SpaceAdminAvatar = {
  id: string;
  displayName: string;
};

export type SpaceListItem = {
  id: string;
  name: string;
  colorToken: SpaceColorToken;
  isOrgWide: boolean;
  admins: SpaceAdminAvatar[];
  membersCount: number;
  artifactsCount: number;
  createdAt: string;
};
