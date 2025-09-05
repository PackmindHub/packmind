import {
  ClipboardRoot,
  ClipboardTrigger,
  ClipboardIndicator,
  ClipboardRootProps,
  ClipboardTriggerProps,
  ClipboardIndicatorProps,
} from '@chakra-ui/react';
import { ReactNode } from 'react';

export interface PMCopiableRootProps extends ClipboardRootProps {
  value: string;
  children: ReactNode;
}

export interface PMCopiableTriggerProps extends ClipboardTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export interface PMCopiableIndicatorProps extends ClipboardIndicatorProps {
  children?: ReactNode;
}

export const PMCopiable = {
  Root: ({ children, value, ...props }: PMCopiableRootProps) => {
    return (
      <ClipboardRoot value={value} {...props}>
        {children}
      </ClipboardRoot>
    );
  },

  Trigger: ({ children, ...props }: PMCopiableTriggerProps) => {
    return <ClipboardTrigger {...props}>{children}</ClipboardTrigger>;
  },

  Indicator: ({ children, ...props }: PMCopiableIndicatorProps) => {
    return <ClipboardIndicator {...props}>{children}</ClipboardIndicator>;
  },
};
