import React from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { LuEllipsis, LuPenLine, LuRefreshCw, LuTrash2 } from 'react-icons/lu';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { GitProviderVendor } from '@packmind/types';
import { GitProviderUI } from '../../types/GitProviderTypes';
import { useCheckProviderAuthQuery } from '../../api/queries';
import { VendorMark } from '../shared/VendorMark';
import { ConnectionStatusPill } from '../shared/ConnectionStatusPill';
import {
  deriveConnectionStatus,
  toStatusBucket,
} from '../shared/connectionStatus';

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
    <PMBox width="160px">Status</PMBox>
    <PMBox width="70px" textAlign="right">
      Repos
    </PMBox>
    <PMBox width="140px">Last distribution</PMBox>
    <PMBox width="90px" />
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
  const repoCount = new Set(
    (connection.repos ?? []).map((r) => `${r.owner}/${r.repo}`),
  ).size;
  const probe = useCheckProviderAuthQuery(connection.id, {
    enabled: connection.hasAuth,
  });
  const view = deriveConnectionStatus(probe, { hasAuth: connection.hasAuth });
  const bucket = toStatusBucket(view);
  const hasDisplayName = connection.displayName.trim().length > 0;
  const placeholder = vendorPlaceholder(connection.source);

  return (
    <PMHStack
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit();
        }
      }}
      data-testid="git-connection-row"
      data-vendor={connection.source}
      data-url={connection.url ?? ''}
      data-repo-count={repoCount}
      data-status={bucket}
      gap={3}
      paddingX={4}
      paddingY={3}
      borderBottom={isLast ? undefined : '1px solid'}
      borderColor="border.tertiary"
      cursor="pointer"
      _hover={{ bg: 'background.secondary' }}
      transition="background-color 120ms ease-out"
    >
      <PMHStack gap={3} flex={1.6} minW={0} align="center">
        <VendorMark vendor={connection.source} size="md" showLabel={false} />
        <PMVStack gap={0.5} align="stretch" minW={0} flex={1}>
          <PMText
            as="p"
            fontSize="sm"
            fontWeight={hasDisplayName ? 'semibold' : 'normal'}
            color={hasDisplayName ? 'primary' : 'faded'}
            fontStyle={hasDisplayName ? 'normal' : 'italic'}
            truncate
          >
            {hasDisplayName ? connection.displayName : placeholder}
          </PMText>
          {connection.url && (
            <PMText as="p" fontSize="xs" color="faded" truncate>
              {connection.url}
            </PMText>
          )}
        </PMVStack>
      </PMHStack>

      <PMBox width="160px">
        <ConnectionStatusPill view={view} variant="inline" />
      </PMBox>

      <PMText
        width="70px"
        fontSize="sm"
        color="secondary"
        textAlign="right"
        fontVariantNumeric="tabular-nums"
      >
        {repoCount}
      </PMText>

      <PMBox width="140px">
        <LastDistributionCell
          lastDistributionAt={connection.lastDistributionAt}
        />
      </PMBox>

      <PMHStack width="90px" gap={1} justify="flex-end">
        <RefreshStatusButton
          isFetching={probe.isFetching}
          onClick={() => {
            void probe.refetch();
          }}
        />
        <RowActionsMenu
          onEdit={onEdit}
          onDelete={onDelete}
          deleteDisabled={repoCount > 0}
        />
      </PMHStack>
    </PMHStack>
  );
};

interface LastDistributionCellProps {
  lastDistributionAt: string | null;
}

const LastDistributionCell: React.FC<LastDistributionCellProps> = ({
  lastDistributionAt,
}) => {
  if (!lastDistributionAt) {
    return (
      <PMText fontSize="sm" color="faded" fontStyle="italic">
        Never used
      </PMText>
    );
  }
  const date = new Date(lastDistributionAt);
  return (
    <PMTooltip label={format(date, 'yyyy-MM-dd h:mm a')} placement="top">
      <PMText fontSize="sm" color="secondary">
        {formatDistanceToNowStrict(date, { addSuffix: true })}
      </PMText>
    </PMTooltip>
  );
};

interface RefreshStatusButtonProps {
  isFetching: boolean;
  onClick: () => void;
}

const RefreshStatusButton: React.FC<RefreshStatusButtonProps> = ({
  isFetching,
  onClick,
}) => (
  <PMTooltip label={isFetching ? 'Checking…' : 'Refresh status'}>
    <PMBox
      as="button"
      aria-label={isFetching ? 'Checking…' : 'Refresh status'}
      data-testid="connection-row-refresh"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isFetching) onClick();
      }}
      bg="transparent"
      border="none"
      color="text.faded"
      cursor={isFetching ? 'wait' : 'pointer'}
      padding={1}
      borderRadius="sm"
      display="flex"
      alignItems="center"
      justifyContent="center"
      opacity={isFetching ? 0.6 : 1}
      _hover={
        isFetching
          ? undefined
          : { color: 'text.primary', bg: 'background.tertiary' }
      }
    >
      <PMIcon
        fontSize="sm"
        animation={isFetching ? 'spin 800ms linear infinite' : undefined}
        css={{
          '@keyframes spin': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' },
          },
        }}
      >
        <LuRefreshCw />
      </PMIcon>
    </PMBox>
  </PMTooltip>
);

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
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
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

function vendorPlaceholder(vendor: GitProviderVendor): string {
  if (vendor === 'github') return 'Unnamed GitHub connection';
  if (vendor === 'gitlab') return 'Unnamed GitLab connection';
  return 'Unnamed connection';
}
