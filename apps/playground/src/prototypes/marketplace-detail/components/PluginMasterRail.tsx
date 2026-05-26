import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIcon,
  PMInput,
  PMStatus,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { getSpaceColorPalette } from '../spaceColor';
import { LuPin, LuRefreshCw, LuSearch } from 'react-icons/lu';
import type { Plugin } from '../types';

type PluginMasterRailProps = {
  plugins: Plugin[];
  selectedPluginId: string | null;
  onSelect: (pluginId: string) => void;
  unreachable: boolean;
};

export function PluginMasterRail({
  plugins,
  selectedPluginId,
  onSelect,
  unreachable,
}: Readonly<PluginMasterRailProps>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return plugins;
    return plugins.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.owner.name.toLowerCase().includes(q),
    );
  }, [plugins, query]);

  return (
    <PMBox
      width="320px"
      flexShrink={0}
      bg="background.primary"
      borderRightWidth="1px"
      borderColor="border.tertiary"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      <PMVStack
        gap={2}
        paddingX={3}
        paddingY={3}
        align="stretch"
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMHStack justify="space-between" align="center">
          <PMText
            fontSize="11px"
            color="text.faded"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight="semibold"
          >
            Plugins
          </PMText>
          <PMText
            fontSize="11px"
            color="text.faded"
            fontVariantNumeric="tabular-nums"
          >
            {plugins.length}
          </PMText>
        </PMHStack>
        <PMBox position="relative">
          <PMBox
            position="absolute"
            left="10px"
            top="50%"
            transform="translateY(-50%)"
            color="text.faded"
            pointerEvents="none"
            display="flex"
            alignItems="center"
          >
            <PMIcon fontSize="sm">
              <LuSearch />
            </PMIcon>
          </PMBox>
          <PMInput
            placeholder="Filter plugins"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="sm"
            paddingLeft="32px"
          />
        </PMBox>
      </PMVStack>

      <PMBox flex="1" overflow="auto" minH={0}>
        {filtered.length === 0 ? (
          <FilteredZero query={query} onClear={() => setQuery('')} />
        ) : (
          filtered.map((p) => (
            <PluginRailRow
              key={p.id}
              plugin={p}
              selected={p.id === selectedPluginId}
              dimmed={unreachable}
              onSelect={() => onSelect(p.id)}
            />
          ))
        )}
      </PMBox>
    </PMBox>
  );
}

type PluginRailRowProps = {
  plugin: Plugin;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
};

function PluginRailRow({
  plugin,
  selected,
  dimmed,
  onSelect,
}: Readonly<PluginRailRowProps>) {
  const { name, version, mandatory, autoUpdate, adoption, sourceSync } = plugin;

  const baseColor = dimmed ? 'text.faded' : 'text.primary';
  const publishDriftCount =
    sourceSync.state === 'behind' ? sourceSync.changes.length : 0;
  const outdatedCount = adoption.outdatedRepos;
  const driftTooltip = composeDriftTooltip(publishDriftCount, outdatedCount);
  const hasDrift = !dimmed && driftTooltip !== null;

  return (
    <PMBox
      as="button"
      type="button"
      onClick={onSelect}
      width="100%"
      textAlign="left"
      bg={selected ? 'background.secondary' : 'transparent'}
      border="none"
      cursor="pointer"
      paddingY={2.5}
      paddingLeft={3}
      paddingRight={3}
      position="relative"
      borderBottom="1px solid"
      borderColor="border.tertiary"
      transition="background-color 120ms ease-out"
      _hover={selected ? undefined : { bg: 'background.tertiary' }}
      _focusVisible={{
        outline: 'none',
        bg: selected ? 'background.secondary' : 'background.tertiary',
        boxShadow: 'inset 0 0 0 2px var(--chakra-colors-branding-primary)',
      }}
      aria-pressed={selected}
      aria-label={`Plugin ${name} version ${version}`}
    >
      {selected && (
        <PMBox
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          width="2px"
          bg="branding.primary"
          aria-hidden
        />
      )}
      <PMVStack gap={1} align="stretch">
        <PMHStack gap={2} align="center" justify="space-between">
          <PMHStack gap={2} align="center" minW={0} flex={1}>
            <PMText
              fontSize="sm"
              fontWeight={selected ? 'semibold' : 'medium'}
              color={baseColor}
              truncate
            >
              {name}
            </PMText>
            {autoUpdate && (
              <PMTooltip
                label="Auto-update: consumers receive every new version on the next sync"
                showArrow
                openDelay={200}
                closeDelay={120}
              >
                <PMBox
                  width="14px"
                  height="14px"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  color={dimmed ? 'text.faded' : 'text.secondary'}
                  cursor="help"
                  aria-label="Auto-update"
                >
                  <PMIcon fontSize="11px">
                    <LuRefreshCw />
                  </PMIcon>
                </PMBox>
              </PMTooltip>
            )}
            {mandatory && (
              <PMTooltip
                label="Mandatory plugin: consumers cannot uninstall it"
                showArrow
                openDelay={200}
                closeDelay={120}
              >
                <PMBox
                  width="14px"
                  height="14px"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  color={dimmed ? 'text.faded' : 'text.secondary'}
                  cursor="help"
                  aria-label="Mandatory"
                >
                  <PMIcon fontSize="11px">
                    <LuPin />
                  </PMIcon>
                </PMBox>
              </PMTooltip>
            )}
          </PMHStack>
          <PMHStack gap={1.5} align="center" flexShrink={0}>
            {hasDrift && driftTooltip && (
              <PMTooltip label={driftTooltip} showArrow openDelay={200}>
                <PMBox
                  width="6px"
                  height="6px"
                  borderRadius="full"
                  bg="orange.500"
                  cursor="help"
                  aria-label={driftTooltip}
                />
              </PMTooltip>
            )}
            <PMText
              fontSize="xs"
              color="text.faded"
              fontVariantNumeric="tabular-nums"
            >
              v{version}
            </PMText>
          </PMHStack>
        </PMHStack>
        <PMHStack gap={2} align="center">
          <PMBadge size="sm" maxW="100%" minW={0}>
            <PMStatus.Root
              colorPalette={getSpaceColorPalette(plugin.owner.name)}
              flexShrink={0}
            >
              <PMStatus.Indicator />
            </PMStatus.Root>
            <PMBox as="span" truncate>
              {plugin.owner.name}
            </PMBox>
          </PMBadge>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

type FilteredZeroProps = {
  query: string;
  onClear: () => void;
};

function composeDriftTooltip(
  publishDriftCount: number,
  outdatedCount: number,
): string | null {
  const parts: string[] = [];
  if (publishDriftCount > 0) {
    parts.push(
      publishDriftCount === 1
        ? '1 change ready to publish'
        : `${publishDriftCount} changes ready to publish`,
    );
  }
  if (outdatedCount > 0) {
    parts.push(
      outdatedCount === 1
        ? '1 repo on an older version'
        : `${outdatedCount} repos on older versions`,
    );
  }
  return parts.length === 0 ? null : parts.join('. ');
}

function FilteredZero({ query, onClear }: Readonly<FilteredZeroProps>) {
  return (
    <PMVStack gap={2} align="start" padding={4}>
      <PMText fontSize="xs" color="secondary">
        No plugins match &ldquo;{query}&rdquo;.
      </PMText>
      <PMBox
        as="button"
        type="button"
        fontSize="xs"
        color="branding.primary"
        bg="transparent"
        border="none"
        cursor="pointer"
        padding={0}
        _hover={{ color: 'blue.300' }}
        onClick={onClear}
      >
        Clear filter
      </PMBox>
    </PMVStack>
  );
}
