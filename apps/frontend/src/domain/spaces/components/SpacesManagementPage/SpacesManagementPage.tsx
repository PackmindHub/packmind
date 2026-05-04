import React, { useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMEmptyState,
  PMHStack,
  PMInput,
  PMNativeSelect,
  PMSpinner,
  PMTableRow,
  PMVStack,
  SortDirection,
} from '@packmind/ui';
import {
  useGetOrganizationSpacesForManagementQuery,
  useGetSpacesQuery,
} from '../../api/queries/SpacesQueries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { toSpaceListItem } from './toSpaceListItem';
import { SpaceManagementDrawer } from './SpaceManagementDrawer';
import { SpaceNameCell } from './SpaceNameCell';
import { SpaceAdminsCell } from './SpaceAdminsCell';
import { SpaceRowActions } from './SpaceRowActions';
import { formatCount, formatCreatedAt } from './formatters';
import { SpaceListItem } from './types';
import {
  ItemsListing,
  ItemsListingColumn,
} from '../../../../shared/components/ItemsListing';

const SPACE_COLUMNS: ItemsListingColumn[] = [
  { key: 'name', header: 'Name', grow: true, sortKey: 'name' },
  { key: 'admins', header: 'Admins', width: '320px' },
  {
    key: 'membersCount',
    header: 'Collaborators',
    width: '130px',
    align: 'center',
    sortKey: 'membersCount',
  },
  {
    key: 'artifactsCount',
    header: 'Artifacts',
    width: '110px',
    align: 'center',
    sortKey: 'artifactsCount',
  },
  { key: 'createdAt', header: 'Created', width: '140px', sortKey: 'createdAt' },
  { key: 'actions', header: '', width: '60px' },
];

const INTERACTIVE_SELECTOR =
  'button, a, input, [role="menu"], [role="menuitem"]';

function sortSpaces(
  items: SpaceListItem[],
  sortKey: string | null,
  sortDirection: SortDirection,
): SpaceListItem[] {
  const defaults = items.filter((s) => s.isDefaultSpace);
  const others = items.filter((s) => !s.isDefaultSpace);

  const direction = sortDirection === 'asc' ? 1 : -1;
  const sorted = [...others].sort((a, b) => {
    switch (sortKey) {
      case 'name':
        return (
          direction *
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
      case 'membersCount':
        return direction * ((a.membersCount ?? 0) - (b.membersCount ?? 0));
      case 'artifactsCount':
        return direction * ((a.artifactsCount ?? 0) - (b.artifactsCount ?? 0));
      case 'createdAt':
        return (
          direction *
          (new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime())
        );
      default:
        return 0;
    }
  });

  return [...defaults, ...sorted];
}

export const SpacesManagementPage: React.FC = () => {
  const { organization } = useAuthContext();
  const [page] = useState(1);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const orgId = organization?.id ?? '';
  const { data, isLoading, isError } =
    useGetOrganizationSpacesForManagementQuery(orgId, page);
  const { data: mySpaces } = useGetSpacesQuery();
  const { data: orgUsers } = useGetUsersInMyOrganizationQuery();
  const memberSpaceIds = useMemo(
    () => new Set((mySpaces ?? []).map((s) => s.id)),
    [mySpaces],
  );

  const selectedSpace = useMemo(
    () => data?.items.find((item) => item.id === selectedSpaceId) ?? null,
    [selectedSpaceId, data],
  );

  const userDisplayNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of orgUsers?.users ?? []) {
      map.set(user.userId as string, user.displayName);
    }
    return map;
  }, [orgUsers]);

  const items = useMemo(() => (data?.items ?? []).map(toSpaceListItem), [data]);

  const adminOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [
      { label: 'Any', value: '' },
    ];
    for (const item of items) {
      for (const admin of item.admins) {
        if (!seen.has(admin.id)) {
          seen.add(admin.id);
          opts.push({
            label: userDisplayNameMap.get(admin.id) ?? admin.displayName,
            value: admin.id,
          });
        }
      }
    }
    return opts;
  }, [items, userDisplayNameMap]);

  const memberOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { label: string; value: string }[] = [
      { label: 'Any', value: '' },
    ];
    for (const item of items) {
      for (const memberId of item.memberIds) {
        if (!seen.has(memberId)) {
          seen.add(memberId);
          opts.push({
            label: userDisplayNameMap.get(memberId) ?? memberId,
            value: memberId,
          });
        }
      }
    }
    return opts;
  }, [items, userDisplayNameMap]);

  const filteredItems = useMemo(() => {
    return items.filter((space) => {
      if (
        selectedAdminId &&
        !space.admins.some((a) => a.id === selectedAdminId)
      )
        return false;
      if (selectedMemberId && !space.memberIds.includes(selectedMemberId))
        return false;
      return true;
    });
  }, [items, selectedAdminId, selectedMemberId]);

  if (isError) {
    return (
      <PMBox data-testid="spaces-error">
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>We couldn't load your spaces.</PMAlert.Title>
          <PMAlert.Description>
            Check your connection and try again.
          </PMAlert.Description>
        </PMAlert.Root>
      </PMBox>
    );
  }

  if (isLoading || data === undefined) {
    return (
      <PMBox data-testid="spaces-loading" py={8} textAlign="center">
        <PMSpinner />
      </PMBox>
    );
  }

  const handleSelectSpace = (space: SpaceListItem) => {
    setSelectedSpaceId(space.id);
  };

  const makeTableData = (space: SpaceListItem): PMTableRow => {
    const handleCellClick = (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest(INTERACTIVE_SELECTOR)) return;
      handleSelectSpace(space);
    };

    const wrap = (content: React.ReactNode) => (
      <PMBox
        as="div"
        onClick={handleCellClick}
        cursor="pointer"
        width="100%"
        height="100%"
      >
        {content}
      </PMBox>
    );

    return {
      name: wrap(
        <SpaceNameCell
          name={space.name}
          color={space.color}
          isDefaultSpace={space.isDefaultSpace}
        />,
      ),
      admins: wrap(<SpaceAdminsCell admins={space.admins} />),
      membersCount: wrap(formatCount(space.membersCount)),
      artifactsCount: wrap(formatCount(space.artifactsCount)),
      createdAt: wrap(formatCreatedAt(space.createdAt)),
      actions: (
        <SpaceRowActions
          space={space}
          isMember={memberSpaceIds.has(space.id)}
          onEdit={() => handleSelectSpace(space)}
        />
      ),
    };
  };

  if (items.length === 0) {
    return (
      <PMEmptyState
        title="No spaces found"
        description="No spaces have been created in your organization yet."
      />
    );
  }

  return (
    <PMVStack alignItems="stretch" gap={0} width="full">
      <PMHStack gap={2} mb={4}>
        <PMInput
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="sm"
        />
        <PMNativeSelect
          items={adminOptions}
          value={selectedAdminId}
          onChange={(e) => setSelectedAdminId(e.currentTarget.value)}
          size="sm"
        />
        <PMNativeSelect
          items={memberOptions}
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.currentTarget.value)}
          size="sm"
        />
      </PMHStack>
      <ItemsListing
        items={filteredItems}
        searchQuery={searchQuery}
        columns={SPACE_COLUMNS}
        makeTableData={makeTableData}
        sortItems={sortSpaces}
      />
      <SpaceManagementDrawer
        space={selectedSpace}
        onClose={() => setSelectedSpaceId(null)}
      />
    </PMVStack>
  );
};
