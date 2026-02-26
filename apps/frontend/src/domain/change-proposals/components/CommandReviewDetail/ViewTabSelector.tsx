import { PMHStack, PMIcon, PMSegmentGroup } from '@packmind/ui';
import { LuRepeat2, LuEye, LuSparkles } from 'react-icons/lu';
import { ReviewTab } from '../../hooks/useCommandReviewState';
import { type ComponentType } from 'react';

interface ViewTabSelectorProps {
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
}

const tabs: { label: string; value: ReviewTab; icon: ComponentType }[] = [
  { label: 'Changes', value: 'changes', icon: LuRepeat2 },
  { label: 'Original', value: 'original', icon: LuEye },
  { label: 'Result', value: 'result', icon: LuSparkles },
];

export function ViewTabSelector({
  activeTab,
  onTabChange,
}: Readonly<ViewTabSelectorProps>) {
  return (
    <PMSegmentGroup.Root
      size="sm"
      value={activeTab}
      onValueChange={(e) => onTabChange(e.value as ReviewTab)}
    >
      <PMSegmentGroup.Indicator />
      {tabs.map((tab) => (
        <PMSegmentGroup.Item key={tab.value} value={tab.value}>
          <PMSegmentGroup.ItemText>
            <PMHStack gap={1} alignItems="center">
              <PMIcon>
                <tab.icon />
              </PMIcon>
              {tab.label}
            </PMHStack>
          </PMSegmentGroup.ItemText>
          <PMSegmentGroup.ItemHiddenInput />
        </PMSegmentGroup.Item>
      ))}
    </PMSegmentGroup.Root>
  );
}
