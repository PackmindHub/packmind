import React, { useState } from 'react';
import { PMVStack } from '@packmind/ui';
import { MOCK_SPACES } from './mockSpaces';
import { SpacesToolbar } from './SpacesToolbar';
import { SpacesBulkActionBar } from './SpacesBulkActionBar';
import { SpacesTable } from './SpacesTable';
import { SpacesPagination } from './SpacesPagination';

const PAGE_SIZE = 8;

export const SpacesManagementPage: React.FC = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const visibleSpaces = MOCK_SPACES.slice(0, PAGE_SIZE);
  const totalPages = Math.ceil(MOCK_SPACES.length / PAGE_SIZE);

  return (
    <PMVStack alignItems="stretch" gap={4} width="full">
      <SpacesToolbar />
      <SpacesBulkActionBar
        selectedCount={selectedRows.size}
        onClear={() => setSelectedRows(new Set())}
      />
      <SpacesTable
        spaces={visibleSpaces}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
      />
      <SpacesPagination
        totalCount={MOCK_SPACES.length}
        pageSize={PAGE_SIZE}
        currentPage={1}
        totalPages={totalPages}
      />
    </PMVStack>
  );
};
