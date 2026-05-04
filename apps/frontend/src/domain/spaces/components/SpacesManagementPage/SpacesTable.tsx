import React, { useCallback, useMemo } from 'react';
import {
  PMBox,
  PMEmptyState,
  PMTable,
  PMTableColumn,
  PMTableRow,
} from '@packmind/ui';
import { SpaceListItem } from './types';
import { SpaceNameCell } from './SpaceNameCell';
import { SpaceAdminsCell } from './SpaceAdminsCell';
import { SpaceRowActions } from './SpaceRowActions';
import { formatCount, formatCreatedAt } from './formatters';

interface SpacesTableProps {
  spaces: SpaceListItem[];
  memberSpaceIds?: Set<string>;
  onSelectSpace?: (space: SpaceListItem) => void;
}

const INTERACTIVE_SELECTOR =
  'button, a, input, [role="menu"], [role="menuitem"]';

interface RowClickAreaProps {
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}

const RowClickArea: React.FC<RowClickAreaProps> = ({ onClick, children }) => (
  <PMBox as="div" onClick={onClick} cursor="pointer" width="100%" height="100%">
    {children}
  </PMBox>
);

const COLUMNS: PMTableColumn[] = [
  { key: 'name', header: 'Name', grow: true },
  { key: 'admins', header: 'Admins', width: '320px' },
  {
    key: 'membersCount',
    header: 'Collaborators',
    width: '130px',
    align: 'center',
  },
  {
    key: 'artifactsCount',
    header: 'Artifacts',
    width: '110px',
    align: 'center',
  },
  { key: 'createdAt', header: 'Created', width: '140px' },
  { key: 'actions', header: '', width: '60px' },
];

export const SpacesTable: React.FC<SpacesTableProps> = ({
  spaces,
  memberSpaceIds,
  onSelectSpace,
}) => {
  const wrapClickable = useCallback(
    (space: SpaceListItem, content: React.ReactNode): React.ReactNode => {
      if (!onSelectSpace) {
        return content;
      }
      const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement | null;
        if (target && target.closest(INTERACTIVE_SELECTOR)) {
          return;
        }
        onSelectSpace(space);
      };
      return <RowClickArea onClick={handleClick}>{content}</RowClickArea>;
    },
    [onSelectSpace],
  );

  const rows = useMemo<PMTableRow[]>(
    () =>
      spaces.map((space) => ({
        id: space.id,
        name: wrapClickable(
          space,
          <SpaceNameCell
            name={space.name}
            color={space.color}
            isDefaultSpace={space.isDefaultSpace}
          />,
        ),
        admins: wrapClickable(space, <SpaceAdminsCell admins={space.admins} />),
        membersCount: wrapClickable(space, formatCount(space.membersCount)),
        artifactsCount: wrapClickable(space, formatCount(space.artifactsCount)),
        createdAt: wrapClickable(space, formatCreatedAt(space.createdAt)),
        actions: (
          <SpaceRowActions
            space={space}
            isMember={memberSpaceIds?.has(space.id) ?? false}
            onEdit={onSelectSpace ? () => onSelectSpace(space) : undefined}
          />
        ),
      })),
    [spaces, memberSpaceIds, wrapClickable, onSelectSpace],
  );

  if (spaces.length === 0) {
    return (
      <PMEmptyState
        title="No spaces found"
        description="No spaces have been created in your organization yet."
      />
    );
  }

  return (
    <PMTable
      columns={COLUMNS}
      data={rows}
      striped={true}
      hoverable
      size="md"
      variant="line"
      showColumnBorder={false}
    />
  );
};
