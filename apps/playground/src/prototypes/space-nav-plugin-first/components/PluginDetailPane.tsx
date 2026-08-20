import { useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
} from '@packmind/ui';
import {
  LuChevronDown,
  LuEllipsis,
  LuPenLine,
  LuPlus,
  LuTrash2,
  LuTriangleAlert,
} from 'react-icons/lu';

import {
  countByType,
  distributionSummary,
  typesForHorizon,
  visibleComponents,
} from '../data';
import type {
  Component,
  PluginSummary,
  PluginView,
  TypeHorizon,
} from '../types';
import { ComponentGroups } from './ComponentTable';
import { FilterChip } from './FilterChip';
import { PluginDistributionView } from './PluginDistributionView';

export function PluginDetailPane({
  plugin,
  horizon,
  initialView = 'content',
  onOpenComponent,
  onCreateComponent,
  onRedistribute,
}: Readonly<{
  plugin: PluginSummary;
  horizon: TypeHorizon;
  /**
   * Which half opens first. Arriving from a destination means the user was
   * already looking at where this plugin lands; dropping them on Content would
   * make them ask the question they had just answered.
   */
  initialView?: PluginView;
  onOpenComponent: (componentId: string) => void;
  onCreateComponent: (type: string) => void;
  onRedistribute: (targetIds: string[]) => void;
}>) {
  const [view, setView] = useState<PluginView>(initialView);

  const components = visibleComponents(plugin, horizon);
  const summary = distributionSummary(plugin);

  return (
    <PMBox padding={6}>
      <PMHStack align="start" justify="space-between" gap={6}>
        <PMBox minW={0} maxWidth="68ch">
          <PMHeading level="h2">{plugin.name}</PMHeading>
          <PMText as="div" color="secondary" paddingTop={1}>
            {plugin.description}
          </PMText>
          {/*
            No count of what the plugin holds here: the Content tab states it
            eight pixels below. The header carries reach and health, which have
            nowhere else to appear.
          */}
          <PMHStack gap={2} paddingTop={2} wrap="wrap">
            <PMText fontSize="sm" color="faded">
              {summary.repositories} repositor
              {summary.repositories === 1 ? 'y' : 'ies'}
            </PMText>
            <PMText fontSize="sm" color="faded" aria-hidden>
              ·
            </PMText>
            {/* "0 marketplaces" states a number where the fact is what matters. */}
            <PMText fontSize="sm" color="faded">
              {summary.marketplaces === 0
                ? 'not published to a marketplace'
                : `${summary.marketplaces} marketplace${summary.marketplaces === 1 ? '' : 's'}`}
            </PMText>
            {/*
              Health belongs to the header, not to a tab you have to open to
              discover it. It is stated once, and it takes you to the place
              where it can be resolved.
            */}
            {summary.behind > 0 && (
              <BehindBadge
                count={summary.behind}
                onClick={() => setView('distribution')}
              />
            )}
          </PMHStack>
        </PMBox>
        <PMHStack gap={2} flexShrink={0} align="center">
          <PMButton
            variant={summary.behind > 0 ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setView('distribution')}
          >
            Distribute
          </PMButton>
          <PluginActionsMenu plugin={plugin} />
        </PMHStack>
      </PMHStack>

      <PMHStack
        gap={5}
        align="stretch"
        marginTop={5}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <ViewTab
          label="Content"
          count={components.length}
          isActive={view === 'content'}
          onClick={() => setView('content')}
        />
        <ViewTab
          label="Distribution"
          count={summary.total}
          warn={summary.behind > 0}
          isActive={view === 'distribution'}
          onClick={() => setView('distribution')}
        />
      </PMHStack>

      <PMBox paddingTop={4}>
        {view === 'content' ? (
          <PluginContentView
            plugin={plugin}
            components={components}
            horizon={horizon}
            onOpenComponent={onOpenComponent}
            onCreateComponent={onCreateComponent}
          />
        ) : (
          <PluginDistributionView
            plugin={plugin}
            onRedistribute={onRedistribute}
          />
        )}
      </PMBox>
    </PMBox>
  );
}

/**
 * The two halves of a plugin. Distribution is not a secondary screen: a
 * plugin exists to be distributed, so it sits next to its content rather than
 * under a settings-like affordance.
 */
function ViewTab({
  label,
  count,
  warn,
  isActive,
  onClick,
}: Readonly<{
  label: string;
  count: number;
  warn?: boolean;
  isActive: boolean;
  onClick: () => void;
}>) {
  return (
    <PMBox
      as="button"
      display="inline-flex"
      alignItems="center"
      gap={2}
      paddingBottom={2}
      marginBottom="-1px"
      borderBottomWidth="2px"
      borderColor={isActive ? 'text.primary' : 'transparent'}
      color={isActive ? 'text.primary' : 'text.secondary'}
      fontSize="sm"
      fontWeight={isActive ? 'semibold' : 'normal'}
      cursor="pointer"
      _hover={isActive ? undefined : { color: 'text.primary' }}
      transition="color 150ms ease-out, border-color 150ms ease-out"
      onClick={onClick}
      aria-pressed={isActive}
    >
      {label}
      <PMBox as="span" color="text.faded" fontVariantNumeric="tabular-nums">
        {count}
      </PMBox>
      {warn && (
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg="orange.500"
          aria-hidden
        />
      )}
    </PMBox>
  );
}

