import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMNativeSelect,
  PMPage,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuCheck, LuLink } from 'react-icons/lu';
import { MarketplacesIndex } from './components/MarketplacesIndex';
import { LinkMarketplacePanel } from './components/LinkMarketplacePanel';
import { STUB_MARKETPLACES } from './data';
import type { LinkScenario, Marketplace, Scenario } from './types';

const SCENARIO_ITEMS: Array<{ label: string; value: Scenario }> = [
  { label: 'Default (7 marketplaces)', value: 'default' },
  { label: 'Empty (first-run)', value: 'empty' },
  { label: 'Loading', value: 'loading' },
];

const LINK_SCENARIO_ITEMS: Array<{ label: string; value: LinkScenario }> = [
  { label: 'Git connected', value: 'git-connected' },
  { label: 'Git not connected', value: 'git-not-connected' },
  { label: 'Collision on submit', value: 'collision-on-submit' },
];

export default function MarketplacesPrototype() {
  const [scenario, setScenario] = useState<Scenario>('default');
  const [linkScenario, setLinkScenario] =
    useState<LinkScenario>('git-connected');
  const [panelOpen, setPanelOpen] = useState(false);
  const [marketplaces, setMarketplaces] =
    useState<Marketplace[]>(STUB_MARKETPLACES);
  const [newlyLinkedId, setNewlyLinkedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setMarketplaces(scenario === 'default' ? STUB_MARKETPLACES : []);
  }, [scenario]);

  useEffect(() => {
    if (!newlyLinkedId) return;
    const id = setTimeout(() => setNewlyLinkedId(null), 1400);
    return () => clearTimeout(id);
  }, [newlyLinkedId]);

  useEffect(() => {
    if (!successToast) return;
    const id = setTimeout(() => setSuccessToast(null), 3200);
    return () => clearTimeout(id);
  }, [successToast]);

  const existingNames = useMemo(
    () => marketplaces.map((m) => m.name),
    [marketplaces],
  );
  const existingRepoPaths = useMemo(
    () => marketplaces.map((m) => m.repoPath),
    [marketplaces],
  );

  const handleOpenPanel = useCallback(() => {
    setPanelOpen(true);
    if (scenario !== 'default') setScenario('default');
  }, [scenario]);

  const handleClosePanel = useCallback(() => setPanelOpen(false), []);

  const handleLinked = useCallback((m: Marketplace) => {
    setMarketplaces((prev) => [m, ...prev]);
    setNewlyLinkedId(m.id);
    setSuccessToast({ id: m.id, name: m.name });
    setPanelOpen(false);
  }, []);

  return (
    <PMPage
      title="Marketplaces"
      subtitle="Publish curated packages as Git-backed marketplaces. Claude Code and Copilot read directly from these repos."
      isFullWidth
      actions={
        <PMHStack gap={3} align="center">
          <PMHStack gap={2} align="center">
            <PMText fontSize="xs" color="faded">
              List
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
          <PMHStack gap={2} align="center">
            <PMText fontSize="xs" color="faded">
              Link flow
            </PMText>
            <PMNativeSelect
              items={LINK_SCENARIO_ITEMS.map((s) => ({
                label: s.label,
                value: s.value,
              }))}
              value={linkScenario}
              onChange={(e) => setLinkScenario(e.target.value as LinkScenario)}
              size="sm"
              width="200px"
            />
          </PMHStack>
          <PMButton variant="primary" size="sm" onClick={handleOpenPanel}>
            <PMIcon fontSize="sm">
              <LuLink />
            </PMIcon>
            Link a marketplace
          </PMButton>
        </PMHStack>
      }
    >
      <MarketplacesIndex
        scenario={scenario}
        marketplaces={marketplaces}
        newlyLinkedId={newlyLinkedId}
        onOpenLinkPanel={handleOpenPanel}
      />

      <LinkMarketplacePanel
        open={panelOpen}
        onClose={handleClosePanel}
        scenario={linkScenario}
        existingNames={existingNames}
        existingRepoPaths={existingRepoPaths}
        onLinked={handleLinked}
      />

      <SuccessToast
        message={successToast ? `Linked “${successToast.name}”` : null}
      />
    </PMPage>
  );
}

function SuccessToast({ message }: Readonly<{ message: string | null }>) {
  return (
    <PMBox
      position="fixed"
      top="76px"
      right="24px"
      pointerEvents={message ? 'auto' : 'none'}
      opacity={message ? 1 : 0}
      transform={message ? 'translateY(0)' : 'translateY(-6px)'}
      transition="opacity 200ms ease-out, transform 200ms ease-out"
      zIndex={2000}
    >
      <PMHStack
        gap={2}
        paddingX={3}
        paddingY={2}
        bg="background.primary"
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        align="center"
        boxShadow="0 8px 24px rgba(0,0,0,0.32)"
      >
        <PMBox
          width="18px"
          height="18px"
          borderRadius="full"
          bg="green.500"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="background.primary"
          flexShrink={0}
        >
          <PMIcon fontSize="11px">
            <LuCheck />
          </PMIcon>
        </PMBox>
        <PMVStack gap={0} align="start">
          <PMText fontSize="xs" color="primary" fontWeight="medium">
            {message ?? ' '}
          </PMText>
        </PMVStack>
      </PMHStack>
    </PMBox>
  );
}
