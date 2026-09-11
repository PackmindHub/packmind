import { useEffect, useMemo, useState } from 'react';
import {
  PMBox,
  PMHStack,
  PMIcon,
  PMNativeSelect,
  PMPage,
  PMText,
} from '@packmind/ui';
import { LuChevronRight } from 'react-icons/lu';
import { PluginRail } from './components/PluginRail';
import { PluginDetailPane } from './components/PluginDetailPane';
import { SCENARIO_ITEMS, buildMarketplace } from './data';
import type { Scenario } from './types';

// Redesign of /org/:orgSlug/marketplaces/:marketplaceId — specifically the
// Adoption surface.
//
// What today's page does wrong, and what this changes:
//
// 1. Three levels of tabs. A "Plugins" strip with a single tab, then
//    Overview / Changes / Adoption inside the plugin pane, then By repo /
//    By person inside Adoption. Here the single-tab strip is gone and the axis
//    switch became a "Group by" control, leaving exactly one tab level.
// 2. Nothing could be searched or filtered. The only control was a "N behind"
//    pill. Here one toolbar carries search, group-by, scope and agent facets,
//    with removable chips and a live result count.
// 3. "By repo" and "By person" were disjoint sets — repo-scope installs on one
//    axis, machine-wide installs on the other, each invisible from the other.
//    Here there is one list of installs; grouping only decides how it is read,
//    so machine-wide installs appear as their own group under "Repository"
//    instead of vanishing.

export default function MarketplacePluginAdoptionPrototype() {
  const [scenario, setScenario] = useState<Scenario>('default');
  const marketplace = useMemo(
    () => buildMarketplace(scenario === 'loading' ? 'default' : scenario),
    [scenario],
  );
  const [selectedPluginId, setSelectedPluginId] = useState(
    marketplace.plugins[0].id,
  );

  useEffect(() => {
    const stillExists = marketplace.plugins.some(
      (plugin) => plugin.id === selectedPluginId,
    );
    if (!stillExists) setSelectedPluginId(marketplace.plugins[0].id);
  }, [marketplace.plugins, selectedPluginId]);

  const selectedPlugin =
    marketplace.plugins.find((plugin) => plugin.id === selectedPluginId) ??
    marketplace.plugins[0];
  const isLoading = scenario === 'loading';

  return (
    <PMPage
      title={marketplace.name}
      subtitle={`Git-backed marketplace on ${marketplace.repoPath} — publishes Packmind packages to Claude Code and Copilot CLI.`}
      isFullWidth
      breadcrumbComponent={<Backlink />}
      actions={
        <PMHStack gap={2} align="center">
          <PMText fontSize="xs" color="faded">
            Scenario
          </PMText>
          <PMNativeSelect
            items={SCENARIO_ITEMS.map((item) => ({
              label: item.label,
              value: item.value,
            }))}
            value={scenario}
            onChange={(event) => setScenario(event.target.value as Scenario)}
            size="sm"
            width="240px"
          />
        </PMHStack>
      }
    >
      <PMBox
        bg="background.primary"
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        overflow="hidden"
        flex="1"
        minH="520px"
        display="flex"
      >
        <PMHStack gap={0} align="stretch" flex="1" minH={0}>
          <PluginRail
            plugins={marketplace.plugins}
            selectedId={selectedPlugin.id}
            onSelect={setSelectedPluginId}
            installsLoading={isLoading}
          />
          <PMBox flex="1" minW={0} minH={0} overflow="auto">
            <PluginDetailPane
              key={selectedPlugin.id}
              plugin={selectedPlugin}
              isLoading={isLoading}
            />
          </PMBox>
        </PMHStack>
      </PMBox>
    </PMPage>
  );
}

function Backlink() {
  return (
    <PMBox
      as="button"
      display="inline-flex"
      alignItems="center"
      gap="6px"
      bg="transparent"
      border="none"
      padding={0}
      cursor="pointer"
      fontSize="sm"
      color="text.faded"
      transition="color 150ms ease-out"
      _hover={{ color: 'text.primary' }}
      aria-label="Back to marketplaces"
    >
      <PMIcon fontSize="sm">
        <LuChevronRight style={{ transform: 'rotate(180deg)' }} />
      </PMIcon>
      Marketplaces
    </PMBox>
  );
}
