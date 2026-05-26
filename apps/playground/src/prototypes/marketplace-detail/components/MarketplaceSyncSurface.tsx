import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuArrowRight,
  LuCheck,
  LuChevronRight,
  LuCopy,
  LuMinus,
  LuPencil,
  LuPlus,
  LuTerminal,
  LuX,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type {
  ArtifactKind,
  MarketplaceDetail,
  Plugin,
  SourcePackageChange,
} from '../types';

const ADMIN_NAME = 'Marc Reed';

const KIND_LABEL_SINGULAR: Record<ArtifactKind, string> = {
  command: 'Command',
  skill: 'Skill',
  subagent: 'Subagent',
  hook: 'Hook',
  'mcp-server': 'MCP server',
};

const MONO_KINDS: ReadonlySet<ArtifactKind> = new Set<ArtifactKind>([
  'command',
  'hook',
  'mcp-server',
]);

type MarketplaceSyncSurfaceProps = {
  marketplace: MarketplaceDetail;
  onCancel: () => void;
  onConfirm: (selectedPluginIds: string[]) => void;
};

export function MarketplaceSyncSurface({
  marketplace,
  onCancel,
  onConfirm,
}: Readonly<MarketplaceSyncSurfaceProps>) {
  const driftedPlugins = useMemo(
    () => marketplace.plugins.filter((p) => p.sourceSync.state === 'behind'),
    [marketplace.plugins],
  );
  const inSyncPlugins = useMemo(
    () => marketplace.plugins.filter((p) => p.sourceSync.state === 'in-sync'),
    [marketplace.plugins],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(driftedPlugins.map((p) => p.id)),
  );
  const [focusedId, setFocusedId] = useState<string | null>(
    driftedPlugins[0]?.id ?? null,
  );
  const [cliMode, setCliMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const focusedPlugin = useMemo(
    () => driftedPlugins.find((p) => p.id === focusedId) ?? null,
    [driftedPlugins, focusedId],
  );

  const selectedDriftedPlugins = useMemo(
    () => driftedPlugins.filter((p) => selectedIds.has(p.id)),
    [driftedPlugins, selectedIds],
  );

  const selectedCount = selectedIds.size;

  const togglePlugin = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedCount === 0) return;
    onConfirm(selectedDriftedPlugins.map((p) => p.id));
  }, [onConfirm, selectedCount, selectedDriftedPlugins]);

  // Esc cancels, Cmd+Enter triggers
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        if (selectedCount > 0 && !cliMode) {
          event.preventDefault();
          handleConfirm();
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel, handleConfirm, selectedCount, cliMode]);

  const cliCommand = useMemo(
    () => buildCliCommand(marketplace, selectedDriftedPlugins, driftedPlugins),
    [marketplace, selectedDriftedPlugins, driftedPlugins],
  );

  const commitMessage = useMemo(
    () => buildCommitMessage(selectedDriftedPlugins),
    [selectedDriftedPlugins],
  );

  const handleCopyCommand = useCallback(() => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    const timeoutId = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [cliCommand]);

  const primaryDisabled = selectedCount === 0;

  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      animation="fadeIn 120ms ease-out"
    >
      <PMBox
        as="header"
        paddingX={6}
        paddingY={5}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMHStack justify="space-between" align="flex-start" gap={4}>
          <PMVStack align="flex-start" gap={1}>
            <PMHeading level="h3">Sync to repo</PMHeading>
            <PMText fontSize="sm" color="secondary">
              Push selected plugins from Packmind to{' '}
              <PMBox as="span" fontFamily="mono" color="text.primary">
                {marketplace.repoPath}
              </PMBox>
            </PMText>
          </PMVStack>
          <PMBox
            as="button"
            type="button"
            onClick={onCancel}
            display="inline-flex"
            alignItems="center"
            gap={2}
            bg="transparent"
            border="1px solid"
            borderColor="border.tertiary"
            borderRadius="sm"
            paddingX={3}
            paddingY="6px"
            color="text.secondary"
            cursor="pointer"
            transition="background-color 150ms ease-out, color 150ms ease-out"
            _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
            aria-label="Cancel sync"
          >
            <PMIcon fontSize="sm">
              <LuX />
            </PMIcon>
            <PMText fontSize="xs" color="inherit">
              Cancel
            </PMText>
          </PMBox>
        </PMHStack>
      </PMBox>

      <PMHStack gap={0} align="stretch" minH="540px">
        <PluginRail
          driftedPlugins={driftedPlugins}
          inSyncPlugins={inSyncPlugins}
          selectedIds={selectedIds}
          focusedId={focusedId}
          onToggle={togglePlugin}
          onFocus={setFocusedId}
        />
        <PMBox flex="1" minW={0} padding={6}>
          {cliMode ? (
            <CliPanel
              command={cliCommand}
              copied={copied}
              onCopy={handleCopyCommand}
              selectedCount={selectedCount}
            />
          ) : focusedPlugin ? (
            <PluginChangesPanel plugin={focusedPlugin} />
          ) : (
            <EmptySelectionPanel />
          )}
        </PMBox>
      </PMHStack>

      <PMBox
        paddingX={6}
        paddingY={5}
        borderTopWidth="1px"
        borderColor="border.tertiary"
        bg="background.secondary"
      >
        <PMVStack align="stretch" gap={3}>
          <PMText
            fontSize="xs"
            color="faded"
            textTransform="uppercase"
            letterSpacing="0.05em"
            fontWeight="semibold"
          >
            Commit message
          </PMText>
          <PMBox
            bg="background.primary"
            borderWidth="1px"
            borderColor="border.tertiary"
            borderRadius="sm"
            padding={4}
            fontFamily="mono"
            fontSize="xs"
            color={selectedCount === 0 ? 'text.faded' : 'text.primary'}
            whiteSpace="pre-wrap"
            opacity={selectedCount === 0 ? 0.6 : 1}
          >
            {selectedCount === 0
              ? 'Select at least one plugin to preview the commit message.'
              : commitMessage}
          </PMBox>
        </PMVStack>
      </PMBox>

      <PMBox
        paddingX={6}
        paddingY={4}
        borderTopWidth="1px"
        borderColor="border.tertiary"
        position="sticky"
        bottom={0}
        bg="background.primary"
      >
        <PMHStack justify="space-between" align="center" gap={4}>
          <PMBox
            as="button"
            type="button"
            onClick={() => setCliMode((prev) => !prev)}
            display="inline-flex"
            alignItems="center"
            gap={2}
            bg="transparent"
            border="none"
            padding={0}
            color={cliMode ? 'branding.primary' : 'text.secondary'}
            cursor="pointer"
            fontSize="sm"
            transition="color 150ms ease-out"
            _hover={{ color: cliMode ? 'branding.primary' : 'text.primary' }}
          >
            <PMIcon fontSize="sm">
              <LuTerminal />
            </PMIcon>
            {cliMode ? 'Back to summary' : 'Use packmind-cli instead'}
          </PMBox>
          <PMHStack gap={2} align="center">
            <PMButton variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </PMButton>
            {cliMode ? (
              <PMButton
                variant="primary"
                size="sm"
                onClick={handleCopyCommand}
                disabled={primaryDisabled}
              >
                <PMIcon fontSize="sm">
                  {copied ? <LuCheck /> : <LuCopy />}
                </PMIcon>
                {copied ? 'Copied' : 'Copy command'}
              </PMButton>
            ) : (
              <PMButton
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={primaryDisabled}
              >
                {primaryDisabled
                  ? 'Select at least one plugin'
                  : selectedCount === 1
                    ? 'Sync 1 plugin to repo'
                    : `Sync ${selectedCount} plugins to repo`}
              </PMButton>
            )}
          </PMHStack>
        </PMHStack>
      </PMBox>
    </PMBox>
  );
}

