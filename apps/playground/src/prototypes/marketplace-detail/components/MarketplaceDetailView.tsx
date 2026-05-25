import { PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import { LuPlug } from 'react-icons/lu';
import type { MarketplaceDetail, Scenario } from '../types';
import { PluginMasterRail } from './PluginMasterRail';
import { PluginDetailPane } from './PluginDetailPane';
import { LoadingState } from './LoadingState';
import { EmptyMarketplaceState } from './EmptyMarketplaceState';

type MarketplaceDetailViewProps = {
  scenario: Scenario;
  marketplace: MarketplaceDetail;
  selectedPluginId: string | null;
  onSelectPlugin: (pluginId: string) => void;
};

export function MarketplaceDetailView({
  scenario,
  marketplace,
  selectedPluginId,
  onSelectPlugin,
}: Readonly<MarketplaceDetailViewProps>) {
  if (scenario === 'loading') {
    return (
      <ContainerFrame>
        <LoadingState />
      </ContainerFrame>
    );
  }

  if (scenario === 'empty') {
    return (
      <ContainerFrame>
        <EmptyMarketplaceState />
      </ContainerFrame>
    );
  }

  const selectedPlugin =
    marketplace.plugins.find((p) => p.id === selectedPluginId) ??
    marketplace.plugins[0] ??
    null;

  return (
    <ContainerFrame>
      <PMHStack gap={0} align="stretch" minH="640px">
        <PluginMasterRail
          plugins={marketplace.plugins}
          selectedPluginId={selectedPlugin?.id ?? null}
          onSelect={onSelectPlugin}
          unreachable={marketplace.state === 'unreachable'}
        />
        <PMBox flex="1" minW={0} bg="background.primary">
          {selectedPlugin ? (
            <PluginDetailPane
              key={selectedPlugin.id}
              plugin={selectedPlugin}
              unreachable={marketplace.state === 'unreachable'}
            />
          ) : (
            <PMVStack gap={2} padding={10} align="start">
              <PMBox color="text.faded">
                <LuPlug size={20} />
              </PMBox>
              <PMText fontSize="sm" color="secondary">
                Select a plugin from the list.
              </PMText>
            </PMVStack>
          )}
        </PMBox>
      </PMHStack>
    </ContainerFrame>
  );
}

function ContainerFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
    >
      {children}
    </PMBox>
  );
}
