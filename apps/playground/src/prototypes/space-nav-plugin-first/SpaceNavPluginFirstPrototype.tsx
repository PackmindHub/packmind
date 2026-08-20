import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMNativeSelect,
  PMPage,
  PMText,
  PMVStack,
} from '@packmind/ui';

import {
  descriptorFor,
  destinationsFor,
  distributionVerb,
  pluginsForScenario,
  reachSummary,
  typesForHorizon,
} from './data';
import type {
  Component,
  DistributionTarget,
  NavMode,
  PluginSummary,
  PluginView,
  Scenario,
  TypeHorizon,
} from './types';
import {
  navEntriesFor,
  SPACE_SETTINGS_KEY,
  SpaceSidebar,
} from './components/SpaceSidebar';
import { DistributionSurface } from './components/DistributionSurface';
import { PluginsSurface, StubPane } from './components/PluginsSurface';

const NAV_MODES: Array<{ label: string; value: NavMode }> = [
  { label: 'Plugin-first (proposed)', value: 'plugin-first' },
  { label: "Today's navigation", value: 'today' },
];

const HORIZONS: Array<{ label: string; value: TypeHorizon }> = [
  { label: '3 types (today)', value: 'today' },
  { label: '7 types (planned)', value: 'planned' },
];

const SCENARIOS: Array<{ label: string; value: Scenario }> = [
  { label: 'Default (8 plugins)', value: 'default' },
  { label: 'First run (no plugin)', value: 'empty' },
  { label: 'Young space (1 plugin)', value: 'starter' },
  { label: 'After exclusivity (25 plugins)', value: 'scale' },
];

