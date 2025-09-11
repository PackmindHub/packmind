import { Checkbox as ChakraCheckbox } from '@chakra-ui/react';
import * as React from 'react';

export interface PMCheckboxProps extends ChakraCheckbox.RootProps {
  icon?: React.ReactNode;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  controlProps?: ChakraCheckbox.ControlProps;
  rootRef?: React.RefObject<HTMLLabelElement | null>;
}

export const PMCheckbox = React.forwardRef<HTMLInputElement, PMCheckboxProps>(
  function Checkbox(props, ref) {
    const { icon, children, inputProps, rootRef, controlProps, ...rest } =
      props;
    return (
      <ChakraCheckbox.Root ref={rootRef} {...rest}>
        <ChakraCheckbox.HiddenInput ref={ref} {...inputProps} />
        <ChakraCheckbox.Control {...controlProps}>
          {icon || <ChakraCheckbox.Indicator />}
        </ChakraCheckbox.Control>
        {children != null && (
          <ChakraCheckbox.Label>{children}</ChakraCheckbox.Label>
        )}
      </ChakraCheckbox.Root>
    );
  },
);
