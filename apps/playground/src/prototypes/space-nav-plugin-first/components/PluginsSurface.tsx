import { useCallback, useEffect, useState } from 'react';
import { PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';

import { SPACES, visibleComponents } from '../data';
import type { PluginSummary, PluginView, TypeHorizon } from '../types';
import { ComponentDetailPane } from './ComponentDetailPane';
import { NewComponentForm } from './NewComponentForm';
import { PluginDetailPane } from './PluginDetailPane';
import { PluginMasterRail } from './PluginMasterRail';
import { PluginsEmptyState } from './PluginsEmptyState';
import { FileDetailPane, SkillFileRail } from './SkillFileRail';
import { SpaceContentPane } from './SpaceContentPane';

const SKILL_MD_PATH = 'SKILL.md';

export function PluginsSurface({
  plugins,
  horizon,
  selectedPluginId,
  initialPluginView,
  onSelectPlugin,
  onCreateComponent,
  onMoveComponent,
  onCreatePlugin,
  onRedistribute,
}: Readonly<{
  plugins: PluginSummary[];
  horizon: TypeHorizon;
  selectedPluginId: string | null;
  /** Set by the surface that sent the user here, see `PluginDetailPane`. */
  initialPluginView: PluginView;
  onSelectPlugin: (id: string) => void;
  onCreateComponent: (input: {
    type: string;
    name: string;
    summary: string;
    targetPluginId: string;
  }) => string;
  onMoveComponent: (componentId: string, targetPluginId: string) => void;
  onCreatePlugin: () => void;
  /*
   * Targets, not a plugin and its targets: a target id identifies the landing
   * of one plugin in one destination on its own. Passing the plugin as well
   * would have let this surface and the Distribution one call the same repair
   * with two different arguments.
   */
  onRedistribute: (targetIds: string[]) => void;
}>) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );
  /**
   * The inventory is a state of this surface, not a place in the sidebar, and
   * not the state it opens in: landing on a plugin is what says the plugin is
   * the unit. Leaving Context and coming back drops it for the same reason.
   */
  const [showingAll, setShowingAll] = useState(false);
  const [selectedFilePath, setSelectedFilePath] =
    useState<string>(SKILL_MD_PATH);
  const [creatingType, setCreatingType] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  /**
   * Selecting a plugin and opening a component inside another plugin both move
   * the rail, so what they leave behind cannot be decided by watching the
   * selected plugin change: one clears the open component, the other sets it.
   * Each says so itself.
   */
  const openPlugin = useCallback(
    (pluginId: string) => {
      setSelectedComponentId(null);
      setCreatingType(null);
      setShowingAll(false);
      onSelectPlugin(pluginId);
    },
    [onSelectPlugin],
  );

  /*
   * Opening a component from the inventory takes the rail with it: a component
   * is reached through the plugin that carries it, and the answer to "who owns
   * this" is worth more than keeping the flat list highlighted behind.
   */
  const openComponent = useCallback(
    (pluginId: string, componentId: string) => {
      setCreatingType(null);
      setShowingAll(false);
      onSelectPlugin(pluginId);
      setSelectedComponentId(componentId);
    },
    [onSelectPlugin],
  );

  const showAllComponents = useCallback(() => {
    setSelectedComponentId(null);
    setCreatingType(null);
    setShowingAll(true);
  }, []);

  // The selection can also move without going through the rail: a new plugin,
  // another data scenario. A half-filled creation form does not follow it.
  useEffect(() => {
    setCreatingType(null);
  }, [selectedPluginId]);

  // Entering an component always starts on its entry file.
  useEffect(() => {
    setSelectedFilePath(SKILL_MD_PATH);
  }, [selectedComponentId]);

  if (plugins.length === 0) {
    return <PluginsEmptyState onCreatePlugin={onCreatePlugin} />;
  }

  // The prototype runs one space, the first of the sidebar's list.
  const spaceName = SPACES[0].name;

  /**
   * The inventory exists to cut across plugins. With one, there is nothing to
   * cut across: every row would name the same owner, and the view would be a
   * worse copy of that plugin's own Content tab, which can also create. Derived
   * rather than stored, so switching to a younger space cannot leave the pane
   * open on a list it no longer earns.
   */
  const canShowAll = plugins.length > 1;
  const showingInventory = showingAll && canShowAll;
  const selectedPlugin =
    plugins.find((plugin) => plugin.id === selectedPluginId) ?? plugins[0];
  const components = visibleComponents(selectedPlugin, horizon);
  const selectedComponent =
    components.find((a) => a.id === selectedComponentId) ?? null;

  // The rail turns into a file tree only when there is a tree to navigate.
  // Roughly 40% of real skills are a single SKILL.md and gain nothing from it.
  const railShowsFileTree =
    !showingInventory &&
    selectedComponent !== null &&
    !creatingType &&
    (selectedComponent.files?.length ?? 0) > 1;

  const selectedFile = railShowsFileTree
    ? (selectedComponent.files?.find((f) => f.path === selectedFilePath) ??
      null)
    : null;

  return (
    <PMHStack gap={0} align="stretch" height="100%" minH={0}>
      {railShowsFileTree && selectedComponent ? (
        <SkillFileRail
          component={selectedComponent}
          plugin={selectedPlugin}
          selectedFilePath={selectedFilePath}
          onSelectFile={setSelectedFilePath}
          onBackToPlugin={() => setSelectedComponentId(null)}
        />
      ) : (
        <PluginMasterRail
          plugins={plugins}
          horizon={horizon}
          selectedPluginId={selectedPlugin.id}
          showingAll={showingInventory}
          canShowAll={canShowAll}
          query={query}
          onQueryChange={setQuery}
          onSelect={openPlugin}
          onShowAll={showAllComponents}
          onOpenComponent={openComponent}
          onCreatePlugin={onCreatePlugin}
        />
      )}
      <PMBox flex={1} minW={0} minH={0} overflowY="auto">
        {showingInventory ? (
          <SpaceContentPane
            plugins={plugins}
            horizon={horizon}
            spaceName={spaceName}
            onOpenComponent={openComponent}
          />
        ) : creatingType ? (
          <NewComponentForm
            type={creatingType}
            plugin={selectedPlugin}
            plugins={plugins}
            onCancel={() => setCreatingType(null)}
            onCreate={({ name, summary, targetPluginId }) => {
              const createdId = onCreateComponent({
                type: creatingType,
                name,
                summary,
                targetPluginId,
              });
              setCreatingType(null);
              if (targetPluginId !== selectedPlugin.id) {
                onSelectPlugin(targetPluginId);
              }
              setSelectedComponentId(createdId);
            }}
          />
        ) : selectedFile && selectedFile.path !== SKILL_MD_PATH ? (
          <FileDetailPane
            file={selectedFile}
            component={
              selectedComponent as NonNullable<typeof selectedComponent>
            }
          />
        ) : selectedComponent ? (
          <ComponentDetailPane
            component={selectedComponent}
            plugin={selectedPlugin}
            plugins={plugins}
            filesInRail={railShowsFileTree}
            onBack={() => setSelectedComponentId(null)}
            onMoveToPlugin={(targetPluginId) => {
              onMoveComponent(selectedComponent.id, targetPluginId);
              setSelectedComponentId(null);
              onSelectPlugin(targetPluginId);
            }}
          />
        ) : (
          <PluginDetailPane
            // The intent is part of the identity: arriving on the same plugin
            // a second time, from a destination, has to reopen on Distribution.
            key={`${selectedPlugin.id}-${initialPluginView}`}
            plugin={selectedPlugin}
            horizon={horizon}
            initialView={initialPluginView}
            onOpenComponent={setSelectedComponentId}
            onCreateComponent={setCreatingType}
            onRedistribute={onRedistribute}
          />
        )}
      </PMBox>
    </PMHStack>
  );
}

export function StubPane({
  title,
  lines,
}: Readonly<{ title: string; lines: string[] }>) {
  return (
    <PMBox padding={6} maxWidth="72ch">
      <PMText fontSize="lg" fontWeight="semibold">
        {title}
      </PMText>
      <PMVStack gap={2} align="stretch" paddingTop={3}>
        {lines.map((line) => (
          <PMText key={line} color="secondary">
            {line}
          </PMText>
        ))}
      </PMVStack>
    </PMBox>
  );
}
