import { Checkbox as ChakraCheckbox } from '@chakra-ui/react';
import type { CheckedChangeDetails } from '@zag-js/checkbox';
import * as React from 'react';

export interface PMCheckboxProps
  extends Omit<ChakraCheckbox.RootProps, 'children'> {
  /** Texte/contenu du label (au lieu d'utiliser le children du Root) */
  children?: React.ReactNode;
  icon?: React.ReactNode;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  controlProps?: ChakraCheckbox.ControlProps;
  labelProps?: ChakraCheckbox.LabelProps;
  rootRef?: React.RefObject<HTMLLabelElement | null>;
}
export type PMCheckboxCheckedChangeDetails = CheckedChangeDetails;

export const PMCheckbox = React.forwardRef<HTMLInputElement, PMCheckboxProps>(
  function Checkbox(props, ref) {
    const {
      icon,
      children,
      inputProps,
      rootRef,
      controlProps,
      labelProps,
      ...rest
    } = props;

    return (
      <ChakraCheckbox.Root ref={rootRef} {...rest}>
        <ChakraCheckbox.HiddenInput ref={ref} {...inputProps} />
        <ChakraCheckbox.Control {...controlProps}>
          {icon ?? <ChakraCheckbox.Indicator />}
        </ChakraCheckbox.Control>
        {children != null && (
          <ChakraCheckbox.Label {...labelProps}>
            {children}
          </ChakraCheckbox.Label>
        )}
      </ChakraCheckbox.Root>
    );
  },
);
