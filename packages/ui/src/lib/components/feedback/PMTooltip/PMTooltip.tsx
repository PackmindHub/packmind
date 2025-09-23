import React from 'react';
import { Tooltip } from '@chakra-ui/react';

export interface PMTooltipProps {
  /** The trigger element */
  children: React.ReactNode;
  /** Content to show in the tooltip */
  label: React.ReactNode;
  /** Where to position the tooltip relative to the trigger */
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-start'
    | 'top-end'
    | 'bottom-start'
    | 'bottom-end'
    | 'left-start'
    | 'left-end'
    | 'right-start'
    | 'right-end';
  /** Whether the tooltip is disabled */
  disabled?: boolean;
  /** Delay before showing tooltip (in ms) */
  openDelay?: number;
  /** Delay before hiding tooltip (in ms) */
  closeDelay?: number;
  /** Whether to show an arrow pointing to the trigger */
  showArrow?: boolean;
}

export const PMTooltip: React.FC<PMTooltipProps> = ({
  children,
  label,
  placement = 'top',
  disabled = false,
  openDelay = 500,
  closeDelay = 0,
  showArrow = true,
}) => {
  if (disabled || !label) {
    return children as React.ReactElement;
  }

  return (
    <Tooltip.Root
      openDelay={openDelay}
      closeDelay={closeDelay}
      positioning={{
        placement,
        offset: { mainAxis: 8 },
      }}
    >
      {/* @ts-expect-error https://github.com/chakra-ui/chakra-ui/issues/8619 */}
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content>
          {showArrow && (
            <Tooltip.Arrow>
              <Tooltip.ArrowTip />
            </Tooltip.Arrow>
          )}
          {label}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
};
