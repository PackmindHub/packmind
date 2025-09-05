import {
  VStack as ChakraVStack,
  StackProps as ChakraVStackProps,
} from '@chakra-ui/react';

export type PMVStackProps = ChakraVStackProps;

export const PMVStack = (props: PMVStackProps) => {
  return <ChakraVStack {...props} />;
};
