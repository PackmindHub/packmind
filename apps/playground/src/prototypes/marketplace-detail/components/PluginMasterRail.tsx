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
import { LuLock, LuSearch, LuTriangleAlert } from 'react-icons/lu';
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
  const { name, version, mandatory, state, adoption } = plugin;

  const baseColor = dimmed ? 'text.faded' : 'text.primary';

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
            {mandatory && (
              <PMTooltip
                label="Mandatory plugin: consuming repos must adopt it"
                showArrow
                openDelay={200}
              >
                <PMBox
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  color={dimmed ? 'text.faded' : 'text.secondary'}
                  aria-label="Mandatory"
                >
                  <PMIcon fontSize="11px">
                    <LuLock />
                  </PMIcon>
                </PMBox>
              </PMTooltip>
            )}
          </PMHStack>
          <PMText
            fontSize="xs"
            color="text.faded"
            fontVariantNumeric="tabular-nums"
            flexShrink={0}
          >
            v{version}
          </PMText>
        </PMHStack>
        <PMHStack gap={2} align="center" justify="space-between">
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
          {state === 'drift' && adoption.outdatedRepos > 0 && !dimmed && (
            <PMHStack gap={1} align="center" flexShrink={0}>
              <PMIcon fontSize="11px" color="orange.500">
                <LuTriangleAlert />
              </PMIcon>
              <PMText
                fontSize="xs"
                color="orange.500"
                fontVariantNumeric="tabular-nums"
                fontWeight="medium"
              >
                {adoption.outdatedRepos} outdated
              </PMText>
            </PMHStack>
          )}
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

type FilteredZeroProps = {
  query: string;
  onClear: () => void;
};

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
