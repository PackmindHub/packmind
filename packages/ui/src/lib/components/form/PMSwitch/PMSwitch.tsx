import {
  Switch as ChakraSwitch,
  type SwitchCheckedChangeDetails,
} from '@chakra-ui/react';
import * as React from 'react';

export interface PMSwitchProps extends Omit<
  ChakraSwitch.RootProps,
  'children'
> {
  children?: React.ReactNode;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  rootRef?: React.RefObject<HTMLLabelElement | null>;
}

export type PMSwitchCheckedChangeDetails = SwitchCheckedChangeDetails;

export const PMSwitch = React.forwardRef<HTMLInputElement, PMSwitchProps>(
  function Switch(props, ref) {
    const { children, inputProps, rootRef, ...rest } = props;

    return (
      <ChakraSwitch.Root ref={rootRef} {...rest}>
        <ChakraSwitch.HiddenInput ref={ref} {...inputProps} />
        <ChakraSwitch.Control>
          <ChakraSwitch.Thumb />
        </ChakraSwitch.Control>
        {children != null && (
          <ChakraSwitch.Label>{children}</ChakraSwitch.Label>
        )}
      </ChakraSwitch.Root>
    );
  },
);
