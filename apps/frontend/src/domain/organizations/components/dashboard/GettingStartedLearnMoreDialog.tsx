import {
  PMButton,
  PMButtonVariants,
  PMCloseButton,
  PMDialog,
  PMHeading,
  PMPortal,
} from '@packmind/ui';
import { ReactNode } from 'react';

export type GettingStartedLearnMoreDialogProps = {
  title?: string;
  body: ReactNode;
  buttonLabel?: string | ReactNode;
  buttonSize?: 'xs' | 'sm' | 'md' | 'lg';
  buttonVariant?: PMButtonVariants;
  buttonMarginTop?: string | number;
};

export const GettingStartedLearnMoreDialog: React.FC<
  GettingStartedLearnMoreDialogProps
> = ({
  title,
  body,
  buttonLabel = 'Learn more',
  buttonSize = 'xs',
  buttonVariant = 'primary',
  buttonMarginTop = 0,
}) => {
  return (
    <PMDialog.Root
      size="lg"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior={'inside'}
    >
      <PMDialog.Trigger asChild>
        <PMButton
          size={buttonSize}
          variant={buttonVariant}
          w={'fit-content'}
          mt={buttonMarginTop}
        >
          {buttonLabel}
        </PMButton>
      </PMDialog.Trigger>
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              {title && (
                <PMDialog.Title asChild>
                  <PMHeading level="h3">{title}</PMHeading>
                </PMDialog.Title>
              )}
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>{body}</PMDialog.Body>
            <PMDialog.Footer>
              <PMDialog.Trigger asChild>
                <PMButton variant="tertiary" size="md">
                  Close
                </PMButton>
              </PMDialog.Trigger>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
};
