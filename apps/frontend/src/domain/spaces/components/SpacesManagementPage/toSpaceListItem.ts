import type { SpaceManagementListItem } from '@packmind/types';
import type { SpaceListItem } from './types';

export function toSpaceListItem(item: SpaceManagementListItem): SpaceListItem {
  return {
    ...item,
    admins: item.admins.map((admin) => ({
      id: admin.id as string,
      displayName: admin.displayName,
    })),
    memberIds: item.memberIds as string[],
  } as SpaceListItem;
}
