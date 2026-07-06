import {
  PMBox,
  PMButton,
  PMButtonVariants,
  PMHStack,
  PMHeading,
  PMIcon,
} from '@packmind/ui';
import { ReactNode, useState } from 'react';
import { LuChevronDown, LuChevronRight } from 'react-icons/lu';

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
  const [open, setOpen] = useState(false);

  return (
    <PMBox mt={buttonMarginTop} width="full">
      <PMButton
        size={buttonSize}
        variant={buttonVariant}
        w="fit-content"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <PMHStack gap={1} align="center">
          <PMIcon fontSize="sm">
            {open ? <LuChevronDown /> : <LuChevronRight />}
          </PMIcon>
          {buttonLabel}
        </PMHStack>
      </PMButton>
      {open && (
        <PMBox
          marginTop={3}
          paddingLeft={4}
          borderLeft="1px solid"
          borderColor="border.tertiary"
        >
          {title && (
            <PMHeading level="h3" marginBottom={3}>
              {title}
            </PMHeading>
          )}
          {body}
        </PMBox>
      )}
    </PMBox>
  );
};