type PluginRailProps = {
  driftedPlugins: Plugin[];
  inSyncPlugins: Plugin[];
  selectedIds: Set<string>;
  focusedId: string | null;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
};

function PluginRail({
  driftedPlugins,
  inSyncPlugins,
  selectedIds,
  focusedId,
  onToggle,
  onFocus,
}: Readonly<PluginRailProps>) {
  return (
    <PMBox
      width="320px"
      flexShrink={0}
      borderRightWidth="1px"
      borderColor="border.tertiary"
      bg="background.secondary"
      overflowY="auto"
    >
      <PMVStack gap={0} align="stretch">
        <RailHeader
          label={
            driftedPlugins.length === 0
              ? 'No drifted plugins'
              : `Drifted plugins · ${selectedIds.size} of ${driftedPlugins.length}`
          }
        />
        {driftedPlugins.map((plugin) => (
          <DriftedPluginRow
            key={plugin.id}
            plugin={plugin}
            selected={selectedIds.has(plugin.id)}
            focused={focusedId === plugin.id}
            onToggle={() => onToggle(plugin.id)}
            onFocus={() => onFocus(plugin.id)}
          />
        ))}
        {inSyncPlugins.length > 0 && (
          <>
            <RailHeader label="In sync — already on the repo" />
            {inSyncPlugins.map((plugin) => (
              <InSyncPluginRow key={plugin.id} plugin={plugin} />
            ))}
          </>
        )}
      </PMVStack>
    </PMBox>
  );
}

