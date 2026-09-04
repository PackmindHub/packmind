import { Box as ChakraBox, BoxProps as ChakraBoxProps } from '@chakra-ui/react';
import { forwardRef } from 'react';

export type PMBoxProps = ChakraBoxProps;

/**
 * Forwards its ref, like the form and content primitives beside it. A box is
 * what callers reach for when they need to measure a piece of layout — how tall
 * a description renders, whether something overflows — and that question cannot
 * be asked without a handle on the node.
 */
export const PMBox = forwardRef<HTMLDivElement, PMBoxProps>((props, ref) => {
  return <ChakraBox ref={ref} {...props} />;
});

PMBox.displayName = 'PMBox';
