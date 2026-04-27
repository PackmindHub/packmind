import {
  createOrganizationId,
  createSpaceId,
  SpaceType,
} from '@packmind/types';
import { SpaceListItem } from './types';

const MOCK_ORG_ID = createOrganizationId(
  '11111111-1111-1111-1111-111111111111',
);

const buildMockSpace = (
  overrides: Partial<SpaceListItem> &
    Pick<SpaceListItem, 'name' | 'colorToken'>,
): SpaceListItem => ({
  id: createSpaceId('00000000-0000-0000-0000-000000000000'),
  organizationId: MOCK_ORG_ID,
  slug: overrides.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  type: SpaceType.open,
  isDefaultSpace: false,
  isOrgWide: false,
  admins: [],
  membersCount: 0,
  artifactsCount: 0,
  createdAt: '2025-01-01',
  ...overrides,
});

export const MOCK_SPACES: SpaceListItem[] = [
  buildMockSpace({
    id: createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01'),
    name: 'Global',
    colorToken: 'purple',
    isDefaultSpace: true,
    isOrgWide: true,
    admins: [
      { id: 'u-ct', displayName: 'Charlie Thompson' },
      { id: 'u-sd', displayName: 'Sarah Davis' },
      { id: 'u-mc', displayName: 'Mike Chen' },
      { id: 'u-jr', displayName: 'Joan Racenet' },
      { id: 'u-vp', displayName: 'Vincent Pretre' },
    ],
    membersCount: 46,
    artifactsCount: 120,
    createdAt: '2025-01-12',
  }),
  buildMockSpace({
    id: createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02'),
    name: 'Frontend',
    colorToken: 'orange',
    admins: [
      { id: 'u-ct', displayName: 'Charlie Thompson' },
      { id: 'u-sd', displayName: 'Sarah Davis' },
      { id: 'u-jr', displayName: 'Joan Racenet' },
    ],
    membersCount: 14,
    artifactsCount: 42,
    createdAt: '2025-02-03',
  }),
  buildMockSpace({
    id: createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03'),
    name: 'Backend',
    colorToken: 'green',
    admins: [
      { id: 'u-sd', displayName: 'Sarah Davis' },
      { id: 'u-ql', displayName: 'Quentin Lebourles' },
      { id: 'u-vp', displayName: 'Vincent Pretre' },
    ],
    membersCount: 18,
    artifactsCount: 58,
    createdAt: '2025-02-03',
  }),
  buildMockSpace({
    id: createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04'),
    name: 'Mobile',
    colorToken: 'red',
    admins: [
      { id: 'u-mc', displayName: 'Mike Chen' },
      { id: 'u-tb', displayName: 'Tina Brown' },
    ],
    membersCount: 9,
    artifactsCount: 24,
    createdAt: '2025-02-18',
  }),
  buildMockSpace({
    id: createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05'),
    name: 'Data',
    colorToken: 'blue',
    admins: [
      { id: 'u-ql', displayName: 'Quentin Lebourles' },
      { id: 'u-vp', displayName: 'Vincent Pretre' },
    ],
    membersCount: 11,
    artifactsCount: 33,
    createdAt: '2025-02-22',
  }),
  buildMockSpace({
    id: createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06'),
    name: 'Platform',
    colorToken: 'purple',
    admins: [{ id: 'u-vp', displayName: 'vincent.pretre' }],
    membersCount: 7,
    artifactsCount: 19,
    createdAt: '2025-03-04',
  }),
  buildMockSpace({
    id: createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07'),
    name: 'Design',
    colorToken: 'red',
    admins: [
      { id: 'u-jr', displayName: 'Joan Racenet' },
      { id: 'u-ct', displayName: 'Charlie Thompson' },
    ],
    membersCount: 6,
    artifactsCount: 14,
    createdAt: '2025-03-15',
  }),
  buildMockSpace({
    id: createSpaceId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa08'),
    name: 'Growth',
    colorToken: 'pink',
    admins: [{ id: 'u-ct', displayName: 'cedric.teyton' }],
    membersCount: 5,
    artifactsCount: 9,
    createdAt: '2025-03-28',
  }),
  ...Array.from({ length: 24 }, (_, i): SpaceListItem => {
    const palettes: SpaceListItem['colorToken'][] = [
      'pink',
      'blue',
      'orange',
      'red',
      'green',
      'purple',
    ];
    const index = i + 9;
    return buildMockSpace({
      id: createSpaceId(
        `bbbbbbbb-bbbb-bbbb-bbbb-${String(index).padStart(12, '0')}`,
      ),
      name: `Squad ${index}`,
      colorToken: palettes[i % palettes.length],
      admins: [
        {
          id: `u-filler-${i}-a`,
          displayName: `Alex Number${index}`,
        },
      ],
      membersCount: 3 + (i % 9),
      artifactsCount: 5 + (i % 17),
      createdAt: `2025-04-${String((i % 28) + 1).padStart(2, '0')}`,
    });
  }),
];
