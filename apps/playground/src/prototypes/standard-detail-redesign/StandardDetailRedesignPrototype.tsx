import { useCallback, useMemo, useState } from 'react';
import { PMBox, PMTabs, PMVStack } from '@packmind/ui';
import { MOCK_STANDARD } from './data';
import { StandardHeader } from './components/StandardHeader';
import { SummaryTab } from './components/SummaryTab';
import { DistributionTab } from './components/DistributionTab';
import { RuleDrawer } from './components/RuleDrawer';

export default function StandardDetailRedesignPrototype() {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  const selectedRule = useMemo(
    () => MOCK_STANDARD.rules.find((r) => r.id === selectedRuleId) ?? null,
    [selectedRuleId],
  );

  const selectedRuleIndex = useMemo(
    () =>
      selectedRule
        ? MOCK_STANDARD.rules.findIndex((r) => r.id === selectedRule.id)
        : -1,
    [selectedRule],
  );

  const handleRuleClick = useCallback((ruleId: string) => {
    setSelectedRuleId(ruleId);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedRuleId(null);
  }, []);

  const tabs = [
    {
      value: 'summary',
      triggerLabel: 'Summary',
      content: (
        <PMBox paddingTop={4}>
          <SummaryTab
            description={MOCK_STANDARD.description}
            rules={MOCK_STANDARD.rules}
            onRuleClick={handleRuleClick}
          />
        </PMBox>
      ),
    },
    {
      value: 'distribution',
      triggerLabel: 'Distribution',
      content: (
        <PMBox paddingTop={4}>
          <DistributionTab />
        </PMBox>
      ),
    },
  ];

  return (
    <PMBox height="full" overflowY="auto">
      <PMBox padding={6} maxWidth="900px" margin="0 auto">
        <PMVStack gap={2} align="stretch">
          <StandardHeader standard={MOCK_STANDARD} />
          <PMTabs tabs={tabs} defaultValue="summary" />
        </PMVStack>

        {selectedRule && (
          <RuleDrawer
            rule={selectedRule}
            ruleIndex={selectedRuleIndex}
            open={!!selectedRule}
            onClose={handleDrawerClose}
          />
        )}
      </PMBox>
    </PMBox>
  );
}
