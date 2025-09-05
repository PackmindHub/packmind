import {
  HStack as ChakraHStack,
  StackProps as ChakraHStackProps,
} from '@chakra-ui/react';

export type PMHStackProps = ChakraHStackProps;

export const PMHStack = (props: PMHStackProps) => {
  return <ChakraHStack {...props} />;
};
