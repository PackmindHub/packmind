import React, { useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMEmptyState,
  PMSpinner,
  PMVStack,
} from '@packmind/ui';
import { useGetSpacesQuery } from '../../api/queries';
import { SpacesBulkActionBar } from './SpacesBulkActionBar';
import { SpacesTable } from './SpacesTable';
import { SpacesPagination } from './SpacesPagination';
import { toSpaceListItem } from './toSpaceListItem';

const PAGE_SIZE = 8;

export const SpacesManagementPage: React.FC = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const { data, isLoading, isError } = useGetSpacesQuery();

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

  const spaces = data;

  if (spaces.length === 0) {
    return (
      <PMBox data-testid="spaces-empty" py={8}>
        <PMEmptyState
          title="No spaces yet"
          description="You don't belong to any space in this organization."
        />
      </PMBox>
    );
  }

  const items = spaces.map(toSpaceListItem);
  const visibleSpaces = items.slice(0, PAGE_SIZE);
  const totalCount = items.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <PMVStack alignItems="stretch" gap={4} width="full">
      <SpacesBulkActionBar
        selectedCount={selectedRows.size}
        onClear={() => setSelectedRows(new Set())}
      />
      <SpacesTable
        spaces={visibleSpaces}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
      />
      {totalCount > PAGE_SIZE && (
        <SpacesPagination
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          currentPage={1}
          totalPages={totalPages}
        />
      )}
    </PMVStack>
  );
};
