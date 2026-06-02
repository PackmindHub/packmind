import {
  PMBox,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
  PMTooltip,
} from '@packmind/ui';
import {
  LuChevronRight,
  LuEllipsis,
  LuPenLine,
  LuRefreshCw,
  LuTrash2,
} from 'react-icons/lu';
import type { UserConnection } from '../../types';
import { VendorMark } from '../shared/VendorMark';
import { ConnectionStatusPill } from '../shared/ConnectionStatusPill';
import { formatRelativeTime } from '../shared/formatters';

type ConnectionsTableProps = {
  connections: UserConnection[];
  selectedId: string | null;
  onOpenRow: (id: string) => void;
  onRefreshRow: (id: string) => void;
  onRenameRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
  refreshingId: string | null;
};

export function ConnectionsTable({
  connections,
  selectedId,
  onOpenRow,
  onRefreshRow,
  onRenameRow,
  onDeleteRow,
  refreshingId,
}: Readonly<ConnectionsTableProps>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      bg="background.primary"
    >
      <TableHeader />
      {connections.map((c, idx) => (
        <ConnectionRow
          key={c.id}
          connection={c}
          isSelected={c.id === selectedId}
          isLast={idx === connections.length - 1}
          isRefreshing={refreshingId === c.id}
          onOpen={() => onOpenRow(c.id)}
          onRefresh={() => onRefreshRow(c.id)}
          onRename={() => onRenameRow(c.id)}
          onDelete={() => onDeleteRow(c.id)}
        />
      ))}
    </PMBox>
  );
}

function TableHeader() {
  return (
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
      <PMBox width="120px">Last push</PMBox>
      <PMBox width="70px" textAlign="right">
        Repos
      </PMBox>
      <PMBox width="80px" />
    </PMHStack>
  );
}

type ConnectionRowProps = {
  connection: UserConnection;
  isSelected: boolean;
  isLast: boolean;
  isRefreshing: boolean;
  onOpen: () => void;
  onRefresh: () => void;
  onRename: () => void;
  onDelete: () => void;
};

function ConnectionRow({
  connection,
  isSelected,
  isLast,
  isRefreshing,
  onOpen,
  onRefresh,
  onRename,
  onDelete,
}: Readonly<ConnectionRowProps>) {
  const hasName = connection.displayName.trim().length > 0;
  const placeholder = `Unnamed ${connection.vendor === 'github' ? 'GitHub' : 'GitLab'} connection`;
  const duplicateCount = connection.repos.filter(
    (r) => r.duplicatedIn && r.duplicatedIn.length > 0,
  ).length;

  return (
    <PMHStack
      gap={3}
      paddingX={4}
      paddingY={3}
      borderBottom={isLast ? undefined : '1px solid'}
      borderColor="border.tertiary"
      bg={isSelected ? 'blue.900' : 'transparent'}
      cursor="pointer"
      _hover={isSelected ? undefined : { bg: 'background.secondary' }}
      transition="background-color 120ms ease-out"
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('[data-row-action]')) return;
        onOpen();
      }}
    >
      <PMHStack gap={3} flex={1.6} minW={0} align="center">
        <VendorMark vendor={connection.vendor} size="md" showLabel={false} />
        <PMBox minW={0} flex={1}>
          <PMHStack gap={2} align="center" minW={0}>
            <PMText
              fontSize="sm"
              fontWeight={hasName ? 'semibold' : 'normal'}
              color={hasName ? 'primary' : 'faded'}
              fontStyle={hasName ? 'normal' : 'italic'}
              truncate
            >
              {hasName ? connection.displayName : placeholder}
            </PMText>
            {duplicateCount > 0 && (
              <PMTooltip
                label={`${duplicateCount === 1 ? 'This repository is' : `${duplicateCount} repositories are`} also reachable from another connection`}
              >
                <PMHStack
                  gap={1.5}
                  paddingX={2}
                  paddingY={0.5}
                  bg="background.tertiary"
                  borderRadius="sm"
                  align="center"
                >
                  <PMText fontSize="xs" fontWeight="medium" color="warning">
                    {duplicateCount} duplicate{duplicateCount === 1 ? '' : 's'}
                  </PMText>
                </PMHStack>
              </PMTooltip>
            )}
          </PMHStack>
          <PMText fontSize="xs" color="faded" truncate>
            {connection.identifier}
          </PMText>
        </PMBox>
      </PMHStack>

      <PMBox width="160px">
        <ConnectionStatusPill status={connection.status} />
      </PMBox>

      <PMText
        width="120px"
        fontSize="xs"
        color={connection.lastPushAt ? 'secondary' : 'faded'}
        fontStyle={connection.lastPushAt ? 'normal' : 'italic'}
      >
        {formatRelativeTime(connection.lastPushAt)}
      </PMText>

      <PMText
        width="70px"
        fontSize="sm"
        color="secondary"
        textAlign="right"
        fontVariantNumeric="tabular-nums"
      >
        {connection.repos.length}
      </PMText>

      <PMHStack width="80px" gap={1} justify="flex-end">
        <RowIconButton
          label={isRefreshing ? 'Refreshing…' : 'Refresh status'}
          onClick={onRefresh}
          spin={isRefreshing}
        >
          <LuRefreshCw />
        </RowIconButton>
        <RowActionsMenu onRename={onRename} onDelete={onDelete} />
        <PMIcon fontSize="sm" color="text.faded">
          <LuChevronRight />
        </PMIcon>
      </PMHStack>
    </PMHStack>
  );
}

type RowActionsMenuProps = {
  onRename: () => void;
  onDelete: () => void;
};

function RowActionsMenu({ onRename, onDelete }: Readonly<RowActionsMenuProps>) {
  return (
    <PMMenu.Root positioning={{ placement: 'bottom-end' }}>
      <PMMenu.Trigger asChild>
        <PMBox
          as="button"
          data-row-action
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
          onClick={(e) => e.stopPropagation()}
        >
          <PMIcon fontSize="sm">
            <LuEllipsis />
          </PMIcon>
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item
              value="edit"
              cursor="pointer"
              onClick={(e) => {
                (e as unknown as React.MouseEvent).stopPropagation?.();
                onRename();
              }}
            >
              <PMIcon fontSize="sm" marginRight={2}>
                <LuPenLine />
              </PMIcon>
              <PMText fontSize="sm" color="primary">
                Edit
              </PMText>
            </PMMenu.Item>
            <PMMenu.Item
              value="delete"
              cursor="pointer"
              onClick={(e) => {
                (e as unknown as React.MouseEvent).stopPropagation?.();
                onDelete();
              }}
            >
              <PMIcon fontSize="sm" marginRight={2} color="red.500">
                <LuTrash2 />
              </PMIcon>
              <PMText fontSize="sm" color="error">
                Delete connection
              </PMText>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

type RowIconButtonProps = {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  spin?: boolean;
};

function RowIconButton({
  label,
  onClick,
  children,
  spin,
}: Readonly<RowIconButtonProps>) {
  return (
    <PMTooltip label={label}>
      <PMBox
        as="button"
        data-row-action
        aria-label={label}
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
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <PMIcon
          fontSize="sm"
          animation={spin ? 'spin 800ms linear infinite' : undefined}
          css={{
            '@keyframes spin': {
              from: { transform: 'rotate(0deg)' },
              to: { transform: 'rotate(360deg)' },
            },
          }}
        >
          {children}
        </PMIcon>
      </PMBox>
    </PMTooltip>
  );
}
