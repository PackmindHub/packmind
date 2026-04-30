import React, { useMemo, useState } from 'react';
import { PMAlert, PMBox, PMSpinner, PMVStack } from '@packmind/ui';
import {
  useGetOrganizationSpacesForManagementQuery,
  useGetSpacesQuery,
} from '../../api/queries/SpacesQueries';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { SpacesTable } from './SpacesTable';
// import { SpacesPagination } from './SpacesPagination';
import { toSpaceListItem } from './toSpaceListItem';
import { sortSpacesByName } from '../../../spaces-management/utils/sortSpacesByName';
import { SpaceManagementDrawer } from './SpaceManagementDrawer';

export const SpacesManagementPage: React.FC = () => {
  const { organization } = useAuthContext();
  const [page] = useState(1);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const orgId = organization?.id ?? '';
  const { data, isLoading, isError } =
    useGetOrganizationSpacesForManagementQuery(orgId, page);
  const { data: mySpaces } = useGetSpacesQuery();
  const memberSpaceIds = useMemo(
    () => new Set((mySpaces ?? []).map((s) => s.id)),
    [mySpaces],
  );

  const selectedSpace = useMemo(
    () => data?.items.find((item) => item.id === selectedSpaceId) ?? null,
    [selectedSpaceId, data],
  );

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

  const rows = sortSpacesByName(data.items.map(toSpaceListItem)).sort((a, b) =>
    a.isDefaultSpace === b.isDefaultSpace ? 0 : a.isDefaultSpace ? -1 : 1,
  );

  const handleSelectSpace = (selected: { id: string }) => {
    setSelectedSpaceId(selected.id);
  };

  return (
    <PMVStack alignItems="stretch" gap={4} width="full">
      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        overflow="hidden"
      >
        <SpacesTable
          spaces={rows}
          memberSpaceIds={memberSpaceIds}
          onSelectSpace={handleSelectSpace}
        />
      </PMBox>
      {/* <SpacesPagination
        page={data.page}
        pageSize={data.pageSize}
        totalCount={data.totalCount}
        onPageChange={setPage}
      /> */}
      <SpaceManagementDrawer
        space={selectedSpace}
        onClose={() => setSelectedSpaceId(null)}
      />
    </PMVStack>
  );
};
