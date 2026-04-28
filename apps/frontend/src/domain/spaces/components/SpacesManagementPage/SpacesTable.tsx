import React, { useMemo } from 'react';
import { PMTable, PMTableColumn, PMTableRow } from '@packmind/ui';
import { SpaceListItem } from './types';
import { SpaceNameCell } from './SpaceNameCell';
import { SpaceAdminsCell } from './SpaceAdminsCell';
import { SpaceRowActions } from './SpaceRowActions';
import { formatCount, formatCreatedAt } from './formatters';

interface SpacesTableProps {
  spaces: SpaceListItem[];
  selectedRows?: Set<string>;
  onSelectionChange?: (rows: Set<string>) => void;
}

const COLUMNS: PMTableColumn[] = [
  { key: 'name', header: 'Name', grow: true },
  { key: 'admins', header: 'Admins', width: '320px' },
  {
    key: 'membersCount',
    header: 'Members',
    width: '110px',
    align: 'right',
  },
  {
    key: 'artifactsCount',
    header: 'Artifacts',
    width: '110px',
    align: 'right',
  },
  { key: 'createdAt', header: 'Created', width: '140px' },
  { key: 'actions', header: '', width: '60px', align: 'right' },
];

export const SpacesTable: React.FC<SpacesTableProps> = ({
  spaces,
  selectedRows,
  onSelectionChange,
}) => {
  const rows = useMemo<PMTableRow[]>(
    () =>
      spaces.map((space) => ({
        id: space.id,
        name: (
          <SpaceNameCell
            name={space.name}
            colorToken={space.colorToken}
            isOrgWide={space.isOrgWide}
          />
        ),
        admins: <SpaceAdminsCell admins={space.admins} />,
        membersCount: formatCount(space.membersCount),
        artifactsCount: formatCount(space.artifactsCount),
        createdAt: formatCreatedAt(space.createdAt),
        actions: <SpaceRowActions spaceId={space.id} />,
      })),
    [spaces],
  );

  return (
    <PMTable
      columns={COLUMNS}
      data={rows}
      selectable
      getRowId={(row) => (row as { id: string }).id}
      selectedRows={selectedRows}
      onSelectionChange={onSelectionChange}
      striped={false}
      hoverable
    />
  );
};
