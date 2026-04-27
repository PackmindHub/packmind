import type { Space } from '@packmind/types';
import { getColorTokenForSpace } from './spaceColor';
import type { SpaceListItem } from './types';

export function toSpaceListItem(space: Space): SpaceListItem {
  return {
    ...space,
    colorToken: getColorTokenForSpace(space),
    isOrgWide: space.isDefaultSpace,
    admins: [],
    membersCount: null,
    artifactsCount: null,
    createdAt: null,
  };
}
