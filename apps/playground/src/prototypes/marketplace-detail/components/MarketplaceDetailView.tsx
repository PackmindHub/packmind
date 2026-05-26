import { PMBox, PMHStack, PMText, PMVStack } from '@packmind/ui';
import { LuPlug } from 'react-icons/lu';
import type { MarketplaceDetail, PolicyKey, Scenario } from '../types';
import { PluginMasterRail } from './PluginMasterRail';
import { PluginDetailPane } from './PluginDetailPane';
import { LoadingState } from './LoadingState';
import { EmptyMarketplaceState } from './EmptyMarketplaceState';
import { SuggestionRail } from './SuggestionRail';
import { SuggestionReviewPane } from './SuggestionReviewPane';
import { EmptySuggestionsState } from './EmptySuggestionsState';

type ActiveTab = 'plugins' | 'suggestions';

type MarketplaceDetailViewProps = {
  scenario: Scenario;
  marketplace: MarketplaceDetail;
  activeTab: ActiveTab;
  onChangeTab: (next: ActiveTab) => void;
  selectedPluginId: string | null;
  onSelectPlugin: (pluginId: string) => void;
  onChangePolicy: (pluginId: string, key: PolicyKey, value: boolean) => void;
  selectedSuggestionId: string | null;
  onSelectSuggestion: (id: string) => void;
  onApproveSuggestion: (
    id: string,
    policy: { mandatory: boolean; autoUpdate: boolean },
  ) => void;
  onRejectSuggestion: (id: string, reason: string) => void;
  onRequestChangesOnSuggestion: (id: string, body: string) => void;
};

export function MarketplaceDetailView({
  scenario,
  marketplace,
  activeTab,
  onChangeTab,
  selectedPluginId,
  onSelectPlugin,
  onChangePolicy,
  selectedSuggestionId,
  onSelectSuggestion,
  onApproveSuggestion,
  onRejectSuggestion,
  onRequestChangesOnSuggestion,
}: Readonly<MarketplaceDetailViewProps>) {
  if (scenario === 'loading') {
    return (
      <ContainerFrame>
        <LoadingState />
      </ContainerFrame>
    );
  }

  const pendingCount = marketplace.suggestions.filter(
    (s) => s.state === 'pending',
  ).length;
  const unreachable = marketplace.state === 'unreachable';
  const showTabs = scenario !== 'empty';
  const effectiveTab: ActiveTab = unreachable ? 'plugins' : activeTab;

  return (
    <PMVStack gap={4} align="stretch">
      {showTabs && (
        <SectionTabs
          active={effectiveTab}
          onChange={onChangeTab}
          pluginCount={marketplace.plugins.length}
          suggestionsTotal={marketplace.suggestions.length}
          pendingCount={pendingCount}
          suggestionsDisabled={unreachable}
        />
      )}
      <ContainerFrame>
        {scenario === 'empty' || marketplace.plugins.length === 0 ? (
          <EmptyMarketplaceState />
        ) : effectiveTab === 'plugins' ? (
          <PluginsSurface
            marketplace={marketplace}
            selectedPluginId={selectedPluginId}
            onSelectPlugin={onSelectPlugin}
            onChangePolicy={onChangePolicy}
          />
        ) : (
          <SuggestionsSurface
            marketplace={marketplace}
            selectedSuggestionId={selectedSuggestionId}
            onSelectSuggestion={onSelectSuggestion}
            onApprove={onApproveSuggestion}
            onReject={onRejectSuggestion}
            onRequestChanges={onRequestChangesOnSuggestion}
          />
        )}
      </ContainerFrame>
    </PMVStack>
  );
}

type PluginsSurfaceProps = {
  marketplace: MarketplaceDetail;
  selectedPluginId: string | null;
  onSelectPlugin: (pluginId: string) => void;
  onChangePolicy: (pluginId: string, key: PolicyKey, value: boolean) => void;
};

function PluginsSurface({
  marketplace,
  selectedPluginId,
  onSelectPlugin,
  onChangePolicy,
}: Readonly<PluginsSurfaceProps>) {
  const selectedPlugin =
    marketplace.plugins.find((p) => p.id === selectedPluginId) ??
    marketplace.plugins[0] ??
    null;

  return (
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
            onChangePolicy={(key, value) =>
              onChangePolicy(selectedPlugin.id, key, value)
            }
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
  );
}

type SuggestionsSurfaceProps = {
  marketplace: MarketplaceDetail;
  selectedSuggestionId: string | null;
  onSelectSuggestion: (id: string) => void;
  onApprove: (
    id: string,
    policy: { mandatory: boolean; autoUpdate: boolean },
  ) => void;
  onReject: (id: string, reason: string) => void;
  onRequestChanges: (id: string, body: string) => void;
};

