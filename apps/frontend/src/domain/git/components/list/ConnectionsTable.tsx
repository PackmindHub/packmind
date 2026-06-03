import React from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
  PMTooltip,
} from '@packmind/ui';
import { LuEllipsis, LuPenLine, LuTrash2 } from 'react-icons/lu';
import { GitProviderUI } from '../../types/GitProviderTypes';
import { VendorMark } from '../shared/VendorMark';

interface ConnectionsTableProps {
  connections: GitProviderUI[];
  onEdit: (connection: GitProviderUI) => void;
  onDelete: (connection: GitProviderUI) => void;
}

export const ConnectionsTable: React.FC<ConnectionsTableProps> = ({
  connections,
  onEdit,
  onDelete,
}) => {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      bg="background.primary"
    >
      <TableHeader />
      {connections.map((connection, idx) => (
        <ConnectionRow
          key={connection.id}
          connection={connection}
          isLast={idx === connections.length - 1}
          onEdit={() => onEdit(connection)}
          onDelete={() => onDelete(connection)}
        />
      ))}
    </PMBox>
  );
};

const TableHeader: React.FC = () => (
  <PMHStack
    gap={3}
    paddingX={4}
    paddingY={2.5}
    bg="background.secondary"
    borderBottom="1px solid"
    borderColor="border.tertiary"
    fontSize="10px"
    color="text.faded"
    textTransform="uppercase"
    letterSpacing="wider"
    fontWeight="semibold"
  >
    <PMBox flex={1.6} minW={0}>
      Connection
    </PMBox>
    <PMBox width="70px" textAlign="right">
      Repos
    </PMBox>
    <PMBox width="60px" />
  </PMHStack>
);

interface ConnectionRowProps {
  connection: GitProviderUI;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const ConnectionRow: React.FC<ConnectionRowProps> = ({
  connection,
  isLast,
  onEdit,
  onDelete,
}) => {
  const repoCount = connection.repos?.length ?? 0;

  return (
    <PMHStack
      data-testid="git-connection-row"
      data-vendor={connection.source}
      data-url={connection.url ?? ''}
      data-repo-count={repoCount}
      gap={3}
      paddingX={4}
      paddingY={3}
      borderBottom={isLast ? undefined : '1px solid'}
      borderColor="border.tertiary"
      _hover={{ bg: 'background.secondary' }}
      transition="background-color 120ms ease-out"
    >
      <PMHStack gap={3} flex={1.6} minW={0} align="center">
        <VendorMark vendor={connection.source} size="md" showLabel={false} />
        <PMBox minW={0} flex={1}>
          <PMText fontSize="sm" fontWeight="semibold" color="primary" truncate>
            {connection.url ?? '—'}
          </PMText>
        </PMBox>
      </PMHStack>

      <PMText
        width="70px"
        fontSize="sm"
        color="secondary"
        textAlign="right"
        fontVariantNumeric="tabular-nums"
      >
        {repoCount}
      </PMText>

      <PMHStack width="60px" gap={1} justify="flex-end">
        <RowActionsMenu
          onEdit={onEdit}
          onDelete={onDelete}
          deleteDisabled={repoCount > 0}
        />
      </PMHStack>
    </PMHStack>
  );
};

interface RowActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled: boolean;
}

const DELETE_DISABLED_TOOLTIP =
  'Detach all repositories from this connection before deleting it.';

const RowActionsMenu: React.FC<RowActionsMenuProps> = ({
  onEdit,
  onDelete,
  deleteDisabled,
}) => (
  <PMMenu.Root positioning={{ placement: 'bottom-end' }}>
    <PMMenu.Trigger asChild>
      <PMBox
        as="button"
        aria-label="More actions"
        bg="transparent"
        border="none"
        color="text.faded"
        cursor="pointer"
        padding={1}
        borderRadius="sm"
        display="flex"
        alignItems="center"
        justifyContent="center"
        _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
      >
        <PMIcon fontSize="sm">
          <LuEllipsis />
        </PMIcon>
      </PMBox>
    </PMMenu.Trigger>
    <PMPortal>
      <PMMenu.Positioner>
        <PMMenu.Content>
          <PMMenu.Item value="edit" cursor="pointer" onClick={onEdit}>
            <PMIcon fontSize="sm" marginRight={2}>
              <LuPenLine />
            </PMIcon>
            <PMText fontSize="sm" color="primary">
              Edit
            </PMText>
          </PMMenu.Item>
          <DeleteMenuItem onDelete={onDelete} deleteDisabled={deleteDisabled} />
        </PMMenu.Content>
      </PMMenu.Positioner>
    </PMPortal>
  </PMMenu.Root>
);

interface DeleteMenuItemProps {
  onDelete: () => void;
  deleteDisabled: boolean;
}

const DeleteMenuItem: React.FC<DeleteMenuItemProps> = ({
  onDelete,
  deleteDisabled,
}) => {
  const item = (
    <PMMenu.Item
      value="delete"
      cursor={deleteDisabled ? 'not-allowed' : 'pointer'}
      disabled={deleteDisabled}
      data-testid="delete-connection-menu-item"
      data-disabled={deleteDisabled ? 'true' : undefined}
      onClick={(event) => {
        if (deleteDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onDelete();
      }}
    >
      <PMIcon
        fontSize="sm"
        marginRight={2}
        color={deleteDisabled ? 'text.faded' : 'red.500'}
      >
        <LuTrash2 />
      </PMIcon>
      <PMText fontSize="sm" color={deleteDisabled ? 'faded' : 'error'}>
        Delete connection
      </PMText>
    </PMMenu.Item>
  );

  if (!deleteDisabled) {
    return item;
  }

  return (
    <PMTooltip label={DELETE_DISABLED_TOOLTIP} placement="left">
      <PMBox width="full">{item}</PMBox>
    </PMTooltip>
  );
};
