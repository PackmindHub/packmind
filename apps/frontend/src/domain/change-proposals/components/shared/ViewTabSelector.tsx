import { PMHStack, PMIcon, PMTabs } from '@packmind/ui';
import { LuRepeat2, LuEye, LuSparkles } from 'react-icons/lu';
import { ReviewTab } from '../../hooks/useCardReviewState';
import { type ComponentType } from 'react';

interface ViewTabSelectorProps {
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  disabledTabs?: ReviewTab[];
}

const tabDefinitions: {
  label: string;
  value: ReviewTab;
  icon: ComponentType;
}[] = [
  { label: 'Changes', value: 'changes', icon: LuRepeat2 },
  { label: 'Original', value: 'original', icon: LuEye },
  { label: 'Result', value: 'result', icon: LuSparkles },
];

export function ViewTabSelector({
  activeTab,
  onTabChange,
  disabledTabs,
}: Readonly<ViewTabSelectorProps>) {
  const tabs = tabDefinitions.map((tab) => ({
    value: tab.value,
    triggerLabel: (
      <PMHStack gap={1} alignItems="center">
        <PMIcon>
          <tab.icon />
        </PMIcon>
        {tab.label}
      </PMHStack>
    ),
    disabled: disabledTabs?.includes(tab.value),
  }));

  return (
    <PMTabs
      tabs={tabs}
      defaultValue={activeTab}
      value={activeTab}
      onValueChange={(details) => onTabChange(details.value as ReviewTab)}
      variant="enclosed"
      size="sm"
    />
  );
}
