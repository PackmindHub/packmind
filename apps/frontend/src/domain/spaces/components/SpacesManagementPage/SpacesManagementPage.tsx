import React, { useMemo, useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMCombobox,
  pmCreateListCollection,
  PMEmptyState,
  PMPortal,
  PMSpinner,
  PMTableRow,
  pmUseFilter,
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
  { key: 'visibility', header: 'Visibility', sortKey: 'visibility' },
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

type FilterItem = { label: string; value: string };

function MultiFilterCombobox({
  items,
  value,
  onChange,
  placeholder,
}: {
  items: FilterItem[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState('');
  const { contains } = pmUseFilter({ sensitivity: 'base' });

  const selectedLabels = useMemo(
    () =>
      items
        .filter((i) => value.includes(i.value))
        .map((i) => i.label)
        .join(', '),
    [items, value],
  );

  const collection = useMemo(
    () =>
      pmCreateListCollection({
        items:
          open && searchInput
            ? items.filter((i) => contains(i.label, searchInput))
            : items,
      }),
    [items, open, searchInput, contains],
  );

  return (
    <PMCombobox.Root
      collection={collection}
      multiple
      value={value}
      inputValue={open ? searchInput : selectedLabels}
      open={open}
      onOpenChange={(details: { open: boolean }) => {
        setOpen(details.open);
        if (!details.open) setSearchInput('');
      }}
      onInputValueChange={(e: { inputValue: string }) => {
        if (open) setSearchInput(e.inputValue);
      }}
      onValueChange={(details: { value: string[] }) => onChange(details.value)}
      openOnClick
    >
      <PMCombobox.Control>
        <PMVStack gap={0}>
          <PMCombobox.Input placeholder={placeholder} />
          <PMCombobox.IndicatorGroup>
            <PMCombobox.ClearTrigger />
            <PMCombobox.Trigger />
          </PMCombobox.IndicatorGroup>
        </PMVStack>
      </PMCombobox.Control>
      <PMPortal>
        <PMCombobox.Positioner>
          <PMCombobox.Content>
            <PMCombobox.Empty>No results</PMCombobox.Empty>
            {collection.items.map((item) => (
              <PMCombobox.Item item={item} key={item.value}>
                <PMCombobox.ItemText>{item.label}</PMCombobox.ItemText>
                <PMCombobox.ItemIndicator />
              </PMCombobox.Item>
            ))}
          </PMCombobox.Content>
        </PMCombobox.Positioner>
      </PMPortal>
    </PMCombobox.Root>
  );
}

function sortSpaces(
  items: SpaceListItem[],
  sortKey: string | null,
  sortDirection: SortDirection,
): SpaceListItem[] {
  const direction = sortDirection === 'asc' ? 1 : -1;
  return items.sort((a, b) => {
    switch (sortKey) {
      case 'name':
        return (
          direction *
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
      case 'visibility':
        return direction * a.type.localeCompare(b.type);

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
}

export const SpacesManagementPage: React.FC = () => {
  const { organization } = useAuthContext();
  const [page] = useState(1);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
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

  const adminItems = useMemo(() => {
    const seen = new Set<string>();
    const result: { label: string; value: string }[] = [];
    for (const item of items) {
      for (const admin of item.admins) {
        if (!seen.has(admin.id)) {
          seen.add(admin.id);
          result.push({
            label: userDisplayNameMap.get(admin.id) ?? admin.displayName,
            value: admin.id,
          });
        }
      }
    }
    return result;
  }, [items, userDisplayNameMap]);

  const memberItems = useMemo(() => {
    const seen = new Set<string>();
    const result: { label: string; value: string }[] = [];
    for (const item of items) {
      for (const memberId of item.memberIds) {
        if (!seen.has(memberId)) {
          seen.add(memberId);
          result.push({
            label: userDisplayNameMap.get(memberId) ?? memberId,
            value: memberId,
          });
        }
      }
    }
    return result;
  }, [items, userDisplayNameMap]);

  const filteredItems = useMemo(() => {
    return items.filter((space) => {
      if (
        selectedAdminIds.length > 0 &&
        !space.admins.some((a) => selectedAdminIds.includes(a.id))
      )
        return false;
      if (
        selectedMemberIds.length > 0 &&
        !space.memberIds.some((id) => selectedMemberIds.includes(id))
      )
        return false;
      return true;
    });
  }, [items, selectedAdminIds, selectedMemberIds]);

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
      visibility: wrap(<>{space.type}</>),
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
      <ItemsListing
        items={filteredItems}
        columns={SPACE_COLUMNS}
        makeTableData={makeTableData}
        sortItems={sortSpaces}
        filters={[
          <MultiFilterCombobox
            items={adminItems}
            value={selectedAdminIds}
            onChange={setSelectedAdminIds}
            placeholder="All admins"
            key={'admin-filter'}
          />,
          <MultiFilterCombobox
            items={memberItems}
            value={selectedMemberIds}
            onChange={setSelectedMemberIds}
            placeholder="All collaborators"
            key={'member-filter'}
          />,
        ]}
      />
      <SpaceManagementDrawer
        space={selectedSpace}
        onClose={() => setSelectedSpaceId(null)}
      />
    </PMVStack>
  );
};
