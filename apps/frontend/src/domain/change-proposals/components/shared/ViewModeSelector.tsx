import { PMSegmentGroup } from '@packmind/ui';
import { ViewMode } from '../../hooks/useCardReviewState';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const viewModeItems: { label: string; value: ViewMode }[] = [
  { label: 'Diff', value: 'diff' },
  { label: 'Inline', value: 'inline' },
];

export function ViewModeSelector({
  viewMode,
  onViewModeChange,
}: Readonly<ViewModeSelectorProps>) {
  return (
    <PMSegmentGroup.Root
      size="sm"
      value={viewMode}
      onValueChange={(e) => onViewModeChange(e.value as ViewMode)}
    >
      <PMSegmentGroup.Indicator bg="background.tertiary" />
      {viewModeItems.map((item) => (
        <PMSegmentGroup.Item
          key={item.value}
          value={item.value}
          _checked={{ color: 'text.primary' }}
        >
          <PMSegmentGroup.ItemText>{item.label}</PMSegmentGroup.ItemText>
          <PMSegmentGroup.ItemHiddenInput />
        </PMSegmentGroup.Item>
      ))}
    </PMSegmentGroup.Root>
  );
}
