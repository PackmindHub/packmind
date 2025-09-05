import React from 'react';
import { Popover, Portal } from '@chakra-ui/react';

export interface IPMPopoverProps {
  /** The trigger element (usually a button) */
  children: React.ReactNode;
  /** Content to show in the popover */
  content: React.ReactNode;
  /** Where to position the popover relative to the trigger */
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'bottom-start'
    | 'bottom-end';
  /** Whether the popover is disabled */
  disabled?: boolean;
  /** Whether to show an arrow pointing to the trigger */
  showArrow?: boolean;
  title?: string;
}

export const PMPopover: React.FC<IPMPopoverProps> = ({
  children,
  content,
  placement = 'bottom',
  disabled = false,
  showArrow = false,
  title,
}) => {
  if (disabled) {
    return children;
  }

  return (
    <Popover.Root
      closeOnInteractOutside={true}
      closeOnEscape={true}
      positioning={{
        placement,
        offset: { mainAxis: 8 },
      }}
    >
      {/* @ts-expect-error https://github.com/radix-ui/primitives/issues/2309#issuecomment-1916541133 */}
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content>
            {showArrow && (
              <Popover.Arrow>
                <Popover.ArrowTip />
              </Popover.Arrow>
            )}
            <Popover.Body>
              <Popover.Title>{title}</Popover.Title>
              {content}
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};