function RailHeader({ label }: Readonly<{ label: string }>) {
  return (
    <PMBox
      paddingX={4}
      paddingY={3}
      bg="background.tertiary"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
    >
      <PMText
        fontSize="xs"
        color="faded"
        textTransform="uppercase"
        letterSpacing="0.05em"
        fontWeight="semibold"
      >
        {label}
      </PMText>
    </PMBox>
  );
}

type DriftedPluginRowProps = {
  plugin: Plugin;
  selected: boolean;
  focused: boolean;
  onToggle: () => void;
  onFocus: () => void;
};

function DriftedPluginRow({
  plugin,
  selected,
  focused,
  onToggle,
  onFocus,
}: Readonly<DriftedPluginRowProps>) {
  if (plugin.sourceSync.state !== 'behind') return null;
  const changeCount = plugin.sourceSync.changes.length;
  const changeLabel = changeCount === 1 ? '1 change' : `${changeCount} changes`;

  return (
    <PMBox
      paddingX={4}
      paddingY={3}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      bg={focused ? 'background.primary' : 'transparent'}
      _hover={{ bg: focused ? 'background.primary' : 'background.tertiary' }}
      cursor="pointer"
      onClick={onFocus}
      transition="background-color 120ms ease-out"
    >
      <PMHStack gap={3} align="flex-start">
        <PMBox
          paddingTop="2px"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <PMCheckbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={`Include ${plugin.name} in sync`}
          />
        </PMBox>
        <PMVStack align="flex-start" gap={1} flex="1" minW={0}>
          <PMText
            fontSize="sm"
            color="primary"
            fontWeight="medium"
            truncate
            width="100%"
          >
            {plugin.name}
          </PMText>
          <PMHStack gap={1.5} align="center">
            <PMText fontSize="xs" color="faded" fontFamily="mono">
              v{plugin.version}
            </PMText>
            <PMIcon fontSize="2xs" color="text.faded">
              <LuArrowRight />
            </PMIcon>
            <PMText fontSize="xs" color="secondary" fontFamily="mono">
              v{plugin.sourceSync.sourceVersion}
            </PMText>
          </PMHStack>
          <PMText fontSize="xs" color="faded">
            {changeLabel}
          </PMText>
        </PMVStack>
        <PMIcon
          fontSize="sm"
          color={focused ? 'text.secondary' : 'text.faded'}
          aria-hidden
        >
          <LuChevronRight />
        </PMIcon>
      </PMHStack>
    </PMBox>
  );
}

