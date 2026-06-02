import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMHeading,
  PMIcon,
  PMPortal,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuRefreshCw, LuRotateCcw, LuTrash2 } from 'react-icons/lu';
import type { UserConnection } from '../../types';
import { VendorMark } from '../shared/VendorMark';
import { ConnectionStatusPill } from '../shared/ConnectionStatusPill';
import {
  formatAbsoluteDate,
  formatAbsoluteDateTime,
  formatRelativeTime,
} from '../shared/formatters';
import { DisplayNameEditor } from './DisplayNameEditor';
import { RepoList } from './RepoList';

type ConnectionDrawerProps = {
  connection: UserConnection | null;
  onClose: () => void;
  allConnections: UserConnection[];
  onRename: (id: string, next: string) => void;
  onRefresh: (id: string) => void;
  refreshing: boolean;
};

export function ConnectionDrawer({
  connection,
  onClose,
  allConnections,
  onRename,
  onRefresh,
  refreshing,
}: Readonly<ConnectionDrawerProps>) {
  return (
    <PMDrawer.Root
      open={!!connection}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="end"
      size="md"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            {connection && (
              <DrawerBody
                connection={connection}
                allConnections={allConnections}
                onRename={onRename}
                onRefresh={onRefresh}
                refreshing={refreshing}
              />
            )}
            <PMDrawer.CloseTrigger asChild>
              <PMCloseButton size="sm" />
            </PMDrawer.CloseTrigger>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}

type DrawerBodyProps = {
  connection: UserConnection;
  allConnections: UserConnection[];
  onRename: (id: string, next: string) => void;
  onRefresh: (id: string) => void;
  refreshing: boolean;
};

function DrawerBody({
  connection,
  allConnections,
  onRename,
  onRefresh,
  refreshing,
}: Readonly<DrawerBodyProps>) {
  const placeholder = `Unnamed ${connection.vendor === 'github' ? 'GitHub' : 'GitLab'} connection`;
  const otherNames = allConnections
    .filter((c) => c.id !== connection.id)
    .map((c) => c.displayName);
  const duplicateCount = connection.repos.filter(
    (r) => r.duplicatedIn && r.duplicatedIn.length > 0,
  ).length;

  return (
    <>
      <PMDrawer.Header borderBottom="1px solid" borderColor="border.tertiary">
        <PMVStack gap={3} align="stretch" flex={1}>
          <PMHStack gap={3} align="center">
            <VendorMark
              vendor={connection.vendor}
              size="md"
              showLabel={false}
            />
            <PMVStack gap={0.5} align="start" flex={1} minW={0}>
              <PMHeading size="md" truncate>
                {connection.displayName.trim() || placeholder}
              </PMHeading>
              <PMText fontSize="xs" color="faded" truncate>
                {connection.identifier}
              </PMText>
            </PMVStack>
          </PMHStack>
        </PMVStack>
      </PMDrawer.Header>

      <PMDrawer.Body padding={5}>
        <PMVStack gap={6} align="stretch">
          <DisplayNameEditor
            value={connection.displayName}
            placeholder={placeholder}
            otherNames={otherNames}
            onSave={(next) => onRename(connection.id, next)}
          />

          <StatusBlock
            connection={connection}
            onRefresh={() => onRefresh(connection.id)}
            refreshing={refreshing}
          />

          <MetaGrid connection={connection} />

          <PMVStack gap={2} align="stretch">
            <PMHStack justify="space-between" align="baseline">
              <PMText
                fontSize="xs"
                color="faded"
                textTransform="uppercase"
                letterSpacing="wider"
                fontWeight="semibold"
              >
                Repositories ({connection.repos.length})
              </PMText>
              {duplicateCount > 0 && (
                <PMText fontSize="xs" color="warning" fontWeight="medium">
                  {duplicateCount} also reachable elsewhere
                </PMText>
              )}
            </PMHStack>
            <PMBox
              borderWidth="1px"
              borderColor="border.tertiary"
              borderRadius="md"
              overflow="hidden"
              bg="background.secondary"
            >
              <RepoList
                repos={connection.repos}
                allConnections={allConnections}
              />
            </PMBox>
          </PMVStack>
        </PMVStack>
      </PMDrawer.Body>

      <PMBox
        borderTop="1px solid"
        borderColor="border.tertiary"
        paddingX={5}
        paddingY={3}
      >
        <PMHStack justify="space-between" align="center">
          <PMButton variant="ghost" size="sm">
            <PMIcon fontSize="sm" color="red.500">
              <LuTrash2 />
            </PMIcon>
            <PMText fontSize="xs" color="error" fontWeight="medium">
              Delete connection
            </PMText>
          </PMButton>
          {connection.status === 'token_expired' && (
            <PMButton variant="primary" size="sm">
              <PMIcon fontSize="sm">
                <LuRotateCcw />
              </PMIcon>
              Reconnect
            </PMButton>
          )}
        </PMHStack>
      </PMBox>
    </>
  );
}

type StatusBlockProps = {
  connection: UserConnection;
  onRefresh: () => void;
  refreshing: boolean;
};

function StatusBlock({
  connection,
  onRefresh,
  refreshing,
}: Readonly<StatusBlockProps>) {
  return (
    <PMVStack gap={2} align="stretch">
      <PMText
        fontSize="xs"
        color="faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        Status
      </PMText>
      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        padding={3}
        bg="background.secondary"
      >
        <PMHStack justify="space-between" align="flex-start" gap={3}>
          <PMVStack gap={2} align="stretch" flex={1}>
            <ConnectionStatusPill status={connection.status} variant="block" />
            {connection.statusDetail && (
              <PMText fontSize="xs" color="secondary">
                {connection.statusDetail}
              </PMText>
            )}
            <PMText fontSize="xs" color="faded">
              Last check: {formatAbsoluteDateTime(connection.lastCheckedAt)}
            </PMText>
          </PMVStack>
          <PMButton
            variant="tertiary"
            size="xs"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <PMIcon
              fontSize="xs"
              animation={refreshing ? 'spin 800ms linear infinite' : undefined}
              css={{
                '@keyframes spin': {
                  from: { transform: 'rotate(0deg)' },
                  to: { transform: 'rotate(360deg)' },
                },
              }}
            >
              <LuRefreshCw />
            </PMIcon>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </PMButton>
        </PMHStack>
      </PMBox>
    </PMVStack>
  );
}

function MetaGrid({ connection }: Readonly<{ connection: UserConnection }>) {
  return (
    <PMBox
      display="grid"
      gridTemplateColumns="1fr 1fr"
      gap={4}
      paddingY={3}
      borderTop="1px solid"
      borderBottom="1px solid"
      borderColor="border.tertiary"
    >
      <MetaItem
        label="Last push"
        value={
          connection.lastPushAt
            ? formatRelativeTime(connection.lastPushAt)
            : 'Never used'
        }
        muted={!connection.lastPushAt}
        sublabel={
          connection.lastPushAt
            ? formatAbsoluteDateTime(connection.lastPushAt)
            : 'No artifact has been published through this connection yet.'
        }
      />
      <MetaItem
        label="Installed by"
        value={connection.installedBy}
        sublabel={`on ${formatAbsoluteDate(connection.installedAt)}`}
      />
    </PMBox>
  );
}

type MetaItemProps = {
  label: string;
  value: string;
  sublabel?: string;
  muted?: boolean;
};

function MetaItem({ label, value, sublabel, muted }: Readonly<MetaItemProps>) {
  return (
    <PMVStack gap={1} align="stretch">
      <PMText
        fontSize="xs"
        color="faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        {label}
      </PMText>
      <PMText
        fontSize="sm"
        color={muted ? 'faded' : 'primary'}
        fontWeight="medium"
        fontStyle={muted ? 'italic' : 'normal'}
      >
        {value}
      </PMText>
      {sublabel && (
        <PMText fontSize="xs" color="faded">
          {sublabel}
        </PMText>
      )}
    </PMVStack>
  );
}
