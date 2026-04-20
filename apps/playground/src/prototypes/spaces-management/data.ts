import type { Member, Space } from './types';

const MEMBERS: Member[] = [
  {
    id: 'm-ct',
    initials: 'CT',
    name: 'cedric.teyton',
    email: 'cedric@acme',
    color: '#d97706',
    role: 'Admin',
  },
  {
    id: 'm-sd',
    initials: 'SD',
    name: 'steven.drouet',
    email: 'steven@acme',
    color: '#7c6bd6',
    role: 'Admin',
  },
  {
    id: 'm-mc',
    initials: 'MC',
    name: 'malo.couaran',
    email: 'malo@acme',
    color: '#c2410c',
    role: 'Admin',
  },
  {
    id: 'm-ql',
    initials: 'QL',
    name: 'quentin.lebourles',
    email: 'quentin@acme',
    color: '#3f8f6a',
    role: 'Member',
  },
  {
    id: 'm-vp',
    initials: 'VP',
    name: 'vincent.pretre',
    email: 'vincent@acme',
    color: '#64748b',
    role: 'Admin',
  },
  {
    id: 'm-jr',
    initials: 'JR',
    name: 'joan.racenet',
    email: 'joan@acme',
    color: '#d97706',
    role: 'Admin',
  },
  {
    id: 'm-al',
    initials: 'AL',
    name: 'anna.lopez',
    email: 'anna@acme',
    color: '#0e7490',
    role: 'Member',
  },
  {
    id: 'm-tb',
    initials: 'TB',
    name: 'tom.bernard',
    email: 'tom@acme',
    color: '#b45252',
    role: 'Member',
  },
];

function findMembers(ids: string[]): Member[] {
  return ids.map((id) => {
    const m = MEMBERS.find((x) => x.id === id);
    if (!m) throw new Error(`Missing seed member: ${id}`);
    return m;
  });
}

function withRole(member: Member, role: Member['role']): Member {
  return member.role === role ? member : { ...member, role };
}

export const STUB_SPACES: Space[] = [
  {
    id: 'global',
    name: 'Global',
    color: '#7c6bd6',
    members: MEMBERS,
    memberCount: 46,
    adminCount: 5,
    artifactCount: 120,
    standardsCount: 52,
    commandsCount: 38,
    skillsCount: 30,
    created: '12 Jan 2025',
    isOrgWide: true,
  },
  {
    id: 'frontend',
    name: 'Frontend',
    color: '#d97706',
    members: [
      withRole(MEMBERS[0], 'Admin'), // CT
      withRole(MEMBERS[1], 'Admin'), // SD
      withRole(MEMBERS[5], 'Admin'), // JR
      withRole(MEMBERS[2], 'Member'), // MC
      withRole(MEMBERS[3], 'Member'), // QL
      withRole(MEMBERS[4], 'Member'), // VP
      withRole(MEMBERS[6], 'Member'), // AL
      withRole(MEMBERS[7], 'Member'), // TB
    ],
    memberCount: 14,
    adminCount: 3,
    artifactCount: 42,
    standardsCount: 18,
    commandsCount: 14,
    skillsCount: 10,
    created: '03 Feb 2025',
  },
  {
    id: 'backend',
    name: 'Backend',
    color: '#3f8f6a',
    members: [
      withRole(MEMBERS[1], 'Admin'),
      withRole(MEMBERS[3], 'Admin'),
      withRole(MEMBERS[4], 'Admin'),
      withRole(MEMBERS[0], 'Member'),
      withRole(MEMBERS[2], 'Member'),
      withRole(MEMBERS[5], 'Member'),
      withRole(MEMBERS[6], 'Member'),
      withRole(MEMBERS[7], 'Member'),
    ],
    memberCount: 18,
    adminCount: 3,
    artifactCount: 58,
    standardsCount: 24,
    commandsCount: 20,
    skillsCount: 14,
    created: '03 Feb 2025',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    color: '#b45252',
    members: [
      withRole(MEMBERS[2], 'Admin'),
      withRole(MEMBERS[7], 'Admin'),
      withRole(MEMBERS[1], 'Member'),
      withRole(MEMBERS[3], 'Member'),
      withRole(MEMBERS[5], 'Member'),
    ],
    memberCount: 9,
    adminCount: 2,
    artifactCount: 24,
    standardsCount: 10,
    commandsCount: 8,
    skillsCount: 6,
    created: '18 Feb 2025',
  },
  {
    id: 'data',
    name: 'Data',
    color: '#0e7490',
    members: [
      withRole(MEMBERS[3], 'Admin'),
      withRole(MEMBERS[4], 'Admin'),
      withRole(MEMBERS[0], 'Member'),
      withRole(MEMBERS[1], 'Member'),
      withRole(MEMBERS[6], 'Member'),
      withRole(MEMBERS[7], 'Member'),
    ],
    memberCount: 11,
    adminCount: 2,
    artifactCount: 33,
    standardsCount: 14,
    commandsCount: 11,
    skillsCount: 8,
    created: '22 Feb 2025',
  },
  {
    id: 'platform',
    name: 'Platform',
    color: '#7c6bd6',
    members: [
      withRole(MEMBERS[4], 'Admin'),
      withRole(MEMBERS[1], 'Member'),
      withRole(MEMBERS[3], 'Member'),
      withRole(MEMBERS[5], 'Member'),
    ],
    memberCount: 7,
    adminCount: 1,
    artifactCount: 19,
    standardsCount: 8,
    commandsCount: 7,
    skillsCount: 4,
    created: '04 Mar 2025',
  },
  {
    id: 'design',
    name: 'Design',
    color: '#c2410c',
    members: [
      withRole(MEMBERS[5], 'Admin'),
      withRole(MEMBERS[0], 'Admin'),
      withRole(MEMBERS[2], 'Member'),
      withRole(MEMBERS[6], 'Member'),
    ],
    memberCount: 6,
    adminCount: 2,
    artifactCount: 14,
    standardsCount: 6,
    commandsCount: 5,
    skillsCount: 3,
    created: '15 Mar 2025',
  },
  {
    id: 'growth',
    name: 'Growth',
    color: '#64748b',
    members: findMembers(['m-ct', 'm-sd', 'm-ql']).map((m, i) =>
      i === 0
        ? { ...m, role: 'Admin' as const }
        : { ...m, role: 'Member' as const },
    ),
    memberCount: 5,
    adminCount: 1,
    artifactCount: 9,
    standardsCount: 4,
    commandsCount: 3,
    skillsCount: 2,
    created: '28 Mar 2025',
  },
];

export const TOTAL_SPACES_LABEL = '32 spaces';