function BehindBadge({
  count,
  onClick,
}: Readonly<{ count: number; onClick: () => void }>) {
  return (
    <PMBox
      as="button"
      display="inline-flex"
      alignItems="center"
      gap="6px"
      cursor="pointer"
      color="text.warning"
      _hover={{ textDecoration: 'underline' }}
      onClick={onClick}
    >
      <PMIcon fontSize="xs">
        <LuTriangleAlert />
      </PMIcon>
      {/*
        The label is a PMText rather than a bare string, so this button is
        exactly as tall as the two PMText it sits beside. A button carries the
        UA's `normal` line height, which made the line 1.75px taller here than
        on a plugin with nothing behind — enough for the tab bar underneath to
        jump every time the rail landed on a plugin that had drifted. Taking
        the metric from the component that sets it beats restating its ratio.
      */}
      <PMText as="span" fontSize="sm" color="warning">
        {count} distribution{count === 1 ? '' : 's'} behind
      </PMText>
    </PMBox>
  );
}

function PluginContentView({
  plugin,
  components,
  horizon,
  onOpenComponent,
  onCreateComponent,
}: Readonly<{
  plugin: PluginSummary;
  components: Component[];
  horizon: TypeHorizon;
  onOpenComponent: (componentId: string) => void;
  onCreateComponent: (type: string) => void;
}>) {
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const counts = useMemo(() => countByType(components), [components]);
  const presentTypes = typesForHorizon(horizon).filter((type) =>
    counts.has(type.type),
  );
  const shown = typeFilter
    ? components.filter((a) => a.type === typeFilter)
    : components;

  return (
    <PMBox>
      <PMHStack justify="space-between" align="center" gap={4} wrap="wrap">
        <PMHStack gap={1} wrap="wrap">
          <FilterChip
            label="All"
            count={components.length}
            isActive={typeFilter === null}
            onClick={() => setTypeFilter(null)}
          />
          {presentTypes.map((type) => (
            <FilterChip
              key={type.type}
              label={type.labelPlural}
              count={counts.get(type.type) ?? 0}
              icon={type.icon}
              isActive={typeFilter === type.type}
              onClick={() => setTypeFilter(type.type)}
            />
          ))}
        </PMHStack>
        <NewComponentMenu horizon={horizon} onCreate={onCreateComponent} />
      </PMHStack>

      <PMBox paddingTop={4}>
        {shown.length === 0 ? (
          <EmptyPluginBody
            hasAnyComponent={components.length > 0}
            horizon={horizon}
            onCreate={onCreateComponent}
          />
        ) : (
          <ComponentGroups
            entries={shown.map((component) => ({ component, plugin }))}
            horizon={horizon}
            grouped={typeFilter === null}
            onOpen={(entry) => onOpenComponent(entry.component.id)}
          />
        )}
      </PMBox>
    </PMBox>
  );
}

/**
 * The plugin's own properties live behind an overflow menu, not a second
 * button. Distribute is the one action that matters on this screen; editing the
 * plugin's identity is rare and must not compete with it.
 */
function PluginActionsMenu({ plugin }: Readonly<{ plugin: PluginSummary }>) {
  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        <PMBox
          as="button"
          width="32px"
          height="32px"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          bg="transparent"
          border="none"
          borderRadius="sm"
          color="text.faded"
          cursor="pointer"
          aria-label={`Actions for ${plugin.name}`}
          _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
          transition="color 150ms ease-out, background 150ms ease-out"
        >
          <PMIcon fontSize="sm">
            <LuEllipsis />
          </PMIcon>
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content minWidth="220px">
            <PMMenu.Item value="rename" cursor="pointer">
              <PMHStack gap={2} align="center">
                <PMIcon fontSize="sm">
                  <LuPenLine />
                </PMIcon>
                Rename and edit description
              </PMHStack>
            </PMMenu.Item>
            <PMMenu.Separator borderColor="border.tertiary" />
            <PMMenu.Item value="delete" cursor="pointer" color="red.500">
              <PMHStack gap={2} align="center">
                <PMIcon fontSize="sm">
                  <LuTrash2 />
                </PMIcon>
                Delete plugin
              </PMHStack>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

function NewComponentMenu({
  horizon,
  onCreate,
}: Readonly<{ horizon: TypeHorizon; onCreate: (type: string) => void }>) {
  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        {/*
          "New", not "New component": the menu names the type on the next
          click, and the button sits inside the plugin whose content it adds to.
          Repeating the noun states what the surroundings already say.
        */}
        <PMButton variant="primary" size="sm" aria-label="New component">
          <PMIcon fontSize="xs">
            <LuPlus />
          </PMIcon>
          New
          <PMIcon fontSize="xs">
            <LuChevronDown />
          </PMIcon>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content minWidth="220px">
            {typesForHorizon(horizon).map((type) => (
              <PMMenu.Item
                key={type.type}
                value={type.type}
                cursor="pointer"
                onClick={() => onCreate(type.type)}
              >
                <PMIcon marginRight={2} color="text.faded">
                  {type.icon}
                </PMIcon>
                {type.labelSingular}
              </PMMenu.Item>
            ))}
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

function EmptyPluginBody({
  hasAnyComponent,
  horizon,
  onCreate,
}: Readonly<{
  hasAnyComponent: boolean;
  horizon: TypeHorizon;
  onCreate: (type: string) => void;
}>) {
  if (hasAnyComponent) {
    return (
      <PMText fontSize="sm" color="secondary">
        No component of this type in this plugin.
      </PMText>
    );
  }

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      padding={6}
      maxWidth="68ch"
    >
      <PMText as="div" fontWeight="medium">
        This plugin is empty.
      </PMText>
      <PMText as="div" color="secondary" paddingTop={1}>
        A plugin with no component gives an agent nothing to read and
        distributes nothing. Add the first one here, and it is distributable as
        soon as you save it.
      </PMText>
      <PMBox paddingTop={4}>
        <NewComponentMenu horizon={horizon} onCreate={onCreate} />
      </PMBox>
    </PMBox>
  );
}