function SuggestionsSurface({
  marketplace,
  selectedSuggestionId,
  onSelectSuggestion,
  onApprove,
  onReject,
  onRequestChanges,
}: Readonly<SuggestionsSurfaceProps>) {
  if (marketplace.suggestions.length === 0) {
    return <EmptySuggestionsState />;
  }

  const selectedSuggestion =
    marketplace.suggestions.find((s) => s.id === selectedSuggestionId) ?? null;

  const hasPendingOrInReview = marketplace.suggestions.some(
    (s) => s.state === 'pending' || s.state === 'in-review',
  );

  return (
    <PMHStack gap={0} align="stretch" minH="640px">
      <SuggestionRail
        suggestions={marketplace.suggestions}
        selectedId={selectedSuggestion?.id ?? null}
        onSelect={onSelectSuggestion}
      />
      <PMBox flex="1" minW={0} bg="background.primary">
        {selectedSuggestion ? (
          <SuggestionReviewPane
            key={selectedSuggestion.id}
            suggestion={selectedSuggestion}
            onApprove={(policy) => onApprove(selectedSuggestion.id, policy)}
            onReject={(reason) => onReject(selectedSuggestion.id, reason)}
            onRequestChanges={(body) =>
              onRequestChanges(selectedSuggestion.id, body)
            }
          />
        ) : (
          <PMVStack gap={2} padding={10} align="start">
            <PMText fontSize="sm" color="secondary">
              {hasPendingOrInReview
                ? 'Select a suggestion from the list.'
                : 'Nothing to review. Pending suggestions will appear here.'}
            </PMText>
          </PMVStack>
        )}
      </PMBox>
    </PMHStack>
  );
}

type SectionTabsProps = {
  active: ActiveTab;
  onChange: (next: ActiveTab) => void;
  pluginCount: number;
  suggestionsTotal: number;
  pendingCount: number;
  suggestionsDisabled: boolean;
};

function SectionTabs({
  active,
  onChange,
  pluginCount,
  suggestionsTotal,
  pendingCount,
  suggestionsDisabled,
}: Readonly<SectionTabsProps>) {
  return (
    <PMHStack
      gap={6}
      align="center"
      borderBottom="1px solid"
      borderColor="border.tertiary"
      paddingX={1}
    >
      <TabButton
        active={active === 'plugins'}
        onClick={() => onChange('plugins')}
        label="Plugins"
        count={pluginCount}
        countAccent={false}
      />
      <TabButton
        active={active === 'suggestions'}
        onClick={() => {
          if (!suggestionsDisabled) onChange('suggestions');
        }}
        label="Suggestions"
        count={suggestionsTotal}
        countAccent={pendingCount > 0}
        countLabel={pendingCount > 0 ? `${pendingCount} pending` : undefined}
        disabled={suggestionsDisabled}
      />
    </PMHStack>
  );
}

type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  countAccent: boolean;
  countLabel?: string;
  disabled?: boolean;
};

function TabButton({
  active,
  onClick,
  label,
  count,
  countAccent,
  countLabel,
  disabled = false,
}: Readonly<TabButtonProps>) {
  const baseColor = disabled
    ? 'text.faded'
    : active
      ? 'text.primary'
      : 'text.secondary';

  return (
    <PMBox
      as="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      bg="transparent"
      border="none"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      paddingY={3}
      paddingX={0}
      borderBottom="2px solid"
      borderColor={active ? 'branding.primary' : 'transparent'}
      marginBottom="-1px"
      transition="color 150ms ease-out"
      _hover={active || disabled ? undefined : { color: 'text.primary' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'branding.primary',
        outlineOffset: '2px',
        borderRadius: 'sm',
      }}
      aria-pressed={active}
      aria-label={countLabel ? `${label}, ${countLabel}` : label}
    >
      <PMHStack gap={2} align="center">
        <PMText fontSize="sm" fontWeight="medium" color={baseColor}>
          {label}
        </PMText>
        <PMBox
          paddingX="6px"
          paddingY="1px"
          borderRadius="sm"
          bg={countAccent ? 'branding.primary' : 'background.tertiary'}
          color={countAccent ? 'beige.1000' : 'text.faded'}
          fontSize="11px"
          fontWeight="semibold"
          fontVariantNumeric="tabular-nums"
          lineHeight="1.4"
        >
          {count}
        </PMBox>
      </PMHStack>
    </PMBox>
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
