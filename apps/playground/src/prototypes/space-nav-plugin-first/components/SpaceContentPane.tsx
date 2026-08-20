import { useMemo, useState } from 'react';
import { PMBox, PMHStack, PMHeading, PMText } from '@packmind/ui';

import { countByType, typesForHorizon, visibleComponents } from '../data';
import type { PluginSummary, TypeHorizon } from '../types';
import type { ComponentEntry } from './ComponentTable';
import { ComponentGroups } from './ComponentTable';
import { FilterChip } from './FilterChip';

/**
 * Every component in the space, whatever plugin carries it.
 *
 * The one thing the plugin-first navigation took away. Search answers "where is
 * X", which the rail already does across plugins; this answers "what do we
 * have", which nothing did any more once the seven per-type entries went. It is
 * the same question those entries answered, asked once instead of once per
 * type: a new component type adds a chip here, never a place to go.
 *
 * Read-only on purpose. Creating belongs to a plugin, because a component
 * without one cannot be distributed, and a New button here would have to ask
 * which plugin before doing anything — the question the surface is built to
 * make you answer first.
 */
export function SpaceContentPane({
  plugins,
  horizon,
  spaceName,
  onOpenComponent,
}: Readonly<{
  plugins: PluginSummary[];
  horizon: TypeHorizon;
  spaceName: string;
  onOpenComponent: (pluginId: string, componentId: string) => void;
}>) {
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  /**
   * Sorted by name inside each type rather than kept in plugin order, which is
   * what makes the inventory worth having: three plugins carrying their own
   * copy of the same standard land on three adjacent rows, and the Plugin
   * column says who owns which. In plugin order they never meet.
   */
  const entries = useMemo<ComponentEntry[]>(
    () =>
      plugins
        .flatMap((plugin) =>
          visibleComponents(plugin, horizon).map((component) => ({
            component,
            plugin,
          })),
        )
        .sort((a, b) => a.component.name.localeCompare(b.component.name)),
    [plugins, horizon],
  );

  const counts = useMemo(
    () => countByType(entries.map((entry) => entry.component)),
    [entries],
  );
  const presentTypes = typesForHorizon(horizon).filter((type) =>
    counts.has(type.type),
  );
  const shown = typeFilter
    ? entries.filter((entry) => entry.component.type === typeFilter)
    : entries;

  return (
    <PMBox padding={6}>
      <PMHeading level="h2">All components</PMHeading>
      <PMText as="div" color="secondary" paddingTop={1}>
        Everything {spaceName} owns, across its {plugins.length} plugin
        {plugins.length === 1 ? '' : 's'}. Open one to reach the plugin that
        carries it.
      </PMText>

      <PMBox paddingTop={5}>
        <PMHStack gap={1} wrap="wrap">
          <FilterChip
            label="All"
            count={entries.length}
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
      </PMBox>

      <PMBox paddingTop={4}>
        {shown.length === 0 ? (
          <PMText fontSize="sm" color="secondary">
            {entries.length === 0
              ? 'No component in this space yet. Open a plugin to add the first one.'
              : /*
                 * Reachable by narrowing the type horizon while a filter is on:
                 * the chip goes, the filter stays. An empty bordered box would
                 * read as a loading state.
                 */
                'No component of this type in this space.'}
          </PMText>
        ) : (
          <ComponentGroups
            entries={shown}
            horizon={horizon}
            grouped={typeFilter === null}
            showPlugin
            onOpen={(entry) =>
              onOpenComponent(entry.plugin.id, entry.component.id)
            }
          />
        )}
      </PMBox>
    </PMBox>
  );
}
