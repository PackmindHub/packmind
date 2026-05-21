import { useState } from 'react';
import {
  PMButton,
  PMHStack,
  PMIcon,
  PMNativeSelect,
  PMPage,
  PMText,
} from '@packmind/ui';
import { LuPlus } from 'react-icons/lu';
import { MarketplacesIndex } from './components/MarketplacesIndex';
import type { Scenario } from './types';

const SCENARIO_ITEMS: Array<{ label: string; value: Scenario }> = [
  { label: 'Default (7 marketplaces)', value: 'default' },
  { label: 'Empty (first-run)', value: 'empty' },
  { label: 'Loading', value: 'loading' },
];

export default function MarketplacesPrototype() {
  const [scenario, setScenario] = useState<Scenario>('default');

  return (
    <PMPage
      title="Marketplaces"
      subtitle="Publish curated packages as Git-backed marketplaces. Claude Code and Copilot read directly from these repos."
      isFullWidth
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
          <PMButton variant="primary" size="sm">
            <PMIcon fontSize="sm">
              <LuPlus />
            </PMIcon>
            New marketplace
          </PMButton>
        </PMHStack>
      }
    >
      <MarketplacesIndex scenario={scenario} />
    </PMPage>
  );
}
