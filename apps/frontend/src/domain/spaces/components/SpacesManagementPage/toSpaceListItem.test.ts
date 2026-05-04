import {
  createOrganizationId,
  createSpaceId,
  createUserId,
  SpaceManagementListItem,
  SpaceType,
} from '@packmind/types';
import { toSpaceListItem } from './toSpaceListItem';

const buildDto = (
  overrides: Partial<SpaceManagementListItem> = {},
): SpaceManagementListItem =>
  ({
    id: createSpaceId('00000000-0000-0000-0000-000000000001'),
    name: 'Engineering',
    slug: 'engineering',
    type: SpaceType.open,
    organizationId: createOrganizationId(
      '11111111-1111-1111-1111-111111111111',
    ),
    isDefaultSpace: false,
    color: 'green',
    admins: [
      {
        id: createUserId('22222222-2222-2222-2222-222222222222'),
        displayName: 'Alice',
      },
    ],
    membersCount: 12,
    artifactsCount: 9,
    createdAt: '2025-01-12T10:00:00.000Z',
    ...overrides,
  }) as SpaceManagementListItem;

describe('toSpaceListItem', () => {
  it('preserves the backend-provided color', () => {
    const dto = buildDto({ color: 'pink' });
    const row = toSpaceListItem(dto);

    expect(row.color).toBe('pink');
  });

  it('flags non-default spaces correctly and forwards aggregated fields', () => {
    const dto = buildDto();
    const row = toSpaceListItem(dto);

    expect(row.isDefaultSpace).toBe(false);
    expect(row.admins).toEqual([
      { id: '22222222-2222-2222-2222-222222222222', displayName: 'Alice' },
    ]);
    expect(row.membersCount).toBe(12);
    expect(row.artifactsCount).toBe(9);
    expect(row.createdAt).toBe('2025-01-12T10:00:00.000Z');
  });

  it('marks the default space correctly', () => {
    const dto = buildDto({ isDefaultSpace: true, name: 'Global' });
    const row = toSpaceListItem(dto);

    expect(row.isDefaultSpace).toBe(true);
  });

  it('isDefaultSpace is independent of space type', () => {
    const restrictedDefault = buildDto({
      isDefaultSpace: true,
      type: SpaceType.restricted,
    });

    expect(toSpaceListItem(restrictedDefault).isDefaultSpace).toBe(true);
  });

  it('preserves every field from the source space management item', () => {
    const dto = buildDto({
      id: createSpaceId('33333333-3333-3333-3333-333333333333'),
      name: 'Mobile',
      slug: 'mobile',
      type: SpaceType.restricted,
      organizationId: createOrganizationId(
        '44444444-4444-4444-4444-444444444444',
      ),
      isDefaultSpace: false,
      color: 'cyan',
    });
    const row = toSpaceListItem(dto);

    expect(row).toMatchObject({
      id: dto.id,
      name: dto.name,
      slug: dto.slug,
      type: dto.type,
      organizationId: dto.organizationId,
      isDefaultSpace: dto.isDefaultSpace,
      color: dto.color,
    });
  });
});
