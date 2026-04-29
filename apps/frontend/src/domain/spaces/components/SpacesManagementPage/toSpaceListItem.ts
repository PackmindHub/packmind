import type { SpaceManagementListItem } from '@packmind/types';
import type { SpaceListItem } from './types';

export function toSpaceListItem(item: SpaceManagementListItem): SpaceListItem {
  return {
    ...item,
    isOrgWide: item.isDefaultSpace,
    admins: item.admins.map((admin) => ({
      id: admin.id as string,
      displayName: admin.displayName,
    })),
  } as SpaceListItem;
}
