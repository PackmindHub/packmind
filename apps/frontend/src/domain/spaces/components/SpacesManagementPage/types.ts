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
