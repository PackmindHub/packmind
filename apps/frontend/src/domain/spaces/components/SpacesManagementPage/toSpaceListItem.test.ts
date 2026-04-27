import {
  createOrganizationId,
  createSpaceId,
  Space,
  SpaceType,
} from '@packmind/types';
import { SPACE_COLOR_PALETTE } from './spaceColor';
import { toSpaceListItem } from './toSpaceListItem';

const buildSpace = (overrides: Partial<Space> = {}): Space => ({
  id: createSpaceId('00000000-0000-0000-0000-000000000001'),
  name: 'Frontend',
  slug: 'frontend',
  type: SpaceType.open,
  organizationId: createOrganizationId('11111111-1111-1111-1111-111111111111'),
  isDefaultSpace: false,
  ...overrides,
});

describe('toSpaceListItem', () => {
  it('marks a default space as org-wide and assigns the blue color token', () => {
    const space = buildSpace({ isDefaultSpace: true, name: 'Global' });
    const item = toSpaceListItem(space);
    expect(item.isOrgWide).toBe(true);
    expect(item.colorToken).toBe('blue');
  });

  it('marks a non-default space as not org-wide and derives a palette color', () => {
    const space = buildSpace({ isDefaultSpace: false });
    const item = toSpaceListItem(space);
    expect(item.isOrgWide).toBe(false);
    expect(SPACE_COLOR_PALETTE).toContain(item.colorToken);
  });

  it('keeps isOrgWide tied solely to isDefaultSpace, regardless of space type', () => {
    const restrictedDefault = buildSpace({
      isDefaultSpace: true,
      type: SpaceType.restricted,
    });
    expect(toSpaceListItem(restrictedDefault).isOrgWide).toBe(true);
  });

  it('leaves API-unsourced fields empty or null', () => {
    const item = toSpaceListItem(buildSpace());
    expect(item.admins).toEqual([]);
    expect(item.membersCount).toBeNull();
    expect(item.artifactsCount).toBeNull();
    expect(item.createdAt).toBeNull();
  });

  it('preserves every field from the source Space', () => {
    const space = buildSpace({
      id: createSpaceId('22222222-2222-2222-2222-222222222222'),
      name: 'Mobile',
      slug: 'mobile',
      type: SpaceType.restricted,
      organizationId: createOrganizationId(
        '33333333-3333-3333-3333-333333333333',
      ),
      isDefaultSpace: false,
    });
    const item = toSpaceListItem(space);
    expect(item).toMatchObject({
      id: space.id,
      name: space.name,
      slug: space.slug,
      type: space.type,
      organizationId: space.organizationId,
      isDefaultSpace: space.isDefaultSpace,
    });
  });
});
