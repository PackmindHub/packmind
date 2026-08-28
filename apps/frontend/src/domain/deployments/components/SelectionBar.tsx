import type { ReactNode } from 'react';
import { PMButton, PMHStack, PMIcon, PMText } from '@packmind/ui';

/**
 * One thing the bar can do with what is picked. The label names the destination
 * side of the gesture rather than the verb alone, because two of them sit side
 * by side and "Move" next to "Remove" says nothing about where either goes.
 */
export type SelectionAction = {
  label: string;
  /**
   * The same glyph the gesture wears wherever else it is offered, taken from
   * `COMPONENT_ACTION_ICONS`. Required rather than optional: the bar carries
   * more than one action now, and one bare button beside an iconed one reads as
   * something that failed to render.
   */
  icon: ReactNode;
  onAct: () => void;
};

/**
 * What is picked, and what can be done with it.
 *
 * It sits beside the panes rather than inside the Context surface it was
 * written for: the install list of `PackageDetailPane` picks the same way, and
 * that pane is read by three surfaces, only one of which is Context. A shared
 * bar reaching down into one surface's folder would have made the dependency
 * point the wrong way.
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
 * Shared by the two lists that can pick components, with only their actions
 * between them: read inside a package a selection can leave it, for another
 * package or for none, and read across the space the components in no package
 * can be given one. Two copies of this bar would have grown two ideas of what a
 * selection looks like.
 */
export function SelectionBar({
  count,
  actions,
  onClear,
}: Readonly<{
  count: number;
  /**
   * What can be done with the picked components, in the order it is offered.
   * A list rather than one action because a package's own list has two, and the
   * bar is the only place a bulk one of either can be asked for.
   */
  actions: readonly SelectionAction[];
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
        {actions.map((action) => (
          <PMButton
            key={action.label}
            variant="secondary"
            size="xs"
            onClick={action.onAct}
          >
            <PMIcon fontSize="xs">{action.icon}</PMIcon>
            {action.label}
          </PMButton>
        ))}
        <PMButton variant="tertiary" size="xs" onClick={onClear}>
          Clear
        </PMButton>
      </PMHStack>
    </PMHStack>
  );
}
