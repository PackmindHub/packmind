import { Box as ChakraBox, BoxProps as ChakraBoxProps } from '@chakra-ui/react';

export type PMBoxProps = ChakraBoxProps;

export const PMBox = (props: PMBoxProps) => {
  return <ChakraBox {...props} />;
};