export default function SpaceNavPluginFirstPrototype() {
  const [navMode, setNavMode] = useState<NavMode>('plugin-first');
  const [horizon, setHorizon] = useState<TypeHorizon>('planned');
  const [scenario, setScenario] = useState<Scenario>('default');
  const [activeKey, setActiveKey] = useState('plugins');

  const [plugins, setPlugins] = useState<PluginSummary[]>(() =>
    pluginsForScenario('default'),
  );
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(
    () => pluginsForScenario('default')[0]?.id ?? null,
  );
  const [pluginView, setPluginView] = useState<PluginView>('content');

  const handleScenarioChange = (next: Scenario) => {
    const nextPlugins = pluginsForScenario(next);
    setScenario(next);
    setPlugins(nextPlugins);
    setSelectedPluginId(nextPlugins[0]?.id ?? null);
  };

  const pendingReviews = useMemo(
    () =>
      plugins.reduce(
        (total, plugin) =>
          total + plugin.components.filter((a) => a.pendingReview).length,
        0,
      ),
    [plugins],
  );

  /*
   * Derived here rather than inside the Distribution surface: the sidebar badge
   * is computed from the same list the surface renders, so the number on the
   * entry and the rows behind it cannot disagree.
   */
  const destinationsBehind = useMemo(
    () => reachSummary(destinationsFor(plugins)).needingWork,
    [plugins],
  );

  const badges = { pendingReviews, destinationsBehind };
  const entries = navEntriesFor(navMode, horizon, badges);

  /** Sidebar clicks always land on the plugin's content half. */
  const selectNavEntry = useCallback((key: string) => {
    setActiveKey(key);
    if (key === 'plugins') setPluginView('content');
  }, []);

  /** The way back from a destination to the plugin that landed in it. */
  const openPluginDistribution = useCallback((pluginId: string) => {
    setSelectedPluginId(pluginId);
    setPluginView('distribution');
    setActiveKey('plugins');
  }, []);

  // A nav entry can disappear when the mode or the horizon changes. Fall back to
  // the plugins entry, which exists in both architectures. Space settings is
  // exempt: it is reached from the space itself and belongs to no list of
  // entries, in either architecture.
  useEffect(() => {
    if (
      activeKey !== SPACE_SETTINGS_KEY &&
      !entries.some((entry) => entry.key === activeKey)
    ) {
      setActiveKey('plugins');
    }
  }, [entries, activeKey]);

  const createComponent = useCallback(
    ({
      type,
      name,
      summary,
      targetPluginId,
    }: {
      type: string;
      name: string;
      summary: string;
      targetPluginId: string;
    }) => {
      const id = `created-${type}-${name}-${targetPluginId}`;
      const component: Component = {
        id,
        name,
        type,
        version: 1,
        updatedLabel: 'just now',
        author: 'You',
        summary:
          summary || `New ${descriptorFor(type).labelSingular.toLowerCase()}.`,
        prose: summary
          ? `${summary}\n\nWrite the body here. It renders for ${descriptorFor(type).agents.join(', ')}.`
          : 'Write the body here.',
        frontmatter: [
          { label: 'name', value: name },
          { label: 'description', value: summary || 'To be written' },
        ],
        files: [{ path: 'SKILL.md', size: '0 B' }],
        config: [
          { label: 'Event', value: 'PreToolUse', kind: 'choice' },
          { label: 'Matcher', value: '', kind: 'text' },
          { label: 'Command', value: '', kind: 'code' },
        ],
        rules: [],
      };
      setPlugins((prev) =>
        prev.map((plugin) =>
          plugin.id === targetPluginId
            ? {
                ...plugin,
                distributions: markBehind(plugin.distributions, { name, type }),
                components: [...plugin.components, component],
              }
            : plugin,
        ),
      );
      return id;
    },
    [],
  );

  const moveComponent = useCallback(
    (componentId: string, targetPluginId: string) => {
      setPlugins((prev) => {
        const source = prev.find((plugin) =>
          plugin.components.some((a) => a.id === componentId),
        );
        const component = source?.components.find((a) => a.id === componentId);
        if (!source || !component) return prev;
        return prev.map((plugin) => {
          if (plugin.id === source.id) {
            return {
              ...plugin,
              distributions: markBehind(plugin.distributions, component),
              components: plugin.components.filter((a) => a.id !== componentId),
            };
          }
          if (plugin.id === targetPluginId) {
            return {
              ...plugin,
              distributions: markBehind(plugin.distributions, component),
              components: [...plugin.components, component],
            };
          }
          return plugin;
        });
      });
    },
    [],
  );

  const createPlugin = useCallback(() => {
    const id = `new-plugin-${Date.now()}`;
    setPlugins((prev) => [
      {
        id,
        name: `new-plugin-${prev.length + 1}`,
        description: 'Name it, then add the first component.',
        distributions: [],
        components: [],
      },
      ...prev,
    ]);
    setSelectedPluginId(id);
    setActiveKey('plugins');
  }, []);

  /*
   * One repair, whichever axis asked for it. A target id already identifies the
   * landing of one plugin in one destination, so the caller does not have to say
   * which plugin it belongs to: from a plugin the selection is several
   * destinations of one plugin, from a destination it is several plugins in one
   * place, and both arrive here as the same list.
   */
  const redistribute = useCallback((targetIds: string[]) => {
    if (targetIds.length === 0) return;
    const ids = new Set(targetIds);
    setPlugins((prev) =>
      prev.map((plugin) =>
        plugin.distributions.some((target) => ids.has(target.id))
          ? {
              ...plugin,
              distributions: realign(plugin.distributions, targetIds),
            }
          : plugin,
      ),
    );
  }, []);

  return (
    <PMPage
      title="Space navigation"
      subtitle="One component, one plugin. The plugin is the unit a repository installs and a marketplace publishes."
      isFullWidth
      actions={
        <PMHStack gap={3} align="center" wrap="wrap">
          <ControlSelect
            label="Sidebar"
            width="200px"
            items={NAV_MODES}
            value={navMode}
            onChange={(value) => setNavMode(value as NavMode)}
          />
          <ControlSelect
            label="Component types"
            width="160px"
            items={HORIZONS}
            value={horizon}
            onChange={(value) => setHorizon(value as TypeHorizon)}
          />
          <ControlSelect
            label="Data"
            width="210px"
            items={SCENARIOS}
            value={scenario}
            onChange={(value) => handleScenarioChange(value as Scenario)}
          />
        </PMHStack>
      }
    >
      <PMVStack gap={4} align="stretch">
        <NavCountCaption
          navMode={navMode}
          entryCount={entries.length}
          typeCount={typesForHorizon(horizon).length}
        />

        <PMBox
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="md"
          overflow="hidden"
          height="calc(100vh - 300px)"
          minHeight="560px"
          bg="background.primary"
        >
          <PMHStack gap={0} align="stretch" height="100%" minH={0}>
            <SpaceSidebar
              mode={navMode}
              horizon={horizon}
              activeKey={activeKey}
              onSelect={selectNavEntry}
              badges={badges}
            />
            <PMBox flex={1} minW={0} minH={0} overflow="hidden">
              {activeKey === 'plugins' ? (
                <PluginsSurface
                  plugins={plugins}
                  horizon={horizon}
                  selectedPluginId={selectedPluginId}
                  initialPluginView={pluginView}
                  onSelectPlugin={setSelectedPluginId}
                  onCreateComponent={createComponent}
                  onMoveComponent={moveComponent}
                  onCreatePlugin={createPlugin}
                  onRedistribute={redistribute}
                />
              ) : activeKey === 'distribution' ? (
                <DistributionSurface
                  plugins={plugins}
                  onRedistribute={redistribute}
                  onOpenPlugin={openPluginDistribution}
                  onGoToContext={() => selectNavEntry('plugins')}
                />
              ) : (
                <PMBox height="100%" overflowY="auto">
                  <OtherPane activeKey={activeKey} />
                </PMBox>
              )}
            </PMBox>
          </PMHStack>
        </PMBox>
      </PMVStack>
    </PMPage>
  );
}

