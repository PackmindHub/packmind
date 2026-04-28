import React, { useMemo } from 'react';
import { PMBox, PMTable, PMTableColumn, PMTableRow } from '@packmind/ui';
import { SpaceListItem } from './types';
import { SpaceNameCell } from './SpaceNameCell';
import { SpaceAdminsCell } from './SpaceAdminsCell';
import { SpaceRowActions } from './SpaceRowActions';
import { formatCount, formatCreatedAt } from './formatters';

interface SpacesTableProps {
  spaces: SpaceListItem[];
}

const headerLabel = (text: string) => (
  <PMBox
    as="span"
    textTransform="uppercase"
    letterSpacing="wider"
    fontSize="10px"
    fontWeight="semibold"
    color="text.faded"
  >
    {text}
  </PMBox>
);

const COLUMNS: PMTableColumn[] = [
  { key: 'name', header: headerLabel('Name'), grow: true },
  { key: 'admins', header: headerLabel('Admins'), width: '320px' },
  {
    key: 'membersCount',
    header: headerLabel('Members'),
    width: '110px',
    align: 'right',
  },
  // {
  //   key: 'artifactsCount',
  //   header: headerLabel('Artifacts'),
  //   width: '110px',
  //   align: 'right',
  // },
  { key: 'createdAt', header: headerLabel('Created'), width: '140px' },
  { key: 'actions', header: '', width: '60px', align: 'right' },
];

export const SpacesTable: React.FC<SpacesTableProps> = ({ spaces }) => {
  const rows = useMemo<PMTableRow[]>(
    () =>
      spaces.map((space) => ({
        id: space.id,
        name: (
          <SpaceNameCell
            name={space.name}
            color={space.color}
            isOrgWide={space.isOrgWide}
          />
        ),
        admins: <SpaceAdminsCell admins={space.admins} />,
        membersCount: formatCount(space.membersCount),
        artifactsCount: formatCount(space.artifactsCount),
        createdAt: formatCreatedAt(space.createdAt),
        actions: <SpaceRowActions space={space} />,
      })),
    [spaces],
  );

  return (
    <PMTable
      columns={COLUMNS}
      data={rows}
      striped={false}
      hoverable
      tableProps={{
        my: 0,
        css: {
          '& thead th': {
            backgroundColor: 'var(--pm-colors-background-secondary)',
            borderBottomColor: 'var(--pm-colors-border-tertiary)',
          },
          '& tbody td': {
            backgroundColor: 'var(--pm-colors-background-primary)',
            borderBottomColor: 'var(--pm-colors-border-tertiary)',
          },
          '& tbody tr': {
            transition: 'background-color 120ms ease',
          },
          '& tbody tr:hover td': {
            backgroundColor: 'var(--pm-colors-background-secondary)',
          },
        },
      }}
    />
  );
};
