import React from 'react';
import { Tooltip } from '@chakra-ui/react';

export interface PMTooltipProps {
  children: React.ReactNode;
  label: React.ReactNode;
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
  disabled?: boolean;
  openDelay?: number;
  closeDelay?: number;
  showArrow?: boolean;
  zIndex?: number;
}

export const PMTooltip: React.FC<PMTooltipProps> = ({
  children,
  label,
  placement = 'top',
  disabled = false,
  openDelay = 500,
  closeDelay = 0,
  showArrow = true,
  zIndex = 1300,
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
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Positioner zIndex={zIndex}>
        <Tooltip.Content zIndex={zIndex}>
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