/**
 * Editing the content of a plugin puts every place it is distributed behind.
 * That is the whole reason the two views sit side by side: the drift the user
 * sees is the one they just created.
 *
 * Every place except a marketplace that would not carry the component. Writing a
 * standard changes nothing for a marketplace, so claiming otherwise would offer
 * a republication that changes nothing.
 */
function markBehind(
  targets: DistributionTarget[],
  component: { name: string; type: string },
): DistributionTarget[] {
  const carried = descriptorFor(component.type).marketplaceRenderable;

  return targets.map((target) => {
    if (target.mode === 'marketplace' && !carried) return target;
    return {
      ...target,
      state: target.state === 'failed' ? 'failed' : 'drift',
      lastEvent:
        target.state === 'aligned'
          ? `last ${target.lastEvent}`
          : target.lastEvent,
      behind: target.behind.includes(component.name)
        ? target.behind
        : [...target.behind, component.name],
    };
  });
}

function realign(
  targets: DistributionTarget[],
  targetIds: string[],
): DistributionTarget[] {
  return targets.map((target) =>
    targetIds.includes(target.id)
      ? {
          ...target,
          state: 'aligned' as const,
          behind: [],
          error: undefined,
          lastEvent:
            target.mode === 'marketplace'
              ? `published as v${target.version}`
              : `${distributionVerb(target.mode)} just now`,
        }
      : target,
  );
}

function NavCountCaption({
  navMode,
  entryCount,
  typeCount,
}: Readonly<{ navMode: NavMode; entryCount: number; typeCount: number }>) {
  const isProposed = navMode === 'plugin-first';
  return (
    <PMHStack gap={2} align="baseline" paddingX={1} wrap="wrap">
      <PMText
        fontSize="xl"
        fontWeight="semibold"
        fontVariantNumeric="tabular-nums"
        lineHeight="1"
        letterSpacing="-0.02em"
      >
        {entryCount}
      </PMText>
      <PMText color="secondary">
        {entryCount === 1 ? 'navigation entry' : 'navigation entries'} for{' '}
        {typeCount} component types.{' '}
        {isProposed
          ? 'A new type adds none: it appears inside its plugin.'
          : 'Every new type adds one, in the same list.'}
      </PMText>
    </PMHStack>
  );
}

function OtherPane({ activeKey }: Readonly<{ activeKey: string }>) {
  // Reachable from today's navigation only: the proposed one has no such entry.
  if (activeKey === 'overview') {
    return (
      <StubPane
        title="Overview (today's navigation)"
        lines={[
          'Three blocks today: a count per component type, a drift panel, and a full distribution table.',
          'The redesign removes this one too, and none of the three is lost. The counts describe the architecture it replaces. The drift panel becomes a badge on Distribution, permanently visible instead of waiting to be visited. The table becomes Distribution itself, minus its By packages tab, which restated Context.',
          'It would earn an entry back the day it can show what none of the other three can: whether what we ship is read, and whether it changes the code. That needs telemetry we do not have yet.',
        ]}
      />
    );
  }

  /*
    Reached from the space itself, in both architectures: the gear hangs off the
    space name in the sidebar and opens a page, it is not one of the space's
    entries. The redesign leaves that alone on purpose. An entry would be the
    only one in the list that is about the container rather than about what the
    space holds, and with several spaces in the sidebar it would have to be
    repeated per space or apply to whichever one happens to be open.
  */
  if (activeKey === SPACE_SETTINGS_KEY) {
    return (
      <StubPane
        title="Space settings"
        lines={[
          'Two tabs today: General (name, colour, visibility) and Members.',
          'Unchanged by this redesign, and deliberately not an entry: it is reached from the space row in the sidebar, where the space itself is.',
        ]}
      />
    );
  }

  if (activeKey === 'review-changes') {
    return (
      <StubPane
        title="Review changes"
        lines={[
          'The inbox: changes proposed from repositories, waiting on a decision.',
          'Unchanged by this redesign, apart from becoming a permanent top-level entry instead of the last item in a Playbook section.',
        ]}
      />
    );
  }

  const typeKey = activeKey.replace('type-', '');
  const label = safeLabel(typeKey);

  return (
    <StubPane
      title={`${label} (today's navigation)`}
      lines={[
        `A flat list of every ${label.toLowerCase()} in the space, with no indication of what distributes it.`,
        'This is the entry the redesign removes. Its content moves inside the plugin that owns it.',
        'Not prototyped: switch the sidebar back to plugin-first to see the replacement.',
      ]}
    />
  );
}

function safeLabel(typeKey: string): string {
  try {
    return descriptorFor(typeKey).labelPlural;
  } catch {
    return 'Components';
  }
}

function ControlSelect({
  label,
  items,
  value,
  onChange,
  width,
}: Readonly<{
  label: string;
  items: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  width: string;
}>) {
  return (
    <PMHStack gap={2} align="center">
      <PMText fontSize="xs" color="faded" whiteSpace="nowrap">
        {label}
      </PMText>
      <PMNativeSelect
        items={items}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        size="sm"
        width={width}
      />
    </PMHStack>
  );
}
