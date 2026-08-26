import { PMButton, PMHStack, PMText } from '@packmind/ui';

/**
 * What is picked, and what can be done with it.
 *
 * Sticky at the top of the list rather than at the bottom of the pane: a
 * selection is made by running down a list, so the row that was just ticked is
 * near the pointer and the action has to be too. Pinned because a package with
 * four groups out-scrolls the viewport, and a bar left at the top of the
 * document would be off screen exactly when it is needed.
 *
 * It counts rather than naming: at three components the names no longer fit on
 * the line, and the list behind the bar is already showing which ones they are.
 *
 * Shared by the two lists that can pick components, with only the wording of
 * the action between them: from a package the components are moved out of it,
 * and from the space inventory the ones in no package are added to one. Two
 * copies of this bar would have grown two ideas of what a selection looks like.
 */
export function ContextSelectionBar({
  count,
  actionLabel,
  onAct,
  onClear,
}: Readonly<{
  count: number;
  /** Names the destination side of the gesture, which differs by list. */
  actionLabel: string;
  onAct: () => void;
  onClear: () => void;
}>) {
  return (
    <PMHStack
      position="sticky"
      top={0}
      zIndex={1}
      gap={3}
      align="center"
      justify="space-between"
      paddingX={3}
      paddingY={2}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      bg="background.secondary"
    >
      <PMText fontSize="sm" fontWeight="medium">
        {count} selected
      </PMText>
      <PMHStack gap={2}>
        <PMButton variant="secondary" size="xs" onClick={onAct}>
          {actionLabel}
        </PMButton>
        <PMButton variant="tertiary" size="xs" onClick={onClear}>
          Clear
        </PMButton>
      </PMHStack>
    </PMHStack>
  );
}
