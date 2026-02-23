import { PMHStack, PMIconButton, PMText, PMTooltip } from '@packmind/ui';
import { LuChevronUp, LuChevronDown, LuLocate } from 'react-icons/lu';

interface DiffNavigatorProps {
  currentIndex: number;
  totalChanges: number;
  hasScroll: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onScrollToCurrent: () => void;
}

export function DiffNavigator({
  currentIndex,
  totalChanges,
  hasScroll,
  onNext,
  onPrevious,
  onScrollToCurrent,
}: DiffNavigatorProps) {
  if (totalChanges === 0 || !hasScroll) {
    return null;
  }

  return (
    <PMHStack
      gap={0}
      align="center"
      backgroundColor="background.primary"
      borderRadius="md"
    >
      <PMTooltip label="Previous change">
        <PMIconButton
          aria-label="Previous change"
          size="xs"
          onClick={onPrevious}
          disabled={currentIndex === 0}
        >
          <LuChevronUp />
        </PMIconButton>
      </PMTooltip>
      <PMText fontSize="sm">
        {currentIndex + 1} / {totalChanges}
      </PMText>
      <PMTooltip label="Next change">
        <PMIconButton
          aria-label="Next change"
          size="xs"
          onClick={onNext}
          disabled={currentIndex === totalChanges - 1}
        >
          <LuChevronDown />
        </PMIconButton>
      </PMTooltip>
      <PMTooltip label="Scroll to change">
        <PMIconButton
          aria-label="Scroll to current change"
          size="xs"
          onClick={onScrollToCurrent}
        >
          <LuLocate />
        </PMIconButton>
      </PMTooltip>
    </PMHStack>
  );
}
