export type MemberRole = 'Admin' | 'Member';

export type Member = {
  id: string;
  initials: string;
  name: string;
  email: string;
  color: string;
  role: MemberRole;
};

export type Space = {
  id: string;
  name: string;
  color: string;
  members: Member[];
  memberCount: number;
  adminCount: number;
  artifactCount: number;
  standardsCount: number;
  commandsCount: number;
  skillsCount: number;
  created: string;
  isOrgWide?: boolean;
};

export function getAdmins(space: Space): Member[] {
  return space.members.filter((m) => m.role === 'Admin');
}

export type DrawerTab = 'general' | 'members' | 'danger';

export function initialsFromName(name: string): string {
  return name.slice(0, 2).toUpperCase();
}
