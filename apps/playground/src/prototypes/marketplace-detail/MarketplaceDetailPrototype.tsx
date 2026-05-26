import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMMenu,
  PMNativeSelect,
  PMPage,
  PMPortal,
  PMText,
} from '@packmind/ui';
import {
  LuChevronRight,
  LuEllipsis,
  LuExternalLink,
  LuPencilLine,
  LuRotateCw,
  LuTrash2,
} from 'react-icons/lu';
import { MarketplaceDetailView } from './components/MarketplaceDetailView';
import { EMPTY_MARKETPLACE, STUB_MARKETPLACE } from './data';
import type { MarketplaceDetail, Plugin, PolicyKey, Scenario } from './types';

type PolicyOverrides = Record<string, Partial<Record<PolicyKey, boolean>>>;

const SCENARIO_ITEMS: Array<{ label: string; value: Scenario }> = [
  { label: 'Default (6 plugins)', value: 'default' },
  { label: 'Empty (first plugin)', value: 'empty' },
  { label: 'Loading', value: 'loading' },
  { label: 'Repo unreachable', value: 'unreachable' },
];

const MARKETPLACE_SUBTITLE: Record<string, string> = {
  frontend:
    'React conventions, hooks discipline, and component file layout for the customer-facing apps.',
  fresh:
    'Newly connected. Add a first plugin to start publishing to Claude Code and Copilot.',
};

export default function MarketplaceDetailPrototype() {
  const [scenario, setScenario] = useState<Scenario>('default');
  const [policyOverrides, setPolicyOverrides] = useState<PolicyOverrides>({});

  const baseMarketplace = useMemo<MarketplaceDetail>(() => {
    if (scenario === 'empty') return EMPTY_MARKETPLACE;
    if (scenario === 'unreachable') {
      return { ...STUB_MARKETPLACE, state: 'unreachable' };
    }
    return STUB_MARKETPLACE;
  }, [scenario]);

  const marketplace = useMemo<MarketplaceDetail>(
    () => applyPolicyOverrides(baseMarketplace, policyOverrides),
    [baseMarketplace, policyOverrides],
  );

  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(
    marketplace.plugins[0]?.id ?? null,
  );

  useEffect(() => {
    setSelectedPluginId(marketplace.plugins[0]?.id ?? null);
  }, [marketplace.id]);

  const handlePolicyChange = useCallback(
    (pluginId: string, key: PolicyKey, value: boolean) => {
      setPolicyOverrides((prev) => ({
        ...prev,
        [pluginId]: { ...prev[pluginId], [key]: value },
      }));
    },
    [],
  );

  const title =
    scenario === 'loading' ? STUB_MARKETPLACE.name : marketplace.name;
  const subtitle =
    scenario === 'loading'
      ? MARKETPLACE_SUBTITLE[STUB_MARKETPLACE.id]
      : (MARKETPLACE_SUBTITLE[marketplace.id] ?? '');

  return (
    <PMPage
      title={title}
      subtitle={subtitle}
      isFullWidth
      breadcrumbComponent={<Backlink />}
      actions={
        <PMHStack gap={3} align="center">
          <PMHStack gap={2} align="center">
            <PMText fontSize="xs" color="faded">
              Scenario
            </PMText>
            <PMNativeSelect
              items={SCENARIO_ITEMS.map((s) => ({
                label: s.label,
                value: s.value,
              }))}
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              size="sm"
              width="200px"
            />
          </PMHStack>
          {marketplace.state === 'unreachable' ? (
            <PMButton variant="primary" size="sm">
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
              Reconnect
            </PMButton>
          ) : (
            <PMButton variant="outline" size="sm">
              <PMIcon fontSize="sm">
                <LuRotateCw />
              </PMIcon>
              Sync
            </PMButton>
          )}
          <PMButton variant="secondary" size="sm">
            <PMIcon fontSize="sm">
              <LuExternalLink />
            </PMIcon>
            Open on GitHub
          </PMButton>
          <OverflowMenu />
        </PMHStack>
      }
    >
      <MarketplaceDetailView
        scenario={scenario}
        marketplace={marketplace}
        selectedPluginId={selectedPluginId}
        onSelectPlugin={setSelectedPluginId}
        onChangePolicy={handlePolicyChange}
      />
    </PMPage>
  );
}

function applyPolicyOverrides(
  marketplace: MarketplaceDetail,
  overrides: PolicyOverrides,
): MarketplaceDetail {
  if (Object.keys(overrides).length === 0) return marketplace;
  return {
    ...marketplace,
    plugins: marketplace.plugins.map((plugin) =>
      mergePolicy(plugin, overrides[plugin.id]),
    ),
  };
}

function mergePolicy(
  plugin: Plugin,
  override: Partial<Record<PolicyKey, boolean>> | undefined,
): Plugin {
  if (!override) return plugin;
  return {
    ...plugin,
    ...(override.autoUpdate !== undefined
      ? { autoUpdate: override.autoUpdate }
      : {}),
    ...(override.mandatory !== undefined
      ? { mandatory: override.mandatory }
      : {}),
  };
}

function Backlink() {
  return (
    <PMBox
      as="button"
      type="button"
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

function OverflowMenu() {
  return (
    <PMMenu.Root positioning={{ placement: 'bottom-end' }}>
      <PMMenu.Trigger asChild>
        <PMBox
          as="button"
          type="button"
          width="32px"
          height="32px"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          bg="transparent"
          border="1px solid"
          borderColor="border.tertiary"
          borderRadius="sm"
          color="text.secondary"
          cursor="pointer"
          aria-label="More actions"
          transition="background-color 150ms ease-out, color 150ms ease-out"
          _hover={{ color: 'text.primary', bg: 'background.tertiary' }}
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
              <PMHStack gap={2} flex={1} align="center">
                <PMIcon fontSize="sm" color="text.faded">
                  <LuPencilLine />
                </PMIcon>
                <PMText fontSize="xs" color="primary">
                  Rename marketplace
                </PMText>
              </PMHStack>
            </PMMenu.Item>
            <PMMenu.Item value="delete" cursor="pointer">
              <PMHStack gap={2} flex={1} align="center">
                <PMIcon fontSize="sm" color="red.500">
                  <LuTrash2 />
                </PMIcon>
                <PMText fontSize="xs" color="red.500">
                  Delete marketplace
                </PMText>
              </PMHStack>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}