function InSyncPluginRow({ plugin }: Readonly<{ plugin: Plugin }>) {
  return (
    <PMBox
      paddingX={4}
      paddingY={2.5}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      opacity={0.65}
    >
      <PMHStack gap={3} align="center">
        <PMBox width="16px" />
        <PMVStack align="flex-start" gap={0} flex="1" minW={0}>
          <PMText fontSize="sm" color="secondary" truncate width="100%">
            {plugin.name}
          </PMText>
          <PMText fontSize="xs" color="faded" fontFamily="mono">
            v{plugin.version}
          </PMText>
        </PMVStack>
      </PMHStack>
    </PMBox>
  );
}

function PluginChangesPanel({ plugin }: Readonly<{ plugin: Plugin }>) {
  if (plugin.sourceSync.state !== 'behind') return null;
  const { changes, sourceVersion } = plugin.sourceSync;

  return (
    <PMVStack align="stretch" gap={5}>
      <PMVStack align="flex-start" gap={2}>
        <PMHStack gap={3} align="baseline">
          <PMHeading level="h4">{plugin.name}</PMHeading>
          <PMHStack gap={1.5} align="center">
            <PMText fontSize="sm" color="faded" fontFamily="mono">
              v{plugin.version}
            </PMText>
            <PMIcon fontSize="xs" color="text.faded">
              <LuArrowRight />
            </PMIcon>
            <PMText fontSize="sm" color="primary" fontFamily="mono">
              v{sourceVersion}
            </PMText>
          </PMHStack>
        </PMHStack>
        <PMText fontSize="sm" color="secondary">
          {changes.length === 1 ? '1 change' : `${changes.length} changes`}{' '}
          ready to push.
        </PMText>
      </PMVStack>
      <PMVStack gap={2.5} align="stretch">
        {changes.map((change, index) => (
          <ChangeRow
            key={`${change.kind}-${change.target}-${index}`}
            change={change}
          />
        ))}
      </PMVStack>
    </PMVStack>
  );
}

function ChangeRow({ change }: Readonly<{ change: SourcePackageChange }>) {
  const { Icon, color, verb } = changeStyle(change.kind);
  return (
    <PMBox
      display="grid"
      gridTemplateColumns="16px 96px 1fr"
      alignItems="center"
      columnGap={3}
    >
      <PMBox
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color={color}
        aria-label={verb}
      >
        <PMIcon fontSize="sm">
          <Icon />
        </PMIcon>
      </PMBox>
      <PMBox>
        <PMBadge size="sm" colorPalette="gray">
          {KIND_LABEL_SINGULAR[change.artifactKind]}
        </PMBadge>
      </PMBox>
      <PMText
        fontSize="sm"
        color="text.primary"
        fontWeight="medium"
        truncate
        fontFamily={MONO_KINDS.has(change.artifactKind) ? 'mono' : undefined}
      >
        {change.target}
      </PMText>
    </PMBox>
  );
}

function changeStyle(kind: SourcePackageChange['kind']): {
  Icon: IconType;
  color: string;
  verb: string;
} {
  switch (kind) {
    case 'added':
      return { Icon: LuPlus, color: 'green.500', verb: 'Added' };
    case 'removed':
      return { Icon: LuMinus, color: 'red.500', verb: 'Removed' };
    case 'updated':
      return { Icon: LuPencil, color: 'text.secondary', verb: 'Updated' };
  }
}

function EmptySelectionPanel() {
  return (
    <PMVStack gap={2} padding={6} align="flex-start">
      <PMText fontSize="sm" color="secondary">
        Nothing to push.
      </PMText>
      <PMText fontSize="xs" color="faded">
        Select at least one drifted plugin from the list.
      </PMText>
    </PMVStack>
  );
}

