import { PMSegmentGroup } from '@packmind/ui';
import { ViewMode } from '../../hooks/useCommandReviewState';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const viewModeItems = [
  { label: 'Focused', value: 'focused' },
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
      <PMSegmentGroup.Indicator />
      <PMSegmentGroup.Items items={viewModeItems} />
    </PMSegmentGroup.Root>
  );
}
