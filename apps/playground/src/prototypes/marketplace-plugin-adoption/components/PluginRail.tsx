import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMHStack,
  PMIcon,
  PMInput,
  PMStatus,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuSearch, LuTriangleAlert } from 'react-icons/lu';
import type { Plugin } from '../types';
import { statusOf } from '../utils/adoption';
import { SectionLabel } from './badges';

// Unchanged from today in structure — the rail already had its own filter and
// works. What it loses is the single-tab "Plugins" strip that used to sit above
// it: a tab bar with nothing to switch to was the first of the three levels.

type PluginRailProps = {
  plugins: Plugin[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Install counts come from the same query the Adoption tab uses. */
  installsLoading: boolean;
};

export function PluginRail({
  plugins,
  selectedId,
  onSelect,
  installsLoading,
}: Readonly<PluginRailProps>) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      q === ''
        ? plugins
        : plugins.filter(
            (plugin) =>
              plugin.name.toLowerCase().includes(q) ||
              plugin.slug.toLowerCase().includes(q) ||
              plugin.spaceName.toLowerCase().includes(q),
          ),
    [plugins, q],
  );

  return (
    <PMBox
      width="300px"
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
          <SectionLabel>Plugins</SectionLabel>
          <PMText
            fontSize="11px"
            color="faded"
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
            onChange={(event) => setQuery(event.target.value)}
            size="sm"
            paddingLeft="32px"
            aria-label="Filter plugins"
          />
        </PMBox>
      </PMVStack>

      <PMBox flex="1" overflow="auto" minH={0}>
        {filtered.length === 0 ? (
          <PMVStack gap={2} align="start" padding={4}>
            <PMText fontSize="xs" color="secondary">
              No plugin matches “{query}”.
            </PMText>
            <PMBox
              as="button"
              fontSize="xs"
              color="branding.primary"
              bg="transparent"
              border="none"
              cursor="pointer"
              padding={0}
              onClick={() => setQuery('')}
            >
              Clear filter
            </PMBox>
          </PMVStack>
        ) : (
          filtered.map((plugin) => (
            <PluginRow
              key={plugin.id}
              plugin={plugin}
              selected={plugin.id === selectedId}
              onSelect={() => onSelect(plugin.id)}
              installsLoading={installsLoading}
            />
          ))
        )}
      </PMBox>
    </PMBox>
  );
}

function PluginRow({
  plugin,
  selected,
  onSelect,
  installsLoading,
}: Readonly<{
  plugin: Plugin;
  selected: boolean;
  onSelect: () => void;
  installsLoading: boolean;
}>) {
  const behind = installsLoading
    ? 0
    : plugin.installs.filter(
        (install) => statusOf(install, plugin.publishedRevision) === 'behind',
      ).length;

  return (
    <PMBox
      as="button"
      onClick={onSelect}
      width="100%"
      textAlign="left"
      bg={selected ? 'background.tertiary' : 'transparent'}
      border="none"
      borderLeftWidth="2px"
      borderLeftColor={selected ? 'branding.primary' : 'transparent'}
      borderBottomWidth="1px"
      borderBottomColor="border.tertiary"
      paddingX={3}
      paddingY={2.5}
      cursor="pointer"
      transition="background-color 120ms ease-out"
      _hover={selected ? undefined : { bg: 'background.secondary' }}
      aria-current={selected}
    >
      <PMVStack gap={1.5} align="stretch" minWidth={0}>
        <PMHStack gap={2} align="center" minWidth={0}>
          <PMText fontSize="sm" color="primary" fontWeight="medium" truncate>
            {plugin.name}
          </PMText>
          {behind > 0 && (
            <PMHStack gap={1} align="center" marginLeft="auto" flexShrink={0}>
              <PMIcon fontSize="xs" color="orange.500">
                <LuTriangleAlert />
              </PMIcon>
              <PMText
                fontSize="11px"
                color="secondary"
                fontVariantNumeric="tabular-nums"
              >
                {behind}
              </PMText>
            </PMHStack>
          )}
        </PMHStack>
        <PMHStack gap={2} align="center" minWidth={0}>
          <PMBadge size="sm" maxW="60%" minW={0}>
            <PMStatus.Root colorPalette={plugin.spaceColor} flexShrink={0}>
              <PMStatus.Indicator />
            </PMStatus.Root>
            <PMBox as="span" truncate>
              {plugin.spaceName}
            </PMBox>
          </PMBadge>
          <PMText
            fontSize="11px"
            color="faded"
            fontVariantNumeric="tabular-nums"
          >
            {installsLoading
              ? 'counting installs…'
              : plugin.installs.length === 0
                ? 'no installs'
                : `${plugin.installs.length} installs`}
          </PMText>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}