type CliPanelProps = {
  command: string;
  copied: boolean;
  onCopy: () => void;
  selectedCount: number;
};

function CliPanel({
  command,
  copied,
  onCopy,
  selectedCount,
}: Readonly<CliPanelProps>) {
  return (
    <PMVStack align="stretch" gap={5}>
      <PMVStack align="flex-start" gap={2}>
        <PMHeading level="h4">Run from your repo</PMHeading>
        <PMText fontSize="sm" color="secondary" maxWidth="62ch">
          For repos that don't have the Packmind ↔ GitHub integration set up.
          Run this from your repo root, then commit and push.
        </PMText>
      </PMVStack>
      <PMBox
        bg="background.tertiary"
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        padding={4}
        position="relative"
      >
        <PMHStack gap={3} align="flex-start" justify="space-between">
          <PMBox
            as="code"
            fontFamily="mono"
            fontSize="xs"
            color={selectedCount === 0 ? 'text.faded' : 'text.primary'}
            whiteSpace="pre-wrap"
            wordBreak="break-all"
            flex="1"
            minW={0}
          >
            {command}
          </PMBox>
          <PMBox
            as="button"
            type="button"
            onClick={onCopy}
            disabled={selectedCount === 0}
            display="inline-flex"
            alignItems="center"
            gap="6px"
            bg="transparent"
            border="1px solid"
            borderColor="border.tertiary"
            borderRadius="sm"
            paddingX={2.5}
            paddingY="6px"
            color="text.secondary"
            cursor={selectedCount === 0 ? 'not-allowed' : 'pointer'}
            transition="color 150ms ease-out, background-color 150ms ease-out"
            _hover={{
              color: 'text.primary',
              bg: 'background.secondary',
            }}
            _disabled={{
              opacity: 0.5,
              _hover: { color: 'text.secondary', bg: 'transparent' },
            }}
            aria-label="Copy command to clipboard"
          >
            <PMIcon fontSize="sm">{copied ? <LuCheck /> : <LuCopy />}</PMIcon>
            <PMText fontSize="xs" color="inherit">
              {copied ? 'Copied' : 'Copy'}
            </PMText>
          </PMBox>
        </PMHStack>
      </PMBox>
      <PMText fontSize="xs" color="faded" maxWidth="62ch">
        The command checks out the current Packmind state for the selected
        plugins, writes them into the marketplace files, and stages everything
        for review. You commit and push.
      </PMText>
    </PMVStack>
  );
}

function buildCliCommand(
  marketplace: MarketplaceDetail,
  selectedPlugins: Plugin[],
  driftedPlugins: Plugin[],
): string {
  const base = `packmind-cli marketplace sync --marketplace ${marketplace.repoPath}`;
  if (selectedPlugins.length === 0) {
    return `${base} --plugins <select at least one plugin>`;
  }
  if (
    driftedPlugins.length > 0 &&
    selectedPlugins.length === driftedPlugins.length
  ) {
    return `${base} --all`;
  }
  const slugs = selectedPlugins.map((p) => p.packageSlug).join(',');
  return `${base} --plugins ${slugs}`;
}

function buildCommitMessage(selectedPlugins: Plugin[]): string {
  if (selectedPlugins.length === 0) return '';
  const title =
    selectedPlugins.length === 1
      ? `Sync 1 plugin`
      : `Sync ${selectedPlugins.length} plugins`;
  const body = selectedPlugins
    .map((p) => {
      if (p.sourceSync.state !== 'behind') {
        return `- ${p.name}`;
      }
      const count = p.sourceSync.changes.length;
      const countLabel = count === 1 ? '1 change' : `${count} changes`;
      return `- ${p.name}: v${p.version} → v${p.sourceSync.sourceVersion} (${countLabel})`;
    })
    .join('\n');
  return `${title}\n\n${body}\n\nSynced from Packmind by ${ADMIN_NAME}`;
}
